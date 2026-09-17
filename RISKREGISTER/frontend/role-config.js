// UI permissions come from the signed-in user's token claims. This affects only
// presentation; every API operation is independently authorized by the backend.
(function configureApplicationIdentity(){
  "use strict";

  const DEPARTMENTS = {
    "ceo-office": "CEO office",
    "corp-monitoring": "Corporate monitoring",
    "corp-governance": "Corporate governance",
    "corp-resources": "Corporate resources",
    "finance-admin": "Finance and admin",
    "it-training": "IT and training",
    "creative-comms": "Creative communications",
    "prof-development": "Professional development"
  };

  function normalizeGroups(raw){
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string") return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return raw.replace(/^\[/, "").replace(/\]$/, "").split(/[\s,]+/).filter(Boolean);
  }

  const claims = window.MSWG_SESSION.readClaims();
  const groups = normalizeGroups(claims?.["cognito:groups"]);
  const departmentId = claims?.["custom:department_id"] || groups.find(group => group.startsWith("rr-dept-"))?.slice(8) || "";
  const canViewAll = groups.includes("rr-viewers-all");
  const hasAppAccess = groups.some(group =>
    ["rr-app-users", "rr-department-heads", "rr-viewers-all"].includes(group)
  );

  const context = Object.freeze({
    claims: claims || {},
    userId: claims?.sub || "",
    userName: claims?.name || claims?.["cognito:username"] || claims?.email || "User",
    departmentId,
    departmentLabel: DEPARTMENTS[departmentId] || "Unassigned department",
    groups: Object.freeze(groups),
    isAuthenticated: Boolean(claims),
    hasAppAccess,
    isDepartmentHead: groups.includes("rr-department-heads"),
    canCreate: hasAppAccess,
    canUpdateOwn: hasAppAccess,
    canViewAll,
    canArchive: canViewAll,
    canRestore: false
  });

  window.APP_CONTEXT = context;
  window.DEPARTMENT_LABELS = Object.freeze({ ...DEPARTMENTS });
  window.USER_NAME = context.userName;
  window.DEPT_LABEL = context.departmentLabel;
  window.IS_VIEWER = context.canViewAll;
  window.IS_DEPT_HEAD = context.isDepartmentHead;
  window.PERMISSIONS = context;

  const protectedForViewers = new Set(["org-overview.html", "archived.html"]);
  if ((!context.isAuthenticated || !context.hasAppAccess) && window.CURRENT_PAGE !== "access-denied.html") {
    window.location.replace(context.isAuthenticated ? "access-denied.html" : "login.html");
  } else if (protectedForViewers.has(window.CURRENT_PAGE) && !context.canViewAll) {
    window.location.replace("dashboard.html");
  } else if (window.CURRENT_PAGE === "register.html" && !context.canCreate) {
    window.location.replace("dashboard.html");
  }
})();
