/* Retrieval, filtering, workflow queue, and audit-history display. */
let records = [];

function escRecord(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function statusLabel(status) {
  return ({ DRAFT: "Draft", SUBMITTED: "Pending review", APPROVED: "Approved", RETURNED: "Returned" })[status] || status;
}

function statusClass(status) {
  return ({ DRAFT: "status-draft", SUBMITTED: "status-submitted", APPROVED: "status-approved", RETURNED: "status-returned" })[status] || "status-draft";
}

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(window.agmRecordToastTimer);
  window.agmRecordToastTimer = setTimeout(() => element.classList.remove("show"), 2600);
}

function recordUrl(record, approved = false) {
  const url = new URL("landingpage.html", window.location.href);
  url.searchParams.set("id", record.assessment_id);
  url.searchParams.set("role", window.AGM_CONFIG.localRole);
  if (approved) url.searchParams.set("approved", "1");
  return url.pathname + url.search;
}

function renderRecords() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const mode = document.getElementById("modeFilter").value;
  const visible = records.filter(record => {
    const searchable = `${record.company} ${record.created_by_name}`.toLowerCase();
    return (!search || searchable.includes(search)) && (!status || record.status === status) && (!mode || record.meeting_mode === mode);
  });
  document.getElementById("recordCount").textContent = `${visible.length} ${visible.length === 1 ? "RECORD" : "RECORDS"}`;
  const body = document.getElementById("recordsBody");
  if (!visible.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty-records">No assessments match the current filters.</td></tr>';
    return;
  }
  body.innerHTML = visible.map(record => {
    const primaryLabel = record.permissions?.can_review ? "Review" : (record.permissions?.can_edit ? "Continue" : "Open");
    return `<tr>
      <td><strong>${escRecord(record.company || "Untitled assessment")}</strong><small>${escRecord(record.meeting_type || "AGM")} · ${escRecord(record.meeting_date || "Date not entered")} · Revision ${record.revision}</small></td>
      <td>${escRecord(record.created_by_name || record.created_by)}</td>
      <td>${escRecord(record.meeting_mode || "—")}</td>
      <td><strong>${record.score === null ? "—" : `${record.score}%`}</strong></td>
      <td><span class="status ${statusClass(record.status)}">${escRecord(statusLabel(record.status))}</span></td>
      <td>${record.updated_at ? new Date(record.updated_at).toLocaleString("en-MY") : "—"}</td>
      <td><div class="record-actions"><a class="btn primary" href="${recordUrl(record)}">${primaryLabel}</a>${record.approved_at ? `<a class="btn" href="${recordUrl(record, true)}">Approved report</a>` : ""}<button class="btn" data-history="${escRecord(record.assessment_id)}" data-company="${escRecord(record.company)}">History</button></div></td>
    </tr>`;
  }).join("");
  document.querySelectorAll("[data-history]").forEach(button => button.addEventListener("click", () => showHistory(button.dataset.history, button.dataset.company)));
}

async function loadRecords() {
  document.getElementById("recordsBody").innerHTML = '<tr><td colspan="7" class="empty-records">Loading assessments…</td></tr>';
  try {
    const result = await agmApi.list();
    records = result.items;
    renderRecords();
  } catch (error) {
    document.getElementById("recordsBody").innerHTML = `<tr><td colspan="7" class="empty-records">${escRecord(error.message)}<br><small>Start the local AGM server before opening this page.</small></td></tr>`;
  }
}

async function showHistory(id, company) {
  const panel = document.getElementById("historyPanel");
  document.getElementById("historyTitle").textContent = company || "Assessment history";
  document.getElementById("historyList").innerHTML = '<div class="history-event">Loading history…</div>';
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  try {
    const result = await agmApi.history(id);
    document.getElementById("historyList").innerHTML = result.items.slice().reverse().map(event => {
      const detail = event.details?.comment || event.details?.reason || "";
      return `<article class="history-event"><strong>${escRecord(event.event_type)} · Revision ${event.revision}</strong><span>${new Date(event.event_at.split("#")[0]).toLocaleString("en-MY")}<br>${escRecord(event.actor_name)} · ${escRecord(statusLabel(event.status))}${detail ? `<br>“${escRecord(detail)}”` : ""}</span></article>`;
    }).join("") || '<div class="history-event">No history events found.</div>';
  } catch (error) {
    document.getElementById("historyList").innerHTML = `<div class="history-event">${escRecord(error.message)}</div>`;
  }
}

function setRoleShell() {
  const role = window.AGM_CONFIG.localRole;
  document.body.classList.toggle("hod-mode", role === "hod");
  document.getElementById("roleSelect").value = role;
  document.getElementById("roleSelect").hidden = window.AGM_CONFIG.environment !== "local";
  document.getElementById("newAssessmentBtn").hidden = role === "hod";
  document.querySelector(".user-card").innerHTML = role === "hod"
    ? "<strong>RITA FOO</strong><span>Corporate Monitoring · HOD reviewer</span>"
    : "<strong>CORPORATE MONITORING</strong><span>Analyst / Assessor</span>";
}

const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.getElementById("agmSidebarToggle");
function setSidebar(collapsed) {
  sidebar.classList.toggle("collapsed", collapsed);
  document.getElementById("appView").classList.toggle("sidebar-collapsed", collapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
}
setSidebar(localStorage.getItem("mswg_agm_sidebar_collapsed") === "true");
sidebarToggle.addEventListener("click", () => {
  const collapsed = !sidebar.classList.contains("collapsed");
  setSidebar(collapsed);
  localStorage.setItem("mswg_agm_sidebar_collapsed", String(collapsed));
});

document.getElementById("roleSelect").addEventListener("change", event => {
  localStorage.setItem("mswg_agm_local_role", event.target.value);
  const url = new URL(window.location.href);
  url.searchParams.set("role", event.target.value);
  window.location.assign(url);
});
document.getElementById("refreshBtn").addEventListener("click", loadRecords);
document.getElementById("searchInput").addEventListener("input", renderRecords);
document.getElementById("statusFilter").addEventListener("change", renderRecords);
document.getElementById("modeFilter").addEventListener("change", renderRecords);
document.getElementById("closeHistoryBtn").addEventListener("click", () => document.getElementById("historyPanel").classList.remove("open"));
document.getElementById("historyPanel").addEventListener("click", event => { if (event.target.id === "historyPanel") event.currentTarget.classList.remove("open"); });

setRoleShell();
loadRecords();
