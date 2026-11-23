/* Supabase TOTP 2FA gate for the VR Tech Solutions admin portal. */
(() => {
  const waitForSupabase = setInterval(() => {
    if (!window.supabase || typeof sb === "undefined") return;
    clearInterval(waitForSupabase);
    initMfaGate();
  }, 50);

  function injectStyles() {
    if (document.getElementById("mfaStyles")) return;
    const style = document.createElement("style");
    style.id = "mfaStyles";
    style.textContent = `#mfaGate{position:fixed;z-index:9999;inset:0;display:none;place-items:center;padding:20px;background:rgba(3,12,20,.92);backdrop-filter:blur(10px)}#mfaGate.open{display:grid}.mfa-card{width:min(100%,430px);padding:28px;border:1px solid rgba(83,216,194,.25);border-radius:18px;background:#102532;color:#e8f0f3;box-shadow:0 24px 70px #0009}.mfa-card h2{margin:0 0 8px}.mfa-card p{color:#91a7b3;line-height:1.5}.mfa-card img{display:block;width:210px;height:210px;margin:16px auto;background:white;border-radius:10px}.mfa-card input{width:100%;height:48px;margin:12px 0 6px;padding:0 14px;border:1px solid #35505b;border-radius:9px;background:#091822;color:white;font-size:20px;text-align:center;letter-spacing:.35em}.mfa-card button{width:100%;height:44px;margin-top:10px;border:0;border-radius:9px;background:#53d8c2;color:#09212a;font-weight:800;cursor:pointer}.mfa-card .mfa-link{border:1px solid #35505b;background:transparent;color:#cfe7eb}.mfa-message{min-height:20px;color:#a8bfca;font-size:13px}`;
    document.head.appendChild(style);
  }

  async function initMfaGate() {
    injectStyles();
    const gate = document.createElement("div");
    gate.id = "mfaGate";
    gate.innerHTML = `<div class="mfa-card" role="dialog" aria-modal="true" aria-labelledby="mfaTitle"><h2 id="mfaTitle">Two-factor verification</h2><div id="mfaBody"></div><div id="mfaMessage" class="mfa-message" role="status"></div><button id="mfaCancel" class="mfa-link" type="button">Cancel and sign out</button></div>`;
    document.body.appendChild(gate);
    document.getElementById("mfaCancel").onclick = async () => { await sb.auth.signOut(); gate.classList.remove("open"); showLogin("Signed out."); };

    if (typeof showApp === "function") {
      const originalShowApp = showApp;
      window.showApp = gateShowApp;
    }

    async function gateShowApp() {
      await requireMfa(gate);
    }

    async function requireMfa(gate) {
      try {
        const { data: level, error: levelError } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
        if (levelError) throw levelError;
        if (level.currentLevel === "aal2") {
          gate.classList.remove("open");
          if (typeof showApp === "function") originalShowApp();
          return;
        }

        const { data: factorsData, error: factorsError } = await sb.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const factors = (factorsData?.totp || []).filter(f => f.status === "verified");

        if (factors.length) await challengeExisting(gate, factors[0]);
        else await enrollTotp(gate);
      } catch (error) {
        gate.classList.add("open");
        document.getElementById("mfaBody").innerHTML = `<p>Unable to start two-factor authentication.</p>`;
        document.getElementById("mfaMessage").textContent = error.message;
      }
    }

    async function challengeExisting(gate, factor) {
      gate.classList.add("open");
      document.getElementById("mfaBody").innerHTML = `<p>Enter the 6-digit code from your authenticator app.</p><form id="mfaVerifyForm"><input id="mfaCode" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-label="Six-digit authentication code"><button type="submit">Verify and continue</button></form>`;
      document.getElementById("mfaVerifyForm").onsubmit = async event => {
        event.preventDefault();
        const code = document.getElementById("mfaCode").value.trim();
        const message = document.getElementById("mfaMessage");
        message.textContent = "Verifying...";
        const challenge = await sb.auth.mfa.challenge({ factorId: factor.id });
        if (challenge.error) { message.textContent = challenge.error.message; return; }
        const verified = await sb.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code });
        if (verified.error) { message.textContent = verified.error.message; return; }
        gate.classList.remove("open");
        originalShowApp();
      };
    }

    async function enrollTotp(gate) {
      gate.classList.add("open");
      const message = document.getElementById("mfaMessage");
      message.textContent = "Preparing authenticator setup...";
      const enrolled = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Admin portal" });
      if (enrolled.error) { message.textContent = enrolled.error.message; return; }
      const factor = enrolled.data;
      document.getElementById("mfaBody").innerHTML = `<p>Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app.</p><img alt="Authenticator QR code" src="${factor.totp.qr_code}"><form id="mfaVerifyForm"><input id="mfaCode" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-label="Six-digit authentication code"><button type="submit">Enable 2FA</button></form>`;
      document.getElementById("mfaVerifyForm").onsubmit = async event => {
        event.preventEvent();
      };
    }
  }
})();
