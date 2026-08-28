"use strict";

const { HttpError } = require("./http");

const DEPARTMENT_IDS = new Set([
  "ceo-office",
  "corp-monitoring",
  "corp-governance",
  "corp-resources",
  "finance-admin",
  "it-training",
  "creative-comms",
  "prof-development"
]);

const GROUPS = Object.freeze({
  appUsers: "rr-app-users",
  departmentHeads: "rr-department-heads",
  viewersAll: "rr-viewers-all",
  accountAdmins: "rr-account-admins"
});

function parseGroups(rawGroups) {
  if (Array.isArray(rawGroups)) {
    return rawGroups.map(String).map(value => value.trim()).filter(Boolean);
  }

  if (typeof rawGroups !== "string" || !rawGroups.trim()) return [];

  const trimmed = rawGroups.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed.map(String).map(value => value.trim()).filter(Boolean);
  } catch {
    // API Gateway may serialize Cognito groups as a comma- or space-separated string.
  }

  return trimmed
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(/[\s,]+/)
    .map(value => value.replace(/^['"]|['"]$/g, "").trim())
    .filter(Boolean);
}

function getVerifiedClaims(event) {
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ||
    event?.requestContext?.authorizer?.claims;

  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new HttpError(401, "A verified Cognito session is required", "UNAUTHENTICATED");
  }

  return claims;
}

function resolveDepartmentId(claims, groups) {
  const prefix = process.env.DEPARTMENT_GROUP_PREFIX || "rr-dept-";
  const groupDepartments = groups
    .filter(group => group.startsWith(prefix))
    .map(group => group.slice(prefix.length))
    .filter(departmentId => DEPARTMENT_IDS.has(departmentId));

  const claimDepartment = claims["custom:department_id"] || claims.department_id;
  if (claimDepartment && !DEPARTMENT_IDS.has(claimDepartment)) {
    throw new HttpError(403, "The account has an invalid department assignment", "INVALID_DEPARTMENT_CLAIM");
  }

  if (groupDepartments.length > 1) {
    throw new HttpError(403, "The account belongs to more than one RR department", "AMBIGUOUS_DEPARTMENT");
  }

  if (claimDepartment && groupDepartments.length === 1 && claimDepartment !== groupDepartments[0]) {
    throw new HttpError(403, "Department claim and group membership do not match", "DEPARTMENT_MISMATCH");
  }

  const departmentId = claimDepartment || groupDepartments[0];
  if (!departmentId) {
    throw new HttpError(403, "The account has no RR department assignment", "MISSING_DEPARTMENT");
  }

  return departmentId;
}

function getIdentity(event) {
  const claims = getVerifiedClaims(event);
  const groups = parseGroups(claims["cognito:groups"]);
  const userId = claims.sub;

  if (typeof userId !== "string" || !userId.trim()) {
    throw new HttpError(401, "The verified token has no subject identifier", "INVALID_TOKEN_CLAIMS");
  }

  const hasAppAccess = [GROUPS.appUsers, GROUPS.departmentHeads, GROUPS.viewersAll]
    .some(group => groups.includes(group));

  if (!hasAppAccess) {
    throw new HttpError(403, "This account is not assigned to the Risk Register application", "APP_ACCESS_DENIED");
  }

  return Object.freeze({
    userId: userId.trim(),
    username: claims["cognito:username"] || claims.email || userId.trim(),
    departmentId: resolveDepartmentId(claims, groups),
    applicationRole: claims["custom:application_role"] || "department-user",
    groups: Object.freeze(groups),
    canViewAll: groups.includes(GROUPS.viewersAll),
    canArchive: groups.includes(GROUPS.viewersAll),
    canAdministerAccounts: groups.includes(GROUPS.accountAdmins)
  });
}

function requireFullVisibility(identity) {
  if (!identity.canViewAll) {
    throw new HttpError(403, "Full-visibility permission is required", "FULL_VISIBILITY_REQUIRED");
  }
}

function requireArchivePermission(identity) {
  if (!identity.canArchive) {
    throw new HttpError(403, "Archive permission is required", "ARCHIVE_PERMISSION_REQUIRED");
  }
}

function validateDepartmentId(departmentId) {
  if (!DEPARTMENT_IDS.has(departmentId)) {
    throw new HttpError(400, "Unknown department ID", "INVALID_DEPARTMENT");
  }
  return departmentId;
}

module.exports = {
  DEPARTMENT_IDS,
  GROUPS,
  getIdentity,
  getVerifiedClaims,
  parseGroups,
  requireArchivePermission,
  requireFullVisibility,
  validateDepartmentId
};

