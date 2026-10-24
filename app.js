/*
 VR Tech Solutions Admin Portal
 Uses the Supabase project URL and public publishable key.
 NEVER put a service_role/secret key in browser code.
 Configure and test admin-only RLS policies before using live data.
*/
const SUPABASE_URL = "https://rficwjxubmexlkplmpdv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_XJJALDjMrAEUq_Qol9LiCA_UX79aNgj";
let sb = null;
const $ = (id) => document.getElementById(id);
const tableNames = {
  customers: "customers", enquiries: "enquiries", projects: "projects",
  finance: "transactions", staff: "staff", invoices: "invoices"
};
const pageInfo = {
 dashboard:["Dashboard","Your business at a glance"],
 customers:["Customers","Manage your customer records"],
 enquiries:["Enquiries","Track leads and follow-ups"],
 projects:["Projects","Monitor project progress"],
 finance:["Finance","Track income and business expenses"],
 staff:["Staff & Salary","Manage staff records and salary"],
 invoices:["Invoices","Track invoices and payments"],
 reports:["Reports","Review business performance"]
};
function configured(){return !SUPABASE_URL.includes("PASTE_") && !SUPABASE_ANON_KEY.includes("PASTE_");}
function initClient(){if(configured() && window.supabase) sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);}
function showLogin(msg=""){ $("loginView").classList.remove("hidden"); $("appView").classList.add("hidden"); if(msg) $("loginMessage").textContent=msg; }
function showApp(){ $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden"); renderPage("dashboard"); }
function money(n){return "₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2});}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function signIn(email,password){
 if(!sb){$("loginMessage").textContent="Supabase client could not initialize. Check the Supabase script and app.js configuration.";return;}
 const {error}=await sb.auth.signInWithPassword({email,password});
 if(error){$("loginMessage").textContent=error.message;return;}
 // Login alone does not authorize database access; enforce admin-only RLS in Supabase.
 showApp();
}
async function signOut(){if(sb) await sb.auth.signOut();showLogin("You have signed out.");}
async function forgotPassword(){
 const email=$("email").value.trim();
 if(!email){$("loginMessage").textContent="Enter your admin email first, then choose Forgot Password.";return;}
 if(!sb){$("loginMessage").textContent="Supabase client could not initialize. Check app.js and the Supabase script.";return;}
 const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.href});
 $("loginMessage").textContent=error?error.message:"If this email belongs to an account, password reset instructions will be sent. Check your inbox.";
}
function stat(label,value,hint=""){return `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;}
function dashboardHTML(){return `<div class="grid">
${stat("Total Customers","—","Customer records")}
${stat("Open Enquiries","—","Needs follow-up")}
${stat("Active Projects","—","In progress")}
${stat("Pending Payments","—","To be collected")}
${stat("Total Income","—","Recorded income")}
${stat("Total Expenses","—","Recorded expenses")}
${stat("Net Profit","—","Income − expenses")}
${stat("Invoices","—","Invoice records")}
</div><div class="section"><h2>Quick Actions</h2><div class="quick">
<button data-go="customers"><strong>＋ Add Customer</strong><span>Create a customer record</span></button>
<button data-go="enquiries"><strong>✉ View Enquiries</strong><span>Check leads and follow-ups</span></button>
<button data-go="projects"><strong>▣ Manage Projects</strong><span>Update project status</span></button>
<button data-go="finance"><strong>₹ Add Transaction</strong><span>Record income or expense</span></button>
<button data-go="invoices"><strong>▤ Manage Invoices</strong><span>Track paid and due amounts</span></button>
<button data-go="reports"><strong>▥ View Reports</strong><span>Business summary</span></button>
</div></div>`;}
function pageHTML(page){
 if(page==="dashboard") return dashboardHTML();
 const title=pageInfo[page][0];
 if(page==="reports") return `<div class="grid">${stat("Income","—","Selected period")}${stat("Expenses","—","Selected period")}${stat("Net Profit","—","Income − expenses")}${stat("Payments Due","—","Invoice balance")}</div><div class="section"><h2>Reports</h2><p class="empty">Report totals should be calculated from saved records after database access is secured.</p></div>`;
 const forms={
 customers:[["Customer Name","name"],["Phone","phone"],["Email","email"],["Address","address"]],
 enquiries:[["Customer Name","customer_name"],["Phone","phone"],["Email","email"],["Service","service"],["Details","details"]],
 projects:[["Project Name","project_name"],["Customer ID (optional)","customer_id"],["Price (₹)","price"],["Start Date","start_date"],["Deadline","deadline"]],
 finance:[["Type: Income or Expense","transaction_type"],["Category","category"],["Amount (₹)","amount"],["Description","description"],["Date (YYYY-MM-DD)","transaction_date"]],
 staff:[["Staff Name","name"],["Phone","phone"],["Monthly Salary (₹)","monthly_salary"]],
 invoices:[["Invoice Number","invoice_number"],["Customer ID (optional)","customer_id"],["Total Amount (₹)","total_amount"],["Paid Amount (₹)","paid_amount"],["Invoice Date (YYYY-MM-DD)","invoice_date"]]
 };
 const fields=forms[page]||[];
 return `<div class="section"><h2>Add ${escapeHtml(title.replace(/s$/,""))}</h2><form id="recordForm" data-table="${tableNames[page]}"><div class="formrow">${fields.map(([label,key])=>`<div><label>${escapeHtml(label)}</label><input name="${key}" ${["price","amount","monthly_salary","total_amount","paid_amount","customer_id"].includes(key)?"type=number":key.includes("date")?"type=date":key==="email"?"type=email":"type=text"} ${["name","customer_name","project_name","transaction_type","invoice_number"].includes(key)?"required":""} ${["amount","price","monthly_salary","total_amount","paid_amount"].includes(key)?"min=0 step=0.01":""}></div>`).join("")}</div><button class="btn" type="submit">Save Record</button><div id="formMessage" class="message"></div></form></div>
 <div class="section"><h2>${escapeHtml(title)} List</h2><div class="tablewrap" id="tableData"><div class="empty">Loading records…</div></div></div>`;
}
async function renderPage(page){
 if(!pageInfo[page]) page="dashboard";
 document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
 $("pageTitle").textContent=pageInfo[page][0];$("pageSubtitle").textContent=pageInfo[page][1];
 $("pageContent").innerHTML=pageHTML(page);
 document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>renderPage(b.dataset.go)));
 const form=$("recordForm");if(form) form.addEventListener("submit",e=>saveRecord(e,page));
 if(page!=="dashboard"&&page!=="reports") await loadRecords(page);
 if(page==="dashboard") await loadDashboard();
}
async function loadRecords(page){
 const holder=$("tableData"); if(!sb){holder.innerHTML='<div class="empty">Supabase client is not initialized. Check app.js settings.</div>';return;}
 const {data,error}=await sb.from(tableNames[page]).select("*").order("created_at",{ascending:false}).limit(100);
 if(error){holder.innerHTML=`<div class="empty">Could not load records: ${escapeHtml(error.message)}. Check table columns and admin-only RLS policies.</div>`;return;}
 if(!data.length){holder.innerHTML='<div class="empty">No records yet.</div>';return;}
 const keys=Object.keys(data[0]).filter(k=>k!=="created_at").slice(0,6);
 holder.innerHTML=`<table><thead><tr>${keys.map(k=>`<th>${escapeHtml(k.replaceAll("_"," "))}</th>`).join("")}</tr></thead><tbody>${data.map(row=>`<tr>${keys.map(k=>`<td>${escapeHtml(row[k])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
async function saveRecord(e,page){
 e.preventDefault();const form=e.currentTarget;const msg=$("formMessage");
 if(!sb){msg.textContent="Supabase client is not initialized. Check app.js settings.";return;}
 const obj=Object.fromEntries(new FormData(form).entries());
 for(const k of Object.keys(obj)){if(obj[k]==="") delete obj[k];}
 if(obj.customer_id) obj.customer_id=Number(obj.customer_id);
 for(const k of ["price","amount","monthly_salary","total_amount","paid_amount"]) if(obj[k]!==undefined)obj[k]=Number(obj[k]);
 if(page==="enquiries"&&!obj.status)obj.status="New";
 if(page==="projects"&&!obj.status)obj.status="New";
 if(page==="staff")obj.active=true;
 const {error}=await sb.from(tableNames[page]).insert(obj);
 if(error){msg.textContent="Save failed: "+error.message+" (Check database permissions/RLS and table columns).";return;}
 msg.textContent="Saved successfully.";form.reset();await loadRecords(page);
}
async function loadDashboard(){
 if(!sb)return;
 const counts={customers:"customers",enquiries:"enquiries",projects:"projects",invoices:"invoices"};
 const vals={};
 for(const [key,table] of Object.entries(counts)){const {count,error}=await sb.from(table).select("*",{count:"exact",head:true});vals[key]=error?"—":count;}
 const {data:tx,error:txErr}=await sb.from("transactions").select("transaction_type,amount");
 let income=0,expenses=0;if(!txErr)(tx||[]).forEach(r=>{if(r.transaction_type==="Income")income+=Number(r.amount||0);else if(r.transaction_type==="Expense")expenses+=Number(r.amount||0);});
 const {data:inv,error:invErr}=await sb.from("invoices").select("total_amount,paid_amount");
 let due=0;if(!invErr)(inv||[]).forEach(r=>due+=Number(r.total_amount||0)-Number(r.paid_amount||0));
 const cells=document.querySelectorAll(".stat .value");
 const values=[vals.customers??"—",vals.enquiries??"—",vals.projects??"—",invErr?"—":money(due),txErr?"—":money(income),txErr?"—":money(expenses),txErr?"—":money(income-expenses),vals.invoices??"—"];
 cells.forEach((c,i)=>c.textContent=values[i]??"—");
}
$("loginForm").addEventListener("submit",e=>{e.preventDefault();signIn($("email").value.trim(),$("password").value);});
$("forgotBtn").addEventListener("click",forgotPassword);
$("logoutBtn").addEventListener("click",signOut);
$("refreshBtn").addEventListener("click",()=>renderPage(document.querySelector("#nav button.active")?.dataset.page||"dashboard"));
$("nav").addEventListener("click",e=>{const b=e.target.closest("button[data-page]");if(b)renderPage(b.dataset.page);});
initClient();
if(sb){
 sb.auth.getSession().then(({data})=>{if(data.session)showApp();});
 sb.auth.onAuthStateChange((_event,session)=>{if(session)showApp();else showLogin();});
  }
