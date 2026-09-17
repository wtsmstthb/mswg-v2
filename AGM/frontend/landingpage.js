/* Page controls, persistent workflow actions, and sidebar state. */
document.getElementById("previousBtn").addEventListener("click",()=>{captureFields(); if(state.current>0){state.current--;render();window.scrollTo(0,0)}});
document.getElementById("nextBtn").addEventListener("click", async ()=>{
  captureFields();
  if(state.current<sections.length-1){state.current++;render();window.scrollTo(0,0);return;}
  if(state.permissions?.can_submit) await submitCurrentAssessment().catch(()=>{});
  else showReport();
});
document.getElementById("saveBtn").addEventListener("click",()=>saveCurrentAssessment().catch(error=>toast(error.message)));
document.getElementById("draftFooterBtn").addEventListener("click",()=>saveCurrentAssessment().catch(error=>toast(error.message)));
document.getElementById("previewBtn").addEventListener("click",showReport);
document.getElementById("backBtn").addEventListener("click",()=>{document.getElementById("reportView").style.display="none";document.getElementById("appView").style.display="grid"});
document.getElementById("printBtn").addEventListener("click",()=>window.print());
let workflowAction = null;
function openWorkflowModal(action) {
  workflowAction = action;
  const modal = document.getElementById("workflowModal");
  const title = document.getElementById("workflowModalTitle");
  const description = document.getElementById("workflowModalDescription");
  const label = document.getElementById("workflowCommentLabel");
  const comment = document.getElementById("workflowComment");
  const confirm = document.getElementById("workflowConfirmBtn");
  const copy = {
    approve: ["Approve assessment", "Approval locks this revision and preserves its report snapshot.", "Approval comment (optional)", "Approve and lock"],
    return: ["Return for correction", "Explain what the original assessor must correct before resubmission.", "Return reason", "Return assessment"],
    reopen: ["Reopen approved assessment", "This creates a new revision while preserving the previously approved report.", "Reason for reopening", "Create new revision"]
  }[action];
  [title.textContent, description.textContent, label.textContent, confirm.textContent] = copy;
  comment.value = "";
  comment.required = action !== "approve";
  modal.hidden = false;
  comment.focus();
}
function closeWorkflowModal() { document.getElementById("workflowModal").hidden = true; workflowAction = null; }
document.getElementById("approveBtn").addEventListener("click",()=>openWorkflowModal("approve"));
document.getElementById("returnBtn").addEventListener("click",()=>openWorkflowModal("return"));
document.getElementById("reopenBtn").addEventListener("click",()=>openWorkflowModal("reopen"));
document.getElementById("workflowCancelBtn").addEventListener("click",closeWorkflowModal);
document.getElementById("workflowModal").addEventListener("click",event=>{if(event.target.id==="workflowModal")closeWorkflowModal()});
document.getElementById("workflowConfirmBtn").addEventListener("click",async()=>{
  const comment = document.getElementById("workflowComment").value.trim();
  if (workflowAction !== "approve" && !comment) { toast("A reason is required"); return; }
  const completed = workflowAction === "reopen"
    ? await reopenCurrentAssessment(comment)
    : await reviewCurrentAssessment(workflowAction, comment);
  if (completed) closeWorkflowModal();
});
const sectionNav = document.getElementById("sectionNav");
const sectionNavToggle = document.getElementById("sectionNavToggle");
const sectionNavChevron = sectionNavToggle.querySelector(".section-nav-chevron");
let sectionNavChevronRotation = 180;
sectionNavToggle.addEventListener("click",()=>{
  const collapsed = sectionNav.classList.toggle("is-collapsed");
  sectionNavToggle.setAttribute("aria-expanded", String(!collapsed));
  sectionNavChevronRotation += 180;
  sectionNavChevron.style.setProperty("--section-nav-chevron-rotation", `${sectionNavChevronRotation}deg`);
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

initializeAssessmentPersistence().then(()=>{
  const params = new URLSearchParams(window.location.search);
  document.getElementById("crumbLabel").textContent = state.assessmentId ? state.fields.company || "Saved assessment" : "New assessment";
  if (params.has("print") && params.get("approved") !== "1") showReport();
});
