// common.js
// Shared data model, storage helpers, and rating logic for the MSWG risk register.
// All pages load this file so the DATA array and rating logic live in exactly one place.

const RATING_SCORE = { "Low": 1, "Medium Low": 2, "Medium High": 3, "High": 4 };
const STORAGE_KEY = "mswg_rr_added_risks";

function ratingClass(rating){
  return {
    "High": "high",
    "Medium High": "medhigh",
    "Medium Low": "medlow",
    "Low": "low"
  }[rating] || "";
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

const DATA = [
  {
    no: 1, quarter: "Q2", element: "Reputational",
    statement: "MSWG's independence and credibility are at risk if perceived as biased or influenced by specific stakeholders, potentially damaging its role as an impartial advocate.",
    inherentImpact: "High", inherentLikelihood: "High", inherentRating: "High",
    controlMethods: "Implement transparent voting policy.\nConduct independent reviews of assessments.\nManage conflict of interest (board members, corporate monitoring team).\nEngage diverse stakeholders regularly.\nStrengthen public communication on MSWG's objectivity.\nDevelop proactive media engagement strategies.\nNo misinformation and incompetencies of analysts.\nImmediate response mechanism to manage the circulation of misinformation.",
    addressedRootCause: "Partially", controlDocumented: "Yes", appliedConsistently: "Yes",
    controlEffectiveness: "Effective", riskTrend: "Stable",
    residualImpact: "High", residualLikelihood: "High", residualRating: "High", status: "active"
  },
  {
    no: 2, quarter: "Q2", element: "Financial",
    statement: "MSWG's reliance on the CMDF grant risks its independence if alternative funding sources are required, potentially compromising impartiality.",
    inherentImpact: "High", inherentLikelihood: "High", inherentRating: "High",
    controlMethods: "Implement programmes under Vision 28 for financial sustainability.\nAchieve 75:25 funding ratio from CMDF under Vision 28.\nDiversify income streams while maintaining independence.",
    addressedRootCause: "Yes", controlDocumented: "Partially", appliedConsistently: "Partially",
    controlEffectiveness: "Partially Effective", riskTrend: "Stable",
    residualImpact: "High", residualLikelihood: "High", residualRating: "High", status: "active"
  },
  {
    no: 3, quarter: "Q2", element: "Well-being and Security Risks for Analysts",
    statement: "Analysts may face personal and professional retaliation due to their critical corporate governance work.",
    inherentImpact: "High", inherentLikelihood: "Low", inherentRating: "Medium Low",
    controlMethods: "Ensure issues raised are objective, based on publicly available information and not personal.\nOffer training on personal security and crisis management.\nProvide legal counsel for analysts under threat.\nTake legal countermeasures when necessary.",
    addressedRootCause: "Partially", controlDocumented: "Yes", appliedConsistently: "Partially",
    controlEffectiveness: "Not Effective", riskTrend: "Stable",
    residualImpact: "High", residualLikelihood: "Low", residualRating: "Medium Low", status: "active"
  },
  {
    no: 4, quarter: "Q2", element: "Legal",
    statement: "MSWG may face lawsuits over commentaries or public statements.",
    inherentImpact: "High", inherentLikelihood: "Low", inherentRating: "Medium Low",
    controlMethods: "Restrict public commentary to the CEO representing the views of MSWG, not individual.\nEnsure all comments are based on publicly available information.",
    addressedRootCause: "Yes", controlDocumented: "Yes", appliedConsistently: "Yes",
    controlEffectiveness: "Effective", riskTrend: "Stable",
    residualImpact: "High", residualLikelihood: "Low", residualRating: "Medium Low", status: "active"
  },
  {
    no: 5, quarter: "Q2", element: "Human Resource",
    statement: "Challenges in recruiting and retaining top analysts due to competitive compensation levels.",
    inherentImpact: "High", inherentLikelihood: "Low", inherentRating: "Medium Low",
    controlMethods: "Enhance non-financial employee value propositions.\nOffer professional growth opportunities and flexible work arrangements.\nRecognise high performance and mentorship.",
    addressedRootCause: "Partially", controlDocumented: "Yes", appliedConsistently: "Yes",
    controlEffectiveness: "Partially Effective", riskTrend: "Stable",
    residualImpact: "High", residualLikelihood: "Low", residualRating: "Medium Low", status: "active"
  },
  {
    no: 6, quarter: "Q2", element: "Operational and Cybersecurity",
    statement: "Operational disruptions or cyberattacks may hinder MSWG's effectiveness and credibility.",
    inherentImpact: "High", inherentLikelihood: "High", inherentRating: "High",
    controlMethods: "Streamline internal workflows and invest in automation.\nImplement robust cybersecurity protocols and employee training.\nConduct regular cybersecurity audits and consult external experts.\nEnsure all software updates are current.\nRestricting WhatsApp access within the MSWG network.\nMigrating all internal communication from WhatsApp to Microsoft Teams.",
    addressedRootCause: "No", controlDocumented: "Yes", appliedConsistently: "Partially",
    controlEffectiveness: "Not Effective", riskTrend: "Increasing",
    residualImpact: "High", residualLikelihood: "High", residualRating: "High", status: "active"
  },
  {
    no: 7, quarter: "Q2", element: "Compliance",
    statement: "Non-compliance with regulations could lead to sanctions or reputational damage.",
    inherentImpact: "Medium Low", inherentLikelihood: "Medium Low", inherentRating: "Medium Low",
    controlMethods: "Monitor regulatory changes and update policies accordingly.\nEstablish a robust compliance framework and staff training.",
    addressedRootCause: "Partially", controlDocumented: "Yes", appliedConsistently: "Yes",
    controlEffectiveness: "Partially Effective", riskTrend: "Stable",
    residualImpact: "Medium Low", residualLikelihood: "Medium Low", residualRating: "Medium Low", status: "active"
  },
  {
    no: 8, quarter: "Q2", element: "Dilution of Presence and Influence",
    statement: "MSWG's influence in shareholder advocacy may weaken amid a growing number of competing bodies and initiatives.",
    inherentImpact: "Medium High", inherentLikelihood: "Medium Low", inherentRating: "Medium High",
    controlMethods: "Strengthen strategic partnerships with regulators and industry bodies.\nIncrease visibility through thought leadership and public engagement.",
    addressedRootCause: "Partially", controlDocumented: "Partially", appliedConsistently: "Partially",
    controlEffectiveness: "Partially Effective", riskTrend: "Stable",
    residualImpact: "Medium High", residualLikelihood: "Medium Low", residualRating: "Medium High", status: "active"
  }
];

function loadAddedRisks(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveAddedRisks(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getAllData(){
  const added = loadAddedRisks();
  const addedNos = new Set(added.map(r => r.no));
  const baseNotOverridden = DATA.filter(r => !addedNos.has(r.no));
  return [...baseNotOverridden, ...added];
}

function nextRiskNo(){
  const all = getAllData();
  return all.length ? Math.max(...all.map(d => d.no)) + 1 : 1;
}

function addRisk(risk){
  const added = loadAddedRisks();
  added.push(risk);
  saveAddedRisks(added);
}

function archiveRisk(no){
  const added = loadAddedRisks();
  const idx = added.findIndex(r => r.no === no);
  if (idx !== -1) {
    added[idx].status = "archived";
    saveAddedRisks(added);
    return true;
  }
  // Base DATA risks are read-only in this prototype (no backend yet),
  // so archiving one copies it into localStorage as an archived override.
  const base = DATA.find(r => r.no === no);
  if (base) {
    const copy = { ...base, status: "archived" };
    added.push(copy);
    saveAddedRisks(added);
    return true;
  }
  return false;
}
