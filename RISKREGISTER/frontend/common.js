// Shared Risk Register model. Current records live in DynamoDB; this file keeps
// only the current page's in-memory view and maps API fields to the existing UI.

const RATING_SCORE = Object.freeze({ "Low": 1, "Medium Low": 2, "Medium High": 3, "High": 4 });
const RISK_STATE = { department: [], organization: [], loaded: false };

function ratingClass(rating){
  return { "High": "high", "Medium High": "medhigh", "Medium Low": "medlow", "Low": "low" }[rating] || "";
}

function bucketFromScore(score){
  if (score <= 3) return "low";
  if (score <= 5) return "medlow";
  if (score <= 7) return "medhigh";
  return "high";
}

function labelFromBucket(bucket){
  return { high: "High", medhigh: "Medium High", medlow: "Medium Low", low: "Low" }[bucket];
}

function computeRating(impact, likelihood){
  const score = RATING_SCORE[impact] + RATING_SCORE[likelihood];
  return labelFromBucket(bucketFromScore(score));
}

function trendClass(trend){
  if (trend === "Increasing") return "up";
  if (trend === "Decreasing") return "down";
  return "stable";
}

function trendArrow(trend){
  if (trend === "Increasing") return "Increasing (up)";
  if (trend === "Decreasing") return "Decreasing (down)";
  return "Stable";
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function formatDateTime(value){
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? escapeHtml(value) : new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium", timeStyle: "short"
  }).format(date);
}

function mapRisk(item, index = 0){
  const fallbackId = String(item.risk_id || index + 1).toUpperCase();
  const inherentImpact = item.inherent_impact || item.impact || "Low";
  const inherentLikelihood = item.inherent_likelihood || item.likelihood || "Low";
  const residualImpact = item.residual_impact || item.impact || "Low";
  const residualLikelihood = item.residual_likelihood || item.likelihood || "Low";
  return {
    no: item.risk_reference || `RR-${fallbackId.slice(0, 8)}-${fallbackId.slice(-4)}`,
    riskId: item.risk_id,
    deptId: item.dept_id,
    quarter: item.quarter || "—",
    year: item.year,
    element: item.element || item.title || "Untitled risk",
    statement: item.statement || item.description || "",
    inherentImpact,
    inherentLikelihood,
    inherentRating: item.inherent_rating || computeRating(inherentImpact, inherentLikelihood),
    controlMethods: item.control_methods || "",
    addressedRootCause: item.addressed_root_cause || "Partially",
    controlDocumented: item.control_documented || "Partially",
    appliedConsistently: item.applied_consistently || "Partially",
    controlEffectiveness: item.control_effectiveness || "Partially Effective",
    riskTrend: item.risk_trend || "Stable",
    residualImpact,
    residualLikelihood,
    residualRating: item.residual_rating || computeRating(residualImpact, residualLikelihood),
    status: item.status || "active",
    createdBy: item.created_by,
    createdByName: item.created_by_name || item.created_by || "—",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    archivedAt: item.archived_at,
    archivedBy: item.archived_by,
    recordVersion: item.record_version || 1,
    raw: item
  };
}

function sortRisks(items){
  return [...items].sort((left, right) =>
    String(right.updatedAt || right.createdAt || "").localeCompare(String(left.updatedAt || left.createdAt || ""))
  );
}

async function loadDepartmentRisks(){
  const payload = await window.RISK_API.listMine();
  RISK_STATE.department = sortRisks((payload.items || []).map(mapRisk));
  RISK_STATE.loaded = true;
  return RISK_STATE.department;
}

async function loadOrganizationRisks(options = {}){
  if (!window.APP_CONTEXT.canViewAll) return loadDepartmentRisks();
  const payload = await window.RISK_API.listAll(options);
  RISK_STATE.organization = sortRisks((payload.items || []).map(mapRisk));
  RISK_STATE.loaded = true;
  return RISK_STATE.organization;
}

