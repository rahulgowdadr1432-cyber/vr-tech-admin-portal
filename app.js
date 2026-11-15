/*
 * VR Tech Solutions Admin Portal
 * Browser code uses only the Supabase publishable key. Authorization must be
 * enforced by Supabase RLS and trusted server-side functions, never by this UI.
 */
const SUPABASE_URL = "https://rficwjxubmexlkplmpdv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XJJALDjMrAEUq_Qol9LiCA_UX79aNgj";
let sb = null;
let currentUser = null;
const $ = (id) => document.getElementById(id);
const tableNames = {
  customers: "customers", enquiries: "enquiries", projects: "projects",
  finance: "transactions", staff: "staff", invoices: "invoices"
};
const pageInfo = {
  dashboard: ["Dashboard", "Your business at a glance"],
  customers: ["Customers", "Manage your customer records"],
  enquiries: ["Enquiries", "Track leads and follow-ups"],
  projects: ["Projects", "Monitor project progress"],
  finance: ["Finance", "Track income and business expenses"],
  staff: ["Staff & Salary", "Manage staff records and salary"],
  invoices: ["Invoices", "Track invoices and payments"],
  reports: ["Business Reports", "Review performance and key metrics"],
  sales: ["Sales Reports", "Explore revenue and invoice performance"],
  access: ["Admin & Access", "Review account permissions and security"]
};

