/* Page controls, role preview, collapsible navigation, and sidebar state. */
document.getElementById("previousBtn").addEventListener("click",()=>{captureFields(); if(state.current>0){state.current--;render();window.scrollTo(0,0)}});
document.getElementById("nextBtn").addEventListener("click",()=>{captureFields(); if(state.current<sections.length-1){state.current++;render();window.scrollTo(0,0)}else{state.status="Pending HOD review";document.getElementById("statusBadge").textContent="PENDING REVIEW";toast("Assessment submitted to HOD for review")}});
document.getElementById("saveBtn").addEventListener("click",()=>{captureFields();toast("Draft saved in this prototype")});
document.getElementById("draftFooterBtn").addEventListener("click",()=>{captureFields();toast("Draft saved in this prototype")});
document.getElementById("previewBtn").addEventListener("click",showReport);
document.getElementById("backBtn").addEventListener("click",()=>{document.getElementById("reportView").style.display="none";document.getElementById("appView").style.display="grid"});
document.getElementById("printBtn").addEventListener("click",()=>window.print());
document.getElementById("roleSelect").addEventListener("change",e=>{document.body.classList.toggle("hod-mode",e.target.value==="hod");toast(e.target.value==="hod"?"HOD review mode enabled":"Corporate Monitoring mode enabled")});
document.getElementById("approveBtn").addEventListener("click",()=>{state.status="Approved";document.getElementById("statusBadge").textContent="APPROVED";document.getElementById("statusBadge").style.cssText="background:var(--green-soft);color:var(--green)";toast("Assessment approved and locked")});
document.getElementById("returnBtn").addEventListener("click",()=>{state.status="Returned for correction";document.getElementById("statusBadge").textContent="RETURNED";toast("Assessment returned to the analyst")});
const sectionNav = document.getElementById("sectionNav");
const sectionNavToggle = document.getElementById("sectionNavToggle");
sectionNavToggle.addEventListener("click",()=>{
  const collapsed = sectionNav.classList.toggle("is-collapsed");
  sectionNavToggle.setAttribute("aria-expanded", String(!collapsed));
});

const agmSidebar = document.querySelector(".sidebar");
const agmSidebarToggle = document.getElementById("agmSidebarToggle");
const agmSidebarCollapsed = localStorage.getItem("mswg_agm_sidebar_collapsed") === "true";
function setAgmSidebar(collapsed) {
  agmSidebar.classList.toggle("collapsed", collapsed);
  document.getElementById("appView").classList.toggle("sidebar-collapsed", collapsed);
  agmSidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  agmSidebarToggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  const text = agmSidebarToggle.querySelector(".toggle-text");
  if (text) text.textContent = collapsed ? "Expand menu" : "      ";
}
setAgmSidebar(agmSidebarCollapsed);
agmSidebarToggle.addEventListener("click", () => {
  const collapsed = !agmSidebar.classList.contains("collapsed");
  setAgmSidebar(collapsed);
  localStorage.setItem("mswg_agm_sidebar_collapsed", String(collapsed));
});

render();

if (new URLSearchParams(window.location.search).has("print")) {
  showReport();
}
