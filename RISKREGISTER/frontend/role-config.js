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

  function parseJwtClaims(token){
    try {
      const payload = token.split(".")[1];
      const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(atob(normalized).split("").map(char =>
        `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`
      ).join(""));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function readLocalMockClaims(){
    if (window.APP_CONFIG?.environment !== "local") return null;
    try {
      const stored = localStorage.getItem("mswg_rr_mock_claims");
      return stored ? JSON.parse(stored) : window.APP_CONFIG.localMockClaims;
    } catch {
      return window.APP_CONFIG.localMockClaims;
    }
  }

  function normalizeGroups(raw){
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string") return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return raw.replace(/^\[/, "").replace(/\]$/, "").split(/[\s,]+/).filter(Boolean);
  }

  const token = sessionStorage.getItem("mswg_rr_id_token") || localStorage.getItem("mswg_rr_id_token");
  const claims = parseJwtClaims(token || "") || readLocalMockClaims();
  const groups = normalizeGroups(claims?.["cognito:groups"]);
  const departmentId = claims?.["custom:department_id"] || "";
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
    window.location.replace("access-denied.html");
  } else if (protectedForViewers.has(window.CURRENT_PAGE) && !context.canViewAll) {
    window.location.replace("dashboard.html");
  } else if (window.CURRENT_PAGE === "register.html" && !context.canCreate) {
    window.location.replace("dashboard.html");
  }
})();