function configured() {
  return SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.startsWith("sb_publishable_");
}
function initClient() {
  if (configured() && window.supabase) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
function showLogin(msg = "") {
  $("loginView").classList.remove("hidden");
  $("appView").classList.add("hidden");
  $("resetView").classList.add("hidden");
  if (msg) $("loginMessage").textContent = msg;
}
function showApp() {
  $("loginView").classList.add("hidden");
  $("resetView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  renderPage("dashboard");
}
function money(value) {
  return "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function addNavigation() {
  const nav = $("nav");
  if (!nav) return;
  if (!nav.querySelector('[data-page="sales"]')) nav.insertAdjacentHTML("beforeend", '<button data-page="sales"><span class="nav-icon">↗</span>Sales Reports</button>');
  if (!nav.querySelector('[data-page="access"]')) nav.insertAdjacentHTML("beforeend", '<button data-page="access"><span class="nav-icon">⚿</span>Admin &amp; Access</button>');
}
async function signIn(email, password) {
  if (!sb) { $("loginMessage").textContent = "Supabase could not initialize. Check the Supabase library and app.js configuration."; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { $("loginMessage").textContent = error.message; return; }
  // The account's permissions come from Supabase RLS, not this client-side interface.
  showApp();
}
async function signOut() {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  showLogin("You have signed out.");
}
async function forgotPassword() {
  const email = $("email").value.trim();
  if (!email) { $("loginMessage").textContent = "Enter your admin email first."; return; }
  if (!sb) { $("loginMessage").textContent = "Supabase is not initialized."; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: "https://admin.vrtechsolutions24.in" });
  $("loginMessage").textContent = error ? error.message : "Password reset email sent. Please check your inbox.";
}
function stat(label, value, hint = "") {
  return `<div class="stat"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="hint">${escapeHtml(hint)}</div></div>`;
}
function dashboardHTML() {
  return `<div class="grid">
    ${stat("Total Customers", "—", "Customer records")}${stat("Open Enquiries", "—", "Needs follow-up")}
    ${stat("Active Projects", "—", "In progress")}${stat("Pending Payments", "—", "To be collected")}
    ${stat("Total Income", "—", "Recorded income")}${stat("Total Expenses", "—", "Recorded expenses")}
    ${stat("Net Profit", "—", "Income less expenses")}${stat("Invoices", "—", "Invoice records")}
  </div><div class="section"><h2>Quick Actions</h2><div class="quick">
    <button data-go="customers"><strong>＋ Add customer</strong><span>Create a customer record</span></button>
    <button data-go="enquiries"><strong>✉ View enquiries</strong><span>Check leads and follow-ups</span></button>
    <button data-go="projects"><strong>▣ Manage projects</strong><span>Update project status</span></button>
    <button data-go="finance"><strong>₹ Add transaction</strong><span>Record income or expense</span></button>
    <button data-go="invoices"><strong>▤ Manage invoices</strong><span>Track paid and due amounts</span></button>
    <button data-go="sales"><strong>↗ View sales reports</strong><span>Review revenue trends</span></button>
  </div></div><div class="section"><h2>Recent business activity</h2><div id="recentActivity" class="empty">Loading latest transactions…</div></div>`;
}
const formFields = {
  customers: [["Customer name", "name"], ["Phone", "phone", "tel"], ["Email", "email", "email"], ["Address", "address"]],
  enquiries: [["Customer name", "customer_name"], ["Phone", "phone", "tel"], ["Email", "email", "email"], ["Service", "service"], ["Details", "details", "textarea"]],
  projects: [["Project name", "project_name"], ["Customer ID (optional)", "customer_id", "number"], ["Price (₹)", "price", "number"], ["Start date", "start_date", "date"], ["Deadline", "deadline", "date"]],
  finance: [["Transaction type", "transaction_type", "select", ["Income", "Expense"]], ["Category", "category"], ["Amount (₹)", "amount", "number"], ["Description", "description"], ["Date", "transaction_date", "date"]],
  staff: [["Staff name", "name"], ["Phone", "phone", "tel"], ["Monthly salary (₹)", "monthly_salary", "number"]],
  invoices: [["Invoice number", "invoice_number"], ["Customer ID (optional)", "customer_id", "number"], ["Total amount (₹)", "total_amount", "number"], ["Paid amount (₹)", "paid_amount", "number"], ["Invoice date", "invoice_date", "date"], ["Due date", "due_date", "date"]]
};
function fieldHTML([label, name, type = "text", options = []]) {
  const safeName = escapeHtml(name);
  let control;
  if (type === "select") control = `<select name="${safeName}" required>${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select>`;
  else if (type === "textarea") control = `<textarea name="${safeName}" rows="3"></textarea>`;
  else control = `<input name="${safeName}" type="${escapeHtml(type)}" ${type === "number" ? 'min="0" step="0.01"' : ""} ${["name", "customer_name", "project_name", "amount"].includes(name) ? "required" : ""}>`;
  return `<div><label>${escapeHtml(label)}</label>${control}</div>`;
}
function salesHTML() {
  return `<div class="section"><h2>Reporting period</h2><div class="formrow"><div><label for="salesFrom">From</label><input id="salesFrom" type="date"></div><div><label for="salesTo">To</label><input id="salesTo" type="date"></div></div><button id="runSalesReport" class="btn" type="button">Apply date range</button><p id="salesMessage" class="message" role="status">Sales are calculated from income transactions in the transactions table.</p></div><div id="salesMetrics" class="grid">${stat("Sales revenue", "—", "Income transactions")}${stat("Expenses", "—", "Recorded expenses")}${stat("Net sales", "—", "Revenue less expenses")}${stat("Invoice balance", "—", "Outstanding amount")}</div><div class="section"><h2>Monthly revenue</h2><div id="salesChart" class="empty">Loading sales data…</div></div><div class="section"><h2>Latest sales transactions</h2><div id="salesTable" class="empty">Loading transactions…</div></div>`;
}
function accessHTML() {
  return `<div class="grid">${stat("Signed-in account", currentUser?.email || "—", "Authenticated session")}${stat("Account role", "Checking…", "Read from protected user_roles table")}${stat("Access protection", "Supabase RLS", "Database policies are authoritative")}${stat("Session", "Active", "Signed-in administrator")}</div><div class="section"><h2>Super admin &amp; access management</h2><p id="roleDetails">Checking role assignment…</p><p>Role labels in this portal are informational only. Supabase Row Level Security must enforce every read and write. User provisioning and super-admin changes should be handled through a trusted, server-side admin workflow; this browser portal never stores service-role credentials or grants privileges.</p><div id="accessStatus" class="notice">For company-wide access, configure a user_roles table keyed to auth.users and restrictive RLS policies before assigning super-admin privileges.</div></div>`;
}
function pageHTML(page) {
  if (page === "dashboard") return dashboardHTML();
  if (page === "sales") return salesHTML();
  if (page === "access") return accessHTML();
  if (page === "reports") return `<div class="grid">${stat("Income", "—", "Recorded income")}${stat("Expenses", "—", "Recorded expenses")}${stat("Net profit", "—", "Income less expenses")}${stat("Outstanding invoices", "—", "Amount due")}</div><div class="section"><h2>Company performance</h2><p>Use Sales Reports to select a date range and review actual income transactions and invoice balances from your connected database.</p><button class="btn" type="button" data-go="sales">Open sales reports</button></div>`;
  const title = pageInfo[page][0];
  const fields = formFields[page] || [];
  return `<div class="section"><h2>Add ${escapeHtml(title.replace(/s$/i, ""))}</h2><form id="recordForm" data-table="${escapeHtml(tableNames[page])}"><div class="formrow">${fields.map(fieldHTML).join("")}</div><button class="btn" type="submit">Save record</button><span id="formMessage" class="message" role="status" aria-live="polite"></span></form></div><div class="section"><h2>${escapeHtml(title)} list</h2><div class="tablewrap" id="tableData"><div class="empty">Loading records…</div></div></div>`;
}
async function renderPage(page) {
  if (!pageInfo[page]) page = "dashboard";
  document.querySelectorAll("#nav button").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $("pageTitle").textContent = pageInfo[page][0];
  $("pageSubtitle").textContent = pageInfo[page][1];
  $("pageContent").innerHTML = pageHTML(page);
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => renderPage(button.dataset.go)));
  const form = $("recordForm");
  if (form) form.addEventListener("submit", (event) => saveRecord(event, page));
  if (page === "dashboard") await loadDashboard();
  else if (page === "sales") {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    $("salesFrom").value = dateInput(first);
    $("salesTo").value = dateInput(today);
    $("runSalesReport").addEventListener("click", loadSalesReport);
    await loadSalesReport();
  } else if (page === "access") await loadRoleInfo();
  else if (tableNames[page]) await loadRecords(page);
}
function dateInput(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
async function loadRecords(page) {
  const holder = $("tableData");
  if (!holder) return;
  if (!sb) { holder.innerHTML = '<div class="empty">Supabase is not initialized. Check the application configuration.</div>'; return; }
  holder.innerHTML = '<div class="empty">Loading records…</div>';
  try {
    const { data, error } = await sb.from(tableNames[page]).select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    if (!data?.length) { holder.innerHTML = `<div class="empty">No ${escapeHtml(page)} found yet.</div>`; return; }
    const preferred = page === "enquiries" ? ["customer_name", "phone", "email", "service", "status", "created_at"] : Object.keys(data[0]);
    const keys = preferred.filter((key) => Object.hasOwn(data[0], key)).slice(0, 8);
    holder.innerHTML = `<table><thead><tr>${keys.map((key) => `<th>${escapeHtml(key.replaceAll("_", " "))}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(key === "created_at" && row[key] ? new Date(row[key]).toLocaleString("en-IN") : row[key] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  } catch (error) {
    console.error("Admin Portal database error:", error);
    holder.innerHTML = `<div class="empty"><strong>Could not load ${escapeHtml(page)}.</strong><p>${escapeHtml(error.message || "Please check table access and RLS policies.")}</p></div>`;
  }
}
async function saveRecord(event, page) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = $("formMessage");
  if (!sb) { message.textContent = "Supabase client is not initialized."; return; }
  const record = Object.fromEntries(new FormData(form).entries());
  Object.keys(record).forEach((key) => { if (record[key] === "") delete record[key]; });
  if (record.customer_id) record.customer_id = Number(record.customer_id);
  ["price", "amount", "monthly_salary", "total_amount", "paid_amount"].forEach((key) => { if (record[key] !== undefined) record[key] = Number(record[key]); });
  if (page === "enquiries" && !record.status) record.status = "New";
  if (page === "projects" && !record.status) record.status = "New";
  if (page === "staff") record.active = true;
  const { error } = await sb.from(tableNames[page]).insert(record);
  if (error) { message.textContent = `Save failed: ${error.message}`; return; }
  message.textContent = "Saved successfully.";
  form.reset();
  await loadRecords(page);
}
async function loadDashboard() {
  if (!sb) return;
  const holder = $("recentActivity");
  const counts = { customers: "customers", enquiries: "enquiries", projects: "projects", invoices: "invoices" };
  const values = {};
  await Promise.all(Object.entries(counts).map(async ([key, table]) => {
    const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
    values[key] = error ? "—" : count;
  }));
  const [txResult, invoiceResult, recentResult] = await Promise.all([
    sb.from("transactions").select("transaction_type,amount,transaction_date,description,created_at").limit(500),
    sb.from("invoices").select("total_amount,paid_amount"),
    sb.from("transactions").select("transaction_type,amount,transaction_date,description,created_at").order("created_at", { ascending: false }).limit(6)
  ]);
  let income = 0, expenses = 0;
  if (!txResult.error) (txResult.data || []).forEach((row) => { if (String(row.transaction_type).toLowerCase() === "income") income += Number(row.amount || 0); else if (String(row.transaction_type).toLowerCase() === "expense") expenses += Number(row.amount || 0); });
  let due = 0;
  if (!invoiceResult.error) (invoiceResult.data || []).forEach((row) => { due += Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)); });
  const cells = document.querySelectorAll("#pageContent .stat .value");
  const metrics = [values.customers, values.enquiries, values.projects, invoiceResult.error ? "—" : money(due), txResult.error ? "—" : money(income), txResult.error ? "—" : money(expenses), txResult.error ? "—" : money(income - expenses), values.invoices];
  cells.forEach((cell, index) => { cell.textContent = metrics[index] ?? "—"; });
  if (holder) {
    if (recentResult.error) holder.textContent = "Recent transactions are unavailable. Check your transactions table and RLS policies.";
    else if (!recentResult.data?.length) holder.textContent = "No recent transactions to show.";
    else holder.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Type</th><th>Description</th><th>Date</th><th>Amount</th></tr></thead><tbody>${recentResult.data.map((row) => `<tr><td>${escapeHtml(row.transaction_type || "—")}</td><td>${escapeHtml(row.description || "—")}</td><td>${escapeHtml(row.transaction_date || row.created_at || "—")}</td><td>${money(row.amount)}</td></tr>`).join("")}</tbody></table></div>`;
  }
}
async function loadSalesReport() {
  const message = $("salesMessage");
  if (!sb) { message.textContent = "Supabase is not initialized."; return; }
  const from = $("salesFrom").value;
  const to = $("salesTo").value;
  if (from && to && from > to) { message.textContent = "Choose a start date before the end date."; return; }
  message.textContent = "Loading sales data…";
  const holder = $("salesTable");
  holder.innerHTML = '<div class="empty">Loading…</div>';
  const [txResult, invoiceResult] = await Promise.all([
    sb.from("transactions").select("transaction_type,amount,transaction_date,description,created_at").limit(2000),
    sb.from("invoices").select("total_amount,paid_amount,invoice_date,due_date,created_at").limit(2000)
  ]);
  if (txResult.error) { message.textContent = `Could not load sales: ${txResult.error.message}`; holder.textContent = "Check transaction table access and Supabase RLS policies."; return; }
  const inRange = (row, dateKey) => {
    const date = String(row[dateKey] || row.created_at || "").slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  };
  const transactions = (txResult.data || []).filter((row) => inRange(row, "transaction_date"));
  const incomeRows = transactions.filter((row) => String(row.transaction_type).toLowerCase() === "income");
  const expenseRows = transactions.filter((row) => String(row.transaction_type).toLowerCase() === "expense");
  const revenue = incomeRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const expenses = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const invoiceRows = (invoiceResult.data || []).filter((row) => inRange(row, "invoice_date"));
  const balance = invoiceRows.reduce((sum, row) => sum + Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)), 0);
  const metrics = document.querySelectorAll("#salesMetrics .stat .value");
  [money(revenue), money(expenses), money(revenue - expenses), invoiceResult.error ? "—" : money(balance)].forEach((value, index) => { if (metrics[index]) metrics[index].textContent = value; });
  renderMonthlyChart(incomeRows);
  const sales = incomeRows.sort((a, b) => String(b.transaction_date || b.created_at || "").localeCompare(String(a.transaction_date || a.created_at || ""))).slice(0, 30);
  holder.innerHTML = sales.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead><tbody>${sales.map((row) => `<tr><td>${escapeHtml(row.transaction_date || row.created_at || "—")}</td><td>${escapeHtml(row.description || "Income transaction")}</td><td>${money(row.amount)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No income transactions in this date range.</div>';
  message.textContent = `${incomeRows.length} income transactions · ${expenseRows.length} expense transactions${invoiceResult.error ? " · Invoice totals unavailable" : ""}.`;
}
function renderMonthlyChart(rows) {
  const holder = $("salesChart");
  const monthly = new Map();
  rows.forEach((row) => {
    const date = String(row.transaction_date || row.created_at || "");
    if (date.length < 7) return;
    const key = date.slice(0, 7);
    monthly.set(key, (monthly.get(key) || 0) + Number(row.amount || 0));
  });
  const data = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  if (!data.length) { holder.innerHTML = '<div class="empty">No dated income transactions available to chart.</div>'; return; }
  const max = Math.max(...data.map(([, value]) => value), 1);
  holder.innerHTML = `<div style="display:grid;grid-template-columns:repeat(${data.length},minmax(38px,1fr));align-items:end;gap:12px;min-height:180px;padding:12px 4px 0">${data.map(([month, value]) => `<div style="display:flex;height:165px;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px"><span style="color:#758196;font-size:10px">${money(value)}</span><div title="${escapeHtml(month)}: ${money(value)}" style="width:min(38px,75%);height:${Math.max(4, value / max * 112)}px;border-radius:6px 6px 2px 2px;background:linear-gradient(180deg,#8178ea,#5145cd)"></div><span style="color:#758196;font-size:10px">${escapeHtml(month)}</span></div>`).join("")}</div>`;
}
async function loadRoleInfo() {
  if (!currentUser || !sb) return;
  const accountCell = document.querySelector("#pageContent .stat .value");
  if (accountCell) accountCell.textContent = currentUser.email || "Authenticated";
  const details = $("roleDetails");
  try {
    // This read is intentionally non-authoritative; protect user_roles with RLS.
    const { data, error } = await sb.from("user_roles").select("role").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    const role = String(data?.role || "standard admin");
    const roleCell = document.querySelectorAll("#pageContent .stat .value")[1];
    if (roleCell) roleCell.textContent = role;
    details.textContent = data ? `The protected user_roles record reports the role “${role}”. Database RLS remains the source of truth for permissions.` : "No user_roles record was returned for this account. No super-admin access is implied.";
    if (data && role.toLowerCase() === "super_admin") $("accessStatus").textContent = "A super_admin role is recorded for this account. Ensure policies restrict this role to explicitly approved operations and audit privileged actions.";
  } catch (error) {
    const roleCell = document.querySelectorAll("#pageContent .stat .value")[1];
    if (roleCell) roleCell.textContent = "Not configured";
    details.textContent = "Role lookup is unavailable. Configure a protected user_roles table and RLS policy before relying on role-based access.";
    $("accessStatus").textContent = `Role table could not be read (${error.message}). The portal will not assume super-admin privileges.`;
  }
}
function bindEvents() {
  $("loginForm").addEventListener("submit", (event) => { event.preventDefault(); signIn($("email").value.trim(), $("password").value); });
  $("forgotBtn").addEventListener("click", forgotPassword);
  $("logoutBtn").addEventListener("click", signOut);
  $("refreshBtn").addEventListener("click", () => renderPage(document.querySelector("#nav button.active")?.dataset.page || "dashboard"));
  $("nav").addEventListener("click", (event) => { const button = event.target.closest("button[data-page]"); if (button) renderPage(button.dataset.page); });
  $("resetForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("newPassword").value;
    if (password !== $("confirmPassword").value) { $("resetMessage").textContent = "Passwords do not match."; return; }
    const { error } = await sb.auth.updateUser({ password });
    $("resetMessage").textContent = error ? error.message : "Password updated successfully.";
    if (!error) setTimeout(showApp, 900);
  });
  $("backToLoginBtn")?.addEventListener("click", () => { history.replaceState({}, document.title, location.pathname); showLogin(); });
  document.querySelector(".search input")?.addEventListener("input", (event) => {
    const term = event.target.value.trim().toLowerCase();
    document.querySelectorAll("#pageContent tbody tr").forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(term); });
  });
}

initClient();
addNavigation();
bindEvents();
if (!sb) {
  showLogin("Supabase could not initialize. Check the Supabase library and configuration.");
} else {
  if (location.hash.includes("type=recovery")) {
    $("loginView").classList.add("hidden");
    $("resetView").classList.remove("hidden");
  }
  sb.auth.getSession().then(({ data, error }) => {
    if (error) { showLogin(`Could not check login session: ${error.message}`); return; }
    currentUser = data.session?.user || null;
    if (currentUser) showApp(); else if (!location.hash.includes("type=recovery")) showLogin();
  }).catch((error) => showLogin(`Session error: ${error.message}`));
  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) currentUser = session.user;
    if (event === "SIGNED_IN" && session) setTimeout(showApp, 0);
    else if (event === "SIGNED_OUT") { currentUser = null; showLogin(); }
    else if (event === "PASSWORD_RECOVERY") { $("loginView").classList.add("hidden"); $("resetView").classList.remove("hidden"); }
  });
}
