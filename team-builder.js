/* MFA gate for the existing Supabase admin-portal login. This file is loaded by index.html after app.js. */
(() => {
  if (typeof sb === "undefined" || !sb) return;

  const originalShowApp = showApp;
  let verificationInProgress = false;
  let verifiedUserId = null;

  const style = document.createElement("style");
  style.textContent = `
    #portalMfaGate{position:fixed;z-index:10000;inset:0;display:none;place-items:center;padding:20px;background:rgba(3,12,20,.94);backdrop-filter:blur(10px)}
    #portalMfaGate.open{display:grid}.portal-mfa-card{width:min(100%,430px);padding:28px;border:1px solid rgba(83,216,194,.28);border-radius:18px;background:#102532;color:#e8f0f3;box-shadow:0 24px 70px #0009}
    .portal-mfa-card h2{margin:0 0 8px}.portal-mfa-card p{color:#a7bac3;line-height:1.55}.portal-mfa-card img{display:block;width:210px;height:210px;margin:16px auto;padding:8px;background:#fff;border-radius:10px}
    .portal-mfa-card input{width:100%;height:48px;margin:12px 0 6px;padding:0 14px;border:1px solid #35505b;border-radius:9px;background:#091822;color:#fff;font-size:20px;text-align:center;letter-spacing:.35em}
    .portal-mfa-card button{width:100%;height:44px;margin-top:10px;border:0;border-radius:9px;background:#53d8c2;color:#09212a;font-weight:800;cursor:pointer}.portal-mfa-card button.secondary{border:1px solid #35505b;background:transparent;color:#cfe7eb}
    #portalMfaMessage{min-height:20px;margin-top:10px;color:#b9cbd1;font-size:13px}
  `;
  document.head.appendChild(style);

  const gate = document.createElement("div");
  gate.id = "portalMfaGate";
  gate.innerHTML = `<section class="portal-mfa-card" role="dialog" aria-modal="true" aria-labelledby="portalMfaTitle"><h2 id="portalMfaTitle">Two-factor authentication</h2><div id="portalMfaBody"></div><div id="portalMfaMessage" role="status" aria-live="polite"></div><button id="portalMfaCancel" class="secondary" type="button">Cancel and sign out</button></section>`;
  document.body.appendChild(gate);

  const body = document.getElementById("portalMfaBody");
  const message = document.getElementById("portalMfaMessage");
  const showError = error => { message.textContent = error?.message || "Two-factor verification failed. Please try again."; };

  document.getElementById("portalMfaCancel").addEventListener("click", async () => {
    await sb.auth.signOut();
    verifiedUserId = null;
    gate.classList.remove("open");
    showLogin("Signed out.");
  });

  // app.js calls showApp after password login and during session restoration.
  // Replace that entry point so the admin interface cannot appear before MFA.
  showApp = async function portalShowAppWithMfa() {
    if (verificationInProgress) return;
    verificationInProgress = true;
    gate.classList.add("open");
    message.textContent = "Checking your two-factor security...";
    try {
      const { data: userData, error: userError } = await sb.auth.getUser();
      if (userError) throw userError;
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your sign-in session could not be verified. Please sign in again.");
      if (verifiedUserId === userId) {
        gate.classList.remove("open");
        originalShowApp();
        return;
      }

      const { data: assurance, error: assuranceError } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) throw assuranceError;
      if (assurance.currentLevel === "aal2") {
        verifiedUserId = userId;
        gate.classList.remove("open");
        originalShowApp();
        return;
      }

      const { data: factorData, error: factorError } = await sb.auth.mfa.listFactors();
      if (factorError) throw factorError;
      const verifiedFactor = (factorData.totp || []).find(factor => factor.status === "verified");
      if (verifiedFactor) await promptForCode(verifiedFactor, userId);
      else await enrollAuthenticator(userId, factorData.totp || []);
    } catch (error) {
      body.innerHTML = `<p>We could not verify your login securely. Please try again or sign out.</p>`;
      showError(error);
    } finally {
      verificationInProgress = false;
    }
  };

  async function promptForCode(factor, userId) {
    body.innerHTML = `<p>Enter the 6-digit code from your authenticator app to continue to the admin portal.</p><form id="portalMfaForm"><label for="portalMfaCode">Authenticator code</label><input id="portalMfaCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-label="Six-digit authenticator code"><button type="submit">Verify and continue</button></form>`;
    message.textContent = "";
    document.getElementById("portalMfaCode").focus();
    document.getElementById("portalMfaForm").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      button.disabled = true;
      message.textContent = "Verifying code...";
      try {
        const { data: challenge, error: challengeError } = await sb.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError) throw challengeError;
        const { error: verifyError } = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: document.getElementById("portalMfaCode").value.trim() });
        if (verifyError) throw verifyError;
        verifiedUserId = userId;
        gate.classList.remove("open");
        originalShowApp();
      } catch (error) {
        showError(error);
        document.getElementById("portalMfaCode").select();
        button.disabled = false;
      }
    });
  }

  async function enrollAuthenticator(userId, factors) {
    const pending = factors.find(factor => factor.status === "unverified");
    if (pending) {
      body.innerHTML = `<p>An unfinished authenticator setup exists for this account. For security, remove the unverified TOTP factor in Supabase Authentication → Users, then sign in again to set it up.</p>`;
      message.textContent = "Setup was not completed.";
      return;
    }

    message.textContent = "Setting up your authenticator...";
    const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Admin portal" });
    if (error) throw error;
    const factor = data;
    body.innerHTML = `<p>Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app. Then enter its 6-digit code to enable 2FA.</p><img alt="QR code for the admin portal authenticator" src="${factor.totp.qr_code}"><form id="portalMfaForm"><label for="portalMfaCode">Authenticator code</label><input id="portalMfaCode" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-label="Six-digit authenticator code"><button type="submit">Enable 2FA and continue</button></form>`;
    message.textContent = "";
    document.getElementById("portalMfaCode").focus();
    document.getElementById("portalMfaForm").addEventListener("submit", async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      button.disabled = true;
      message.textContent = "Verifying setup code...";
      try {
        const { data: challenge, error: challengeError } = await sb.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError) throw challengeError;
        const { error: verifyError } = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.id, code: document.getElementById("portalMfaCode").value.trim() });
        if (verifyError) throw verifyError;
        verifiedUserId = userId;
        gate.classList.remove("open");
        originalShowApp();
      } catch (error) {
        showError(error);
        document.getElementById("portalMfaCode").select();
        button.disabled = false;
      }
    });
  }
})();
