/*
 * VR Tech Solutions enterprise admin portal.
 * This browser client uses only the Supabase publishable key. Supabase RLS and
 * trusted server-side workflows must enforce authorization and privileged actions.
 */
const SUPABASE_URL = "https://rficwjxubmexlkplmpdv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XJJALDjMrAEUq_Qol9LiCA_UX79aNgj";
let sb = null;
let currentUser = null;
let currentRole = "staff";
const $ = (id) => document.getElementById(id);
const tableNames = {
  customers: "customers", enquiries: "enquiries", projects: "projects",
  finance: "transactions", staff: "staff", invoices: "invoices",
  approvals: "approval_requests", audit: "audit_logs"
};
const pageInfo = {
  dashboard: ["Executive Dashboard", "Company performance and operational health"],
  crm: ["CRM Overview", "Customer relationships, leads, and conversion funnel"],
  customers: ["Customers", "Manage customer records and account details"],
  enquiries: ["Enquiries", "Track leads and follow-ups"],
  projects: ["Projects", "Manage projects and delivery"],
  pipeline: ["Project Pipeline", "Track work across delivery stages"],
  finance: ["Finance", "Track income and business expenses"],
  staff: ["Employee Management", "Manage employee records and team information"],
  invoices: ["Invoices", "Track invoices and payments"],
  reports: ["Business Reports", "Review performance and key metrics"],
  sales: ["Sales Reports", "Explore revenue and invoice performance"],
  approvals: ["Approval Workflow", "Review and track company requests"],
  audit: ["Audit Logs", "Review security and administrative events"],
  access: ["Roles & Access", "Review account permissions and security"]
};
const rolePageAccess = {
  super_admin: Object.keys(pageInfo),
  admin: Object.keys(pageInfo).filter((page) => page !== "access"),
  manager: ["dashboard", "crm", "customers", "enquiries", "projects", "pipeline", "staff", "reports", "sales", "approvals"],
  finance: ["dashboard", "finance", "invoices", "reports", "sales", "approvals"],
  staff: ["dashboard", "crm", "customers", "enquiries", "projects", "pipeline", "reports", "sales"]
};