function getDepartmentData(){ return RISK_STATE.department; }
function getOrganizationData(){ return RISK_STATE.organization; }
function getAllData(){ return RISK_STATE.department; }

function riskElementFromForm(){
  const selection = document.getElementById("fElement").value;
  const custom = document.getElementById("fElementCustom");
  return selection === "__custom__" ? custom.value.trim() : selection.trim();
}

function setRiskElementField(value){
  const select = document.getElementById("fElement");
  const custom = document.getElementById("fElementCustom");
  const matchingOption = [...select.options].some(option => option.value === value);
  select.value = matchingOption ? value : "__custom__";
  custom.value = matchingOption ? "" : value;
  custom.hidden = matchingOption;
  custom.required = !matchingOption;
}

function configureRiskElementField(){
  const select = document.getElementById("fElement");
  const custom = document.getElementById("fElementCustom");
  const sync = () => {
    const isCustom = select.value === "__custom__";
    custom.hidden = !isCustom;
    custom.required = isCustom;
    if (isCustom) custom.focus();
  };
  select.addEventListener("change", sync);
  sync();
}

function riskPayloadFromForm(){
  return {
    quarter: document.getElementById("fQuarter").value.trim().toUpperCase(),
    element: riskElementFromForm(),
    statement: document.getElementById("fStatement").value.trim(),
    inherent_impact: document.getElementById("fInherentImpact").value,
    inherent_likelihood: document.getElementById("fInherentLikelihood").value,
    control_methods: document.getElementById("fControlMethods").value.trim(),
    addressed_root_cause: document.getElementById("fRootCause").value,
    control_documented: document.getElementById("fDocumented").value,
    applied_consistently: document.getElementById("fConsistent").value,
    control_effectiveness: document.getElementById("fEffectiveness").value,
    risk_trend: document.getElementById("fTrend").value,
    residual_impact: document.getElementById("fResidualImpact").value,
    residual_likelihood: document.getElementById("fResidualLikelihood").value
  };
}

function fillRiskForm(risk){
  document.getElementById("fQuarter").value = risk.quarter;
  setRiskElementField(risk.element);
  document.getElementById("fStatement").value = risk.statement;
  document.getElementById("fInherentImpact").value = risk.inherentImpact;
  document.getElementById("fInherentLikelihood").value = risk.inherentLikelihood;
  document.getElementById("fControlMethods").value = risk.controlMethods;
  document.getElementById("fRootCause").value = risk.addressedRootCause;
  document.getElementById("fDocumented").value = risk.controlDocumented;
  document.getElementById("fConsistent").value = risk.appliedConsistently;
  document.getElementById("fEffectiveness").value = risk.controlEffectiveness;
  document.getElementById("fTrend").value = risk.riskTrend;
  document.getElementById("fResidualImpact").value = risk.residualImpact;
  document.getElementById("fResidualLikelihood").value = risk.residualLikelihood;
}

async function addRisk(risk){ return window.RISK_API.create(risk); }
async function updateRisk(riskId, risk){ return window.RISK_API.update(riskId, risk); }
async function archiveRisk(departmentId, riskId){ return window.RISK_API.archive(departmentId, riskId); }
async function getRiskHistory(riskId){ return window.RISK_API.history(riskId); }

function setPageNotice(message, type = "info"){
  let notice = document.getElementById("pageNotice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "pageNotice";
    const content = document.querySelector(".page-content") || document.querySelector(".main") || document.body;
    content.insertBefore(notice, content.firstChild);
  }
  notice.className = `page-notice ${type}`;
  notice.textContent = message;
  notice.hidden = !message;
}

function clearPageNotice(){ setPageNotice(""); }

function setButtonBusy(button, busy, busyLabel = "Saving…"){
  if (!button) return;
  if (busy) {
    button.dataset.normalLabel = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.normalLabel || button.textContent;
    button.disabled = false;
  }
}

function formatFieldName(field){
  return String(field || "").replace(/_/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}
