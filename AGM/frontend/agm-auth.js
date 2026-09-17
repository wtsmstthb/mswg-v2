/* UI identity comes from the current Cognito session, never a role selector. */
(() => {
  const claims = window.MSWG_SESSION.readClaims();
  const groups = window.MSWG_SESSION.groups(claims);
  const departmentId = claims?.["custom:department_id"] || groups.find(group => group.startsWith("rr-dept-"))?.slice(8) || "";
  const hasAccess = groups.includes("agm-app-users");
  const canAssess = hasAccess && groups.includes("agm-assessors") && departmentId === "corp-monitoring";
  const canReview = hasAccess && groups.includes("agm-reviewers");
  window.AGM_CONTEXT = Object.freeze({
    userName: claims?.name || claims?.["cognito:username"] || claims?.email || "User",
    canAssess, canReview
  });
  if (!claims) window.location.replace("../../RISKREGISTER/frontend/login.html");
  else if (!canAssess && !canReview) window.location.replace("../../RISKREGISTER/frontend/access-denied.html");
  window.renderAgmIdentity = () => {
    const identity = window.AGM_CONTEXT;
    document.body.classList.toggle("hod-mode", identity.canReview);
    const card = document.querySelector(".user-card");
    if (card) {
      card.querySelector("strong").textContent = identity.userName;
      card.querySelector("span").textContent = identity.canReview ? "HOD reviewer" : identity.canAssess ? "Assessor" : "Access required";
    }
  };
})();