function configured() {
  return SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.startsWith("sb_publishable_");
}
function initClient() {
  if (configured() && window.supabase) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
function installEnterpriseTheme() {
  const style = document.createElement("style");
  style.textContent = `
    #appView{--ink:#e7eaf3;--muted:#929bb0;--line:#293248;--surface:#151c2b;--canvas:#0c1220;--brand:#8b83ff;--brand-dark:#756bf0;--brand-soft:#252443;--green:#57cba0;--green-soft:#14352f;color:var(--ink);background:var(--canvas)}
    #appView .sidebar,#appView .topbar{background:#111827;border-color:var(--line)}#appView .logo h2,#appView .page-heading h1,#appView .section h2,#appView .stat .value{color:#eef0f7}
    #appView .logo small,#appView .nav-label{color:#78849a}#appView #nav button{color:#aab3c5}#appView #nav button:hover{background:#1b2435;color:#fff}#appView #nav button.active{background:#29264f;color:#b9b3ff}
    #appView .content{color:var(--ink)}#appView .page-heading p,#appView .section p,#appView .stat .label,#appView .stat .hint{color:var(--muted)}#appView .stat,#appView .section{background:#151c2b;border-color:var(--line);box-shadow:0 10px 24px #02061730}
    #appView .quick button,#appView .logout,#appView .icon-button{background:#182132;border-color:#303a50;color:#dce1ed}#appView .quick button:hover{background:#202a3f;border-color:#6861bf}#appView .quick button span{color:#9ba5ba}
    #appView .search input,#appView .formrow input,#appView .formrow select,#appView .formrow textarea{background:#101827;border-color:#303a50;color:#e7eaf3}#appView .formrow label{color:#b4bdce}
    #appView th{background:#192233;color:#aab3c5}#appView td{color:#d9deea;border-color:#283247}#appView tbody tr:hover{background:#1b2638}#appView .empty{color:#a1abc0}
    #appView .sidebar-bottom{background:#191d35;border-color:#343452}#appView .sidebar-bottom strong{color:#eef0f7}#appView .welcome-tag{background:#14352f;border-color:#255947;color:#72d6ae}
    #appView .pill{background:#14352f;color:#72d6ae}#appView .notice{background:#332b19;border-color:#5a4822;color:#e8c77d}
    #appView .btn{background:#655bd5;color:#fff}#appView .btn:hover{background:#766be8}
    .board{display:grid;grid-template-columns:repeat(4,minmax(210px,1fr));gap:13px;overflow-x:auto}.board-column{min-height:180px;padding:12px;border:1px solid var(--line);border-radius:10px;background:#111827}.board-column h3{margin:0 0 12px;color:#cbd2e0;font-size:12px}.board-count{float:right;color:#9da7bb}.board-card{margin:8px 0;padding:12px;border:1px solid #303a50;border-radius:8px;background:#1a2333}.board-card strong{display:block;color:#e7eaf3;font-size:12px}.board-card small{display:block;margin-top:7px;color:#98a3b8;font-size:10px}.mini-chart{width:100%;height:auto;min-height:190px}.activity-item{display:flex;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid var(--line);color:#cbd2e0;font-size:11px}.activity-item small{color:#8f9ab0}.role-badge{display:inline-block;padding:4px 8px;border-radius:20px;background:#29264f;color:#bdb7ff;font-size:10px;font-weight:700}
    @media(max-width:900px){.board{grid-template-columns:repeat(4,minmax(200px,1fr))}}`;
  document.head.appendChild(style);
}
function showLogin(msg = "") {
  $("loginView").classList.remove("hidden"); $("appView").classList.add("hidden"); $("resetView").classList.add("hidden");
  if (msg) $("loginMessage").textContent = msg;
}
function showApp() {
  $("loginView").classList.add("hidden"); $("resetView").classList.add("hidden"); $("appView").classList.remove("hidden");
  renderPage("dashboard");
}
function money(value) { return "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function addNavigation() {
  const nav = $("nav");
  if (!nav) return;
  const pages = [
    ["crm", "◎", "CRM Overview"], ["pipeline", "▤", "Project Pipeline"], ["approvals", "✓", "Approvals"],
    ["audit", "≡", "Audit Logs"], ["access", "⚿", "Roles & Access"]
  ];
  pages.forEach(([page, icon, label]) => {
    if (!nav.querySelector(`[data-page="${page}"]`)) nav.insertAdjacentHTML("beforeend", `<button data-page="${page}"><span class="nav-icon">${icon}</span>${label}</button>`);
  });
  if (!nav.querySelector('[data-page="sales"]')) nav.insertAdjacentHTML("beforeend", '<button data-page="sales"><span class="nav-icon">↗</span>Sales Reports</button>');
  if (!nav.querySelector('[data-page="staff"]')) nav.insertAdjacentHTML("beforeend", '<button data-page="staff"><span class="nav-icon">♧</span>Employee Management</button>');
}
async function signIn(email, password) {
  if (!sb) { $("loginMessage").textContent = "Supabase could not initialize. Check the Supabase library and app.js configuration."; return; }
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) { $("loginMessage").textContent = error.message; return; }
  showApp();
}
async function signOut() { if (sb) await sb.auth.signOut(); currentUser = null; currentRole = "staff"; showLogin("You have signed out."); }
async function forgotPassword() {
  const email = $("email").value.trim();
  if (!email) { $("loginMessage").textContent = "Enter your admin email first."; return; }
  if (!sb) { $("loginMessage").textContent = "Supabase is not initialized."; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: "https://admin.vrtechsolutions24.in" });
  $("loginMessage").textContent = error ? error.message : "Password reset email sent. Please check your inbox.";
}
function stat(label, value, hint = "") { return `<div class="stat"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="hint">${escapeHtml(hint)}</div></div>`; }
function dashboardHTML() {
  return `<div class="grid">${stat("Total Customers", "—", "CRM accounts")}${stat("Open Enquiries", "—", "Sales opportunities")}${stat("Active Projects", "—", "Delivery pipeline")}${stat("Pending Payments", "—", "Invoice balance")}${stat("Total Income", "—", "Recorded income")}${stat("Total Expenses", "—", "Recorded expenses")}${stat("Net Profit", "—", "Income less expenses")}${stat("Team Members", "—", "Employee records")}</div>
    <div class="section"><h2>Revenue performance · recent months</h2><div id="dashboardChart" class="empty">Loading chart…</div></div>
    <div class="section"><h2>Quick Actions</h2><div class="quick"><button data-go="crm"><strong>◎ Open CRM</strong><span>Review customer and lead funnel</span></button><button data-go="pipeline"><strong>▤ Project pipeline</strong><span>Track delivery stages</span></button><button data-go="approvals"><strong>✓ Approval inbox</strong><span>Review pending requests</span></button><button data-go="staff"><strong>♧ Team directory</strong><span>Manage employee records</span></button><button data-go="sales"><strong>↗ Sales reports</strong><span>Review revenue trends</span></button><button data-go="audit"><strong>≡ Audit activity</strong><span>Review available audit records</span></button></div></div>
    <div class="section"><h2>Recent business activity</h2><div id="recentActivity" class="empty">Loading latest transactions…</div></div>`;
}
const formFields = {
  customers: [["Customer name", "name"], ["Phone", "phone", "tel"], ["Email", "email", "email"], ["Address", "address"]],
  enquiries: [["Customer name", "customer_name"], ["Phone", "phone", "tel"], ["Email", "email", "email"], ["Service", "service"], ["Details", "details", "textarea"]],
  projects: [["Project name", "project_name"], ["Customer ID (optional)", "customer_id", "number"], ["Price (₹)", "price", "number"], ["Start date", "start_date", "date"], ["Deadline", "deadline", "date"]],
  finance: [["Transaction type", "transaction_type", "select", ["Income", "Expense"]], ["Category", "category"], ["Amount (₹)", "amount", "number"], ["Description", "description"], ["Date", "transaction_date", "date"]],
  staff: [["Employee name", "name"], ["Phone", "phone", "tel"], ["Monthly salary (₹)", "monthly_salary", "number"], ["Email", "email", "email"], ["Job title", "job_title"], ["Department", "department"]],
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
function recordPageHTML(page) {
  const title = pageInfo[page][0];
  const fields = formFields[page] || [];
  return `<div class="section"><h2>Add ${escapeHtml(title.replace(/s$/i, ""))}</h2><form id="recordForm"><div class="formrow">${fields.map(fieldHTML).join("")}</div><button class="btn" type="submit">Save record</button> <span id="formMessage" class="message" role="status" aria-live="polite"></span></form></div><div class="section"><h2>${escapeHtml(title)} list</h2><div class="tablewrap" id="tableData"><div class="empty">Loading records…</div></div></div>`;
}
function salesHTML() {
  return `<div class="section"><h2>Reporting period</h2><div class="formrow"><div><label for="salesFrom">From</label><input id="salesFrom" type="date"></div><div><label for="salesTo">To</label><input id="salesTo" type="date"></div></div><button id="runSalesReport" class="btn" type="button">Apply date range</button><p id="salesMessage" class="message" role="status">Sales use income transactions from the transactions table.</p></div><div id="salesMetrics" class="grid">${stat("Sales revenue", "—", "Income transactions")}${stat("Expenses", "—", "Recorded expenses")}${stat("Net sales", "—", "Revenue less expenses")}${stat("Invoice balance", "—", "Outstanding amount")}</div><div class="section"><h2>Monthly revenue</h2><div id="salesChart" class="empty">Loading sales data…</div></div><div class="section"><h2>Latest sales transactions</h2><div id="salesTable" class="empty">Loading transactions…</div></div>`;
}
function crmHTML() {
  return `<div class="grid">${stat("Customers", "—", "Total customer accounts")}${stat("Leads", "—", "Open enquiries")}${stat("Won revenue", "—", "Income transactions")}${stat("Lead conversion", "—", "Won projects / enquiries")}</div><div class="section"><h2>Lead conversion funnel</h2><div id="crmFunnel" class="empty">Loading CRM overview…</div></div><div class="section"><h2>Recent leads</h2><div id="crmLeads" class="empty">Loading enquiries…</div></div>`;
}
function pipelineHTML() {
  return `<div class="section"><h2>Delivery pipeline</h2><p>Projects are grouped by their status field. Status updates should be restricted by database RLS.</p><div id="pipelineBoard" class="empty">Loading project pipeline…</div></div>`;
}
function approvalsHTML() {
  return `<div class="section"><h2>Submit an approval request</h2><p>Requests are stored only when the protected approval_requests table and its policies are configured.</p><form id="approvalForm"><div class="formrow"><div><label for="approvalTitle">Request title</label><input id="approvalTitle" required maxlength="120"></div><div><label for="approvalAmount">Amount (optional, ₹)</label><input id="approvalAmount" type="number" min="0" step="0.01"></div><div><label for="approvalDetails">Reason / details</label><textarea id="approvalDetails" rows="3" required></textarea></div></div><button class="btn" type="submit">Submit for approval</button> <span id="approvalMessage" class="message" role="status"></span></form></div><div class="section"><h2>Approval inbox</h2><div id="approvalList" class="empty">Loading requests…</div></div>`;
}
function accessHTML() {
  return `<div class="grid">${stat("Signed-in account", currentUser?.email || "—", "Authenticated session")}${stat("Assigned role", "Checking…", "Protected user_roles lookup")}${stat("Access enforcement", "Database RLS", "UI role checks are not security controls")}${stat("Account status", "Active session", "Supabase authenticated")}</div><div class="section"><h2>Role-based access</h2><p id="roleDetails">Checking role assignment…</p><div class="tablewrap"><table><thead><tr><th>Role</th><th>Intended access</th></tr></thead><tbody><tr><td><span class="role-badge">super_admin</span></td><td>Company-wide administration, access governance, audit review</td></tr><tr><td><span class="role-badge">admin</span></td><td>Operations, CRM, finance and reporting</td></tr><tr><td><span class="role-badge">manager</span></td><td>Team, CRM, projects and approvals</td></tr><tr><td><span class="role-badge">finance</span></td><td>Transactions, invoices and finance reports</td></tr><tr><td><span class="role-badge">staff</span></td><td>Assigned operational workspace</td></tr></tbody></table></div><div id="accessStatus" class="notice">Configure user_roles and restrictive Supabase RLS policies. Never grant roles or change privileges from this browser-only screen.</div></div>`;
}
function pageHTML(page) {
  if (page === "dashboard") return dashboardHTML();
  if (page === "crm") return crmHTML();
  if (page === "pipeline") return pipelineHTML();
  if (page === "approvals") return approvalsHTML();
  if (page === "audit") return `<div class="section"><h2>Administrative events</h2><p>Audit records are shown only if the protected audit_logs table and policies are configured. Logs should be written by trusted server-side code.</p><div id="auditList" class="empty">Loading audit history…</div></div>`;
  if (page === "sales") return salesHTML();
  if (page === "access") return accessHTML();
  if (page === "reports") return `<div class="section"><h2>Company performance</h2><p>Use the live KPI dashboard and date-filtered sales reporting for current business metrics.</p><div class="quick"><button data-go="dashboard"><strong>Executive dashboard</strong><span>Company-wide KPIs and trends</span></button><button data-go="sales"><strong>Sales reports</strong><span>Date-filtered revenue charts</span></button><button data-go="crm"><strong>CRM conversion</strong><span>Leads and customers</span></button></div></div>`;
  if (tableNames[page]) return recordPageHTML(page);
  return `<div class="section"><h2>${escapeHtml(pageInfo[page][0])}</h2><div class="empty">This workspace is not configured.</div></div>`;
}
async function renderPage(page) {
  if (!pageInfo[page]) page = "dashboard";
  if (!canAccess(page)) page = "dashboard";
  document.querySelectorAll("#nav button").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $("pageTitle").textContent = pageInfo[page][0]; $("pageSubtitle").textContent = pageInfo[page][1]; $("pageContent").innerHTML = pageHTML(page);
  document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => renderPage(button.dataset.go)));
  const form = $("recordForm"); if (form) form.addEventListener("submit", (event) => saveRecord(event, page));
  if (page === "dashboard") await loadDashboard();
  else if (page === "crm") await loadCRM();
  else if (page === "pipeline") await loadPipeline();
  else if (page === "sales") { const today = new Date(); $("salesFrom").value = dateInput(new Date(today.getFullYear(), today.getMonth(), 1)); $("salesTo").value = dateInput(today); $("runSalesReport").addEventListener("click", loadSalesReport); await loadSalesReport(); }
  else if (page === "approvals") { $("approvalForm").addEventListener("submit", submitApproval); await loadApprovals(); }
  else if (page === "audit") await loadAudit();
  else if (page === "access") await loadRoleInfo();
  else if (tableNames[page]) await loadRecords(page);
}
function canAccess(page) { return (rolePageAccess[currentRole] || rolePageAccess.staff).includes(page); }
function dateInput(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
async function fetchRows(table, select = "*") {
  if (!sb) throw new Error("Supabase is not initialized.");
  const { data, error } = await sb.from(table).select(select).limit(1000);
  if (error) throw error;
  return data || [];
}
async function loadRecords(page) {
  const holder = $("tableData"); if (!holder) return;
  if (!sb) { holder.innerHTML = '<div class="empty">Supabase is not initialized. Check the application configuration.</div>'; return; }
  holder.innerHTML = '<div class="empty">Loading records…</div>';
  try {
    const { data, error } = await sb.from(tableNames[page]).select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    if (!data?.length) { holder.innerHTML = `<div class="empty">No ${escapeHtml(page)} found yet.</div>`; return; }
    const preferred = page === "enquiries" ? ["customer_name", "phone", "email", "service", "status", "created_at"] : Object.keys(data[0]);
    const keys = preferred.filter((key) => Object.hasOwn(data[0], key)).slice(0, 8);
    holder.innerHTML = `<table><thead><tr>${keys.map((key) => `<th>${escapeHtml(key.replaceAll("_", " "))}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(key === "created_at" && row[key] ? new Date(row[key]).toLocaleString("en-IN") : row[key] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  } catch (error) { console.error("Portal records query failed:", error); holder.innerHTML = `<div class="empty"><strong>Could not load ${escapeHtml(page)}.</strong><p>${escapeHtml(error.message || "Check table configuration and RLS policies.")}</p></div>`; }
}
async function saveRecord(event, page) {
  event.preventDefault(); const form = event.currentTarget; const message = $("formMessage");
  if (!sb) { message.textContent = "Supabase client is not initialized."; return; }
  const record = Object.fromEntries(new FormData(form).entries());
  Object.keys(record).forEach((key) => { if (record[key] === "") delete record[key]; });
  if (record.customer_id) record.customer_id = Number(record.customer_id);
  ["price", "amount", "monthly_salary", "total_amount", "paid_amount"].forEach((key) => { if (record[key] !== undefined) record[key] = Number(record[key]); });
  if (page === "enquiries" && !record.status) record.status = "New";
  if (page === "projects" && !record.status) record.status = "Planning";
  if (page === "staff") record.active = true;
  const { error } = await sb.from(tableNames[page]).insert(record);
  if (error) { message.textContent = `Save failed: ${error.message}`; return; }
  message.textContent = "Saved successfully."; form.reset(); await loadRecords(page);
  if (page === "staff") await writeAudit("employee.created", { name: record.name });
}
function sumType(rows, type) { return rows.filter((row) => String(row.transaction_type).toLowerCase() === type).reduce((sum, row) => sum + Number(row.amount || 0), 0); }
async function loadDashboard() {
  if (!sb) return;
  const counts = { customers: "customers", enquiries: "enquiries", projects: "projects", staff: "staff" };
  const countValues = {};
  await Promise.all(Object.entries(counts).map(async ([key, table]) => { const { count, error } = await sb.from(table).select("*", { count: "exact", head: true }); countValues[key] = error ? "—" : count; }));
  const [tx, invoices, recent] = await Promise.all([
    sb.from("transactions").select("transaction_type,amount,transaction_date,description,created_at").limit(1000),
    sb.from("invoices").select("total_amount,paid_amount").limit(1000),
    sb.from("transactions").select("transaction_type,amount,transaction_date,description,created_at").order("created_at", { ascending: false }).limit(6)
  ]);
  const rows = tx.error ? [] : tx.data || []; const income = sumType(rows, "income"); const expenses = sumType(rows, "expense");
  const due = invoices.error ? null : (invoices.data || []).reduce((sum, row) => sum + Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)), 0);
  const { count: dueCount, error: dueError } = await sb.from("invoices").select("*", { count: "exact", head: true }).lt("paid_amount", "total_amount");
  const metrics = [countValues.customers, countValues.enquiries, countValues.projects, dueError || due === null ? "—" : money(due), tx.error ? "—" : money(income), tx.error ? "—" : money(expenses), tx.error ? "—" : money(income - expenses), countValues.staff];
  document.querySelectorAll("#pageContent .stat .value").forEach((cell, index) => { cell.textContent = metrics[index] ?? "—"; });
  renderMonthlyChart(rows.filter((row) => String(row.transaction_type).toLowerCase() === "income"), $("dashboardChart"));
  const activity = $("recentActivity");
  if (activity) activity.innerHTML = recent.error ? "Recent transactions unavailable; check database access." : recent.data?.length ? renderActivity(recent.data) : "No recent transactions to show.";
  const dueStat = document.querySelector("#pageContent .stat:nth-child(4) .hint");
  if (dueStat) dueStat.textContent = dueError ? "Invoice balance unavailable" : `${dueCount ?? 0} unpaid invoices`;
}
function renderActivity(rows) {
  return rows.map((row) => `<div class="activity-item"><span><strong>${escapeHtml(row.transaction_type || "Activity")}</strong> · ${escapeHtml(row.description || "Business transaction")}</span><small>${escapeHtml(row.transaction_date || row.created_at || "")}</small><strong>${money(row.amount)}</strong></div>`).join("");
}
async function loadCRM() {
  const funnel = $("crmFunnel");
  try {
    const [customers, enquiries, projects, tx] = await Promise.all([fetchRows("customers"), fetchRows("enquiries"), fetchRows("projects"), fetchRows("transactions", "transaction_type,amount")]);
    const revenue = sumType(tx, "income");
    const won = projects.filter((row) => /complete|won|delivered/i.test(String(row.status || ""))).length;
    const rate = enquiries.length ? `${Math.round(won / enquiries.length * 100)}%` : "—";
    document.querySelectorAll("#pageContent .stat .value").forEach((cell, index) => { cell.textContent = [customers.length, enquiries.length, money(revenue), rate][index] ?? "—"; });
    const stages = [["New leads", enquiries.filter((row) => /new|open|pending/i.test(String(row.status || "new"))).length], ["In progress", enquiries.filter((row) => /contact|qualif|progress/i.test(String(row.status || ""))).length], ["Projects won", won]];
    funnel.innerHTML = `<div class="quick">${stages.map(([label, count]) => `<div class="stat"><div class="label">${label}</div><div class="value">${count}</div><div class="hint">Current records</div></div>`).join("")}</div>`;
    const holder = $("crmLeads");
    holder.innerHTML = enquiries.length ? `<div class="tablewrap"><table><thead><tr><th>Lead</th><th>Service</th><th>Status</th><th>Created</th></tr></thead><tbody>${enquiries.slice(0, 12).map((row) => `<tr><td>${escapeHtml(row.customer_name || row.name || "—")}</td><td>${escapeHtml(row.service || "—")}</td><td>${escapeHtml(row.status || "New")}</td><td>${escapeHtml(row.created_at || "—")}</td></tr>`).join("")}</tbody></table></div>` : "No enquiries found.";
  } catch (error) { funnel.innerHTML = `<div class="empty">CRM overview needs readable customers, enquiries, projects and transactions tables. ${escapeHtml(error.message)}</div>`; }
}
async function loadPipeline() {
  const holder = $("pipelineBoard");
  try {
    const projects = await fetchRows("projects");
    const stages = ["Planning", "In Progress", "Review", "Completed"];
    const columns = stages.map((stage) => {
      const rows = projects.filter((project) => {
        const status = String(project.status || "Planning").toLowerCase();
        if (stage === "Planning") return /new|planning|pending|backlog/.test(status);
        if (stage === "In Progress") return /progress|active|started/.test(status);
        if (stage === "Review") return /review|hold|approval/.test(status);
        return /complete|done|delivered|closed/.test(status);
      });
      return `<section class="board-column"><h3>${stage}<span class="board-count">${rows.length}</span></h3>${rows.length ? rows.map((project) => `<article class="board-card"><strong>${escapeHtml(project.project_name || project.name || "Project")}</strong><small>${escapeHtml(project.status || stage)}${project.deadline ? ` · Due ${escapeHtml(project.deadline)}` : ""}</small>${project.price ? `<small>Value ${money(project.price)}</small>` : ""}</article>`).join("") : '<div class="empty">No projects</div>'}</section>`;
    }).join("");
    holder.innerHTML = `<div class="board">${columns}</div>`;
  } catch (error) { holder.innerHTML = `<div class="empty">Pipeline requires a readable projects table. ${escapeHtml(error.message)}</div>`; }
}
async function loadSalesReport() {
  const message = $("salesMessage"); if (!sb) { message.textContent = "Supabase is not initialized."; return; }
  const from = $("salesFrom").value, to = $("salesTo").value;
  if (from && to && from > to) { message.textContent = "Choose a start date before the end date."; return; }
  message.textContent = "Loading sales data…"; const holder = $("salesTable"); holder.innerHTML = '<div class="empty">Loading…</div>';
  const [tx, invoices] = await Promise.all([sb.from("transactions").select("transaction_type,amount,transaction_date,description,created_at").limit(2000), sb.from("invoices").select("total_amount,paid_amount,invoice_date,created_at").limit(2000)]);
  if (tx.error) { message.textContent = `Could not load sales: ${tx.error.message}`; holder.textContent = "Check transaction table access and RLS."; return; }
  const inRange = (row, key) => { const date = String(row[key] || row.created_at || "").slice(0, 10); return (!from || date >= from) && (!to || date <= to); };
  const filtered = (tx.data || []).filter((row) => inRange(row, "transaction_date")); const income = filtered.filter((row) => String(row.transaction_type).toLowerCase() === "income"); const expenses = sumType(filtered, "expense");
  const revenue = sumType(income, "income"); const invRows = (invoices.data || []).filter((row) => inRange(row, "invoice_date")); const balance = invRows.reduce((sum, row) => sum + Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0)), 0);
  document.querySelectorAll("#salesMetrics .stat .value").forEach((cell, index) => { cell.textContent = [money(revenue), money(expenses), money(revenue - expenses), invoices.error ? "—" : money(balance)][index] ?? "—"; });
  renderMonthlyChart(income, $("salesChart"));
  income.sort((a, b) => String(b.transaction_date || b.created_at || "").localeCompare(String(a.transaction_date || a.created_at || "")));
  holder.innerHTML = income.length ? `<div class="tablewrap"><table><thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead><tbody>${income.slice(0, 30).map((row) => `<tr><td>${escapeHtml(row.transaction_date || row.created_at || "—")}</td><td>${escapeHtml(row.description || "Income transaction")}</td><td>${money(row.amount)}</td></tr>`).join("")}</tbody></table></div>` : '<div class="empty">No income transactions in this date range.</div>';
  message.textContent = `${income.length} income transactions · ${filtered.length - income.length} other transactions${invoices.error ? " · Invoice totals unavailable" : ""}.`;
}
function renderMonthlyChart(rows, holder) {
  if (!holder) return;
  const grouped = new Map();
  rows.forEach((row) => { const date = String(row.transaction_date || row.created_at || ""); if (date.length >= 7) { const month = date.slice(0, 7); grouped.set(month, (grouped.get(month) || 0) + Number(row.amount || 0)); } });
  const data = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  if (!data.length) { holder.innerHTML = '<div class="empty">No dated income transactions available to chart.</div>'; return; }
  const max = Math.max(...data.map(([, value]) => value), 1); const points = data.map(([month, value], index) => `${30 + index * (640 / Math.max(data.length - 1, 1))},${155 - value / max * 125}`).join(" ");
  const labels = data.map(([month], index) => `<text x="${30 + index * (640 / Math.max(data.length - 1, 1))}" y="188" text-anchor="middle" fill="#929bb0" font-size="10">${escapeHtml(month.slice(2))}</text>`).join("");
  holder.innerHTML = `<svg class="mini-chart" viewBox="0 0 700 205" role="img" aria-label="Monthly income trend"><defs><linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8b83ff" stop-opacity=".35"/><stop offset="1" stop-color="#8b83ff" stop-opacity="0"/></linearGradient></defs><path d="M ${points} L ${30 + (data.length - 1) * (640 / Math.max(data.length - 1, 1))},165 L 30,165 Z" fill="url(#revenueFill)"/><polyline points="${points}" fill="none" stroke="#9b93ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${data.map(([month, value], index) => `<circle cx="${30 + index * (640 / Math.max(data.length - 1, 1))}" cy="${155 - value / max * 125}" r="4" fill="#c6c1ff"><title>${escapeHtml(month)}: ${money(value)}</title></circle>`).join("")}${labels}</svg>`;
}
async function submitApproval(event) {
  event.preventDefault(); const message = $("approvalMessage");
  const request = { title: $("approvalTitle").value.trim(), details: $("approvalDetails").value.trim(), amount: $("approvalAmount").value ? Number($("approvalAmount").value) : null, status: "pending", requested_by: currentUser?.id };
  const { error } = await sb.from("approval_requests").insert(request);
  if (error) { message.textContent = `Could not submit. Configure approval_requests and RLS: ${error.message}`; return; }
  message.textContent = "Request submitted for review."; event.currentTarget.reset(); await writeAudit("approval.submitted", { title: request.title }); await loadApprovals();
}
async function loadApprovals() {
  const holder = $("approvalList");
  try {
    const rows = await fetchRows("approval_requests");
    if (!rows.length) { holder.textContent = "No approval requests found."; return; }
    holder.innerHTML = `<div class="tablewrap"><table><thead><tr><th>Request</th><th>Amount</th><th>Status</th><th>Requested</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.title || row.description || "Request")}</td><td>${row.amount == null ? "—" : money(row.amount)}</td><td>${escapeHtml(row.status || "Pending")}</td><td>${escapeHtml(row.created_at || "—")}</td></tr>`).join("")}</tbody></table></div>`;
  } catch (error) { holder.textContent = `Approval inbox unavailable. Configure approval_requests with RLS policies. ${error.message}`; }
}
async function loadAudit() {
  const holder = $("auditList");
  try {
    const { data, error } = await sb.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    if (!data?.length) { holder.textContent = "No audit events found."; return; }
    const columns = Object.keys(data[0]).slice(0, 6);
    holder.innerHTML = `<div class="tablewrap"><table><thead><tr>${columns.map((key) => `<th>${escapeHtml(key.replaceAll("_", " "))}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${columns.map((key) => `<td>${escapeHtml(typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key] ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  } catch (error) { holder.textContent = `Audit logs are unavailable. Configure a protected audit_logs table and server-side event recording. ${error.message}`; }
}
async function writeAudit(action, metadata = {}) {
  if (!sb || !currentUser) return;
  // Best-effort application event only; durable audit logging belongs in trusted server/database triggers.
  const { error } = await sb.from("audit_logs").insert({ actor_id: currentUser.id, action, metadata });
  if (error) console.info("Audit event not persisted; configure server-side audit logging and RLS.", error.message);
}
async function loadRoleInfo() {
  if (!currentUser || !sb) return;
  const details = $("roleDetails");
  try {
    const { data, error } = await sb.from("user_roles").select("role").eq("user_id", currentUser.id).maybeSingle();
    if (error) throw error;
    const role = String(data?.role || "staff").toLowerCase();
    currentRole = Object.hasOwn(rolePageAccess, role) ? role : "staff";
    const cells = document.querySelectorAll("#pageContent .stat .value");
    if (cells[0]) cells[0].textContent = currentUser.email || "Authenticated";
    if (cells[1]) cells[1].textContent = currentRole;
    details.textContent = data ? `The protected user_roles record reports “${currentRole}”. This interface applies convenience navigation only; RLS must enforce access to every row and action.` : "No user_roles record was returned. The interface defaults to staff access; no elevated permissions are assumed.";
    if (currentRole === "super_admin") $("accessStatus").textContent = "A super_admin role is recorded. Keep policies restrictive and perform privileged role changes only through a trusted, audited server-side workflow.";
    document.querySelectorAll("#nav button[data-page]").forEach((button) => { button.hidden = !canAccess(button.dataset.page); });
  } catch (error) {
    currentRole = "staff";
    const cells = document.querySelectorAll("#pageContent .stat .value"); if (cells[1]) cells[1].textContent = "Not configured";
    details.textContent = "Role lookup is unavailable. Configure user_roles and RLS before relying on role-based access.";
    $("accessStatus").textContent = `No elevated access assumed. Role lookup failed: ${error.message}`;
  }
}
function bindEvents() {
  $("loginForm").addEventListener("submit", (event) => { event.preventDefault(); signIn($("email").value.trim(), $("password").value); });
  $("forgotBtn").addEventListener("click", forgotPassword); $("logoutBtn").addEventListener("click", signOut);
  $("refreshBtn").addEventListener("click", () => renderPage(document.querySelector("#nav button.active")?.dataset.page || "dashboard"));
  $("nav").addEventListener("click", (event) => { const button = event.target.closest("button[data-page]"); if (button && !button.hidden) renderPage(button.dataset.page); });
  $("resetForm")?.addEventListener("submit", async (event) => { event.preventDefault(); const password = $("newPassword").value; if (password !== $("confirmPassword").value) { $("resetMessage").textContent = "Passwords do not match."; return; } const { error } = await sb.auth.updateUser({ password }); $("resetMessage").textContent = error ? error.message : "Password updated successfully."; if (!error) setTimeout(showApp, 900); });
  $("backToLoginBtn")?.addEventListener("click", () => { history.replaceState({}, document.title, location.pathname); showLogin(); });
  document.querySelector(".search input")?.addEventListener("input", (event) => { const term = event.target.value.trim().toLowerCase(); document.querySelectorAll("#pageContent tbody tr").forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(term); }); });
}

initClient();
installEnterpriseTheme();
addNavigation();
bindEvents();
if (!sb) showLogin("Supabase could not initialize. Check the Supabase library and configuration.");
else {
  if (location.hash.includes("type=recovery")) { $("loginView").classList.add("hidden"); $("resetView").classList.remove("hidden"); }
  sb.auth.getSession().then(({ data, error }) => {
    if (error) { showLogin(`Could not check login session: ${error.message}`); return; }
    currentUser = data.session?.user || null;
    if (currentUser) showApp(); else if (!location.hash.includes("type=recovery")) showLogin();
  }).catch((error) => showLogin(`Session error: ${error.message}`));
  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) currentUser = session.user;
    if (event === "SIGNED_IN" && session) setTimeout(showApp, 0);
    else if (event === "SIGNED_OUT") { currentUser = null; currentRole = "staff"; showLogin(); }
    else if (event === "PASSWORD_RECOVERY") { $("loginView").classList.add("hidden"); $("resetView").classList.remove("hidden"); }
  });
}
