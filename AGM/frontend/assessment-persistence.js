/* Database persistence, workflow actions, record locking, and approved-report retrieval. */
function assessmentPayload() {
  captureFields();
  return {
    fields: { ...state.fields },
    answers: { ...state.answers },
    comments: { ...state.comments }
  };
}

function formatAssessmentStatus(status) {
  return ({ DRAFT: "Draft", SUBMITTED: "Pending HOD review", APPROVED: "Approved", RETURNED: "Returned for correction" })[status] || status || "Draft";
}

function updateStateFromServer(item, permissions) {
  state.assessmentId = item.assessment_id;
  state.recordVersion = item.record_version;
  state.revision = item.revision;
  state.status = item.status;
  state.fields = { ...state.fields, ...(item.fields || {}) };
  state.answers = { ...(item.answers || {}) };
  state.comments = { ...(item.comments || {}) };
  state.permissions = permissions || state.permissions;
  state.createdByName = item.created_by_name;
  state.approvedByName = item.approved_by_name;
  state.approvedAt = item.approved_at;
  state.reviewComment = item.review_comment || "";
  state.approvedSnapshot = item.approved_snapshot;
}

function statusClass(status) {
  return ({ DRAFT: "status-draft", SUBMITTED: "status-submitted", APPROVED: "status-approved", RETURNED: "status-returned" })[status] || "status-draft";
}

function applyAssessmentAccessState() {
  const statusBadge = document.getElementById("statusBadge");
  if (!statusBadge) return;
  statusBadge.textContent = formatAssessmentStatus(state.status).toUpperCase();
  statusBadge.className = `status ${statusClass(state.status)}`;
  const meta = document.getElementById("recordMeta");
  if (meta) meta.textContent = state.assessmentId ? `Record ${state.assessmentId} · Revision ${state.revision} · Version ${state.recordVersion}` : "New unsaved assessment";

  const editable = !state.assessmentId || Boolean(state.permissions?.can_edit);
  document.querySelectorAll("#formBody input, #formBody select, #formBody textarea").forEach(control => { control.disabled = !editable; });
  document.getElementById("saveBtn").hidden = !editable;
  document.getElementById("draftFooterBtn").hidden = !editable;
  document.getElementById("approveBtn").hidden = !state.permissions?.can_review;
  document.getElementById("returnBtn").hidden = !state.permissions?.can_review;
  document.getElementById("reopenBtn").hidden = !state.permissions?.can_reopen;
  document.querySelector(".review-banner")?.classList.toggle("visible", Boolean(state.permissions?.can_review || state.permissions?.can_reopen));

  const next = document.getElementById("nextBtn");
  if (state.current === sections.length - 1) {
    next.textContent = state.permissions?.can_submit || !state.assessmentId ? "Submit for review" : "Preview report";
  }
  const reviewText = document.getElementById("reviewBannerText");
  if (reviewText) {
    reviewText.textContent = state.permissions?.can_reopen
      ? "This approved assessment is locked. Reopen it only when a documented correction is required."
      : (state.reviewComment || "Check the submitted assessment before approving or returning it.");
  }
}
window.applyAssessmentAccessState = applyAssessmentAccessState;

async function saveCurrentAssessment({ quiet = false } = {}) {
  const payload = assessmentPayload();
  const result = state.assessmentId
    ? await agmApi.save(state.assessmentId, { ...payload, record_version: state.recordVersion })
    : await agmApi.create(payload);
  updateStateFromServer(result.item, {
    can_edit: true,
    can_submit: true,
    can_review: false,
    can_reopen: false
  });
  const url = new URL(window.location.href);
  url.searchParams.set("id", state.assessmentId);
  url.searchParams.set("role", window.AGM_CONFIG.localRole);
  history.replaceState({}, "", url);
  render();
  if (!quiet) toast("Draft saved to DynamoDB");
  return result.item;
}

async function submitCurrentAssessment() {
  try {
    await saveCurrentAssessment({ quiet: true });
    const result = await agmApi.submit(state.assessmentId, state.recordVersion);
    updateStateFromServer(result.item, { can_edit: false, can_submit: false, can_review: false, can_reopen: false });
    render();
    toast("Assessment submitted to HOD and locked");
  } catch (error) {
    toast(error.message);
    throw error;
  }
}

async function reviewCurrentAssessment(decision, comment = "") {
  if (decision === "return" && !comment.trim()) { toast("A return reason is required"); return false; }
  try {
    const result = await agmApi.review(state.assessmentId, state.recordVersion, decision, comment.trim());
    updateStateFromServer(result.item, {
      can_edit: false,
      can_submit: false,
      can_review: false,
      can_reopen: result.item.status === "APPROVED"
    });
    render();
    toast(result.message);
    return true;
  } catch (error) { toast(error.message); return false; }
}

async function reopenCurrentAssessment(reason) {
  if (!reason?.trim()) { toast("A reopening reason is required"); return false; }
  try {
    const result = await agmApi.reopen(state.assessmentId, state.recordVersion, reason.trim());
    updateStateFromServer(result.item, { can_edit: false, can_submit: false, can_review: false, can_reopen: false });
    render();
    toast("New revision opened and returned to the original assessor");
    return true;
  } catch (error) { toast(error.message); return false; }
}

async function initializeAssessmentPersistence() {
  const role = window.AGM_CONFIG.localRole;
  document.body.classList.toggle("hod-mode", role === "hod");
  const roleSelect = document.getElementById("roleSelect");
  if (roleSelect) {
    roleSelect.value = role;
    roleSelect.hidden = window.AGM_CONFIG.environment !== "local";
  }
  const userCard = document.querySelector(".user-card");
  if (userCard) userCard.innerHTML = role === "hod"
    ? "<strong>RITA FOO</strong><span>Corporate Monitoring · HOD reviewer</span>"
    : "<strong>CORPORATE MONITORING</strong><span>Analyst / Assessor</span>";

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    state.fields.analyst = role === "hod" ? "" : "Corporate Monitoring Assessor";
    state.permissions = { can_edit: role !== "hod", can_submit: role !== "hod", can_review: false, can_reopen: false };
    render();
    return;
  }
  try {
    const result = await agmApi.get(id);
    const showApproved = params.get("approved") === "1" && result.item.approved_snapshot;
    if (showApproved) {
      updateStateFromServer(result.item.approved_snapshot, { can_edit: false, can_submit: false, can_review: false, can_reopen: false });
      state.assessmentId = result.item.assessment_id;
      state.status = "APPROVED";
    } else {
      updateStateFromServer(result.item, result.permissions);
    }
    render();
    if (showApproved) showReport();
  } catch (error) {
    render();
    toast(error.message);
  }
}

function changeLocalRole(role) {
  localStorage.setItem("mswg_agm_local_role", role);
  const url = new URL(window.location.href);
  url.searchParams.set("role", role);
  window.location.assign(url);
}
