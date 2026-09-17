"use strict";

const { HttpError } = require("./http");

const DEPARTMENT_IDS = new Set([
  "ceo-office", "corp-monitoring", "corp-governance", "corp-resources",
  "finance-admin", "it-training", "creative-comms", "prof-development"
]);

function resolveDepartment(claims, groups) {
  const departments = [...new Set(groups.filter(group => group.startsWith("rr-dept-")).map(group => group.slice(8)))];
  const claim = claims["custom:department_id"] || claims.department_id;
  if ((claim && !DEPARTMENT_IDS.has(claim)) || departments.some(id => !DEPARTMENT_IDS.has(id))) {
    throw new HttpError(403, "Invalid department assignment", "INVALID_DEPARTMENT_CLAIM");
  }
  if (departments.length > 1 || (claim && departments.length && departments[0] !== claim)) {
    throw new HttpError(403, "Conflicting department assignments", "DEPARTMENT_MISMATCH");
  }
  return claim || departments[0] || "";
}

const GROUPS = Object.freeze({
  appUsers: "agm-app-users",
  assessors: "agm-assessors",
  reviewers: "agm-reviewers"
});

function parseGroups(value) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map(item => item.trim()).filter(Boolean);
  } catch {
    // API Gateway may serialize Cognito groups as a comma-separated string.
  }
  return value.replace(/^\[/, "").replace(/\]$/, "").split(/[\s,]+/)
    .map(item => item.replace(/^['"]|['"]$/g, "").trim()).filter(Boolean);
}

function getIdentity(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || event?.requestContext?.authorizer?.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new HttpError(401, "A verified Cognito session is required", "UNAUTHENTICATED");
  }
  const userId = typeof claims.sub === "string" ? claims.sub.trim() : "";
  if (!userId) throw new HttpError(401, "The verified token has no subject identifier", "INVALID_TOKEN_CLAIMS");

  const groups = parseGroups(claims["cognito:groups"]);
  const canAssess = groups.includes(GROUPS.assessors);
  const canReview = groups.includes(GROUPS.reviewers);
  const hasAccess = groups.includes(GROUPS.appUsers) && (canAssess || canReview);
  if (!hasAccess) {
    throw new HttpError(403, "This account is not assigned to Conduct of AGM", "APP_ACCESS_DENIED");
  }

  return Object.freeze({
    userId,
    username: claims.name || claims["cognito:username"] || claims.email || userId,
    departmentId: resolveDepartment(claims, groups),
    groups: Object.freeze(groups),
    canAssess,
    canReview
  });
}

function requireAssessor(identity) {
  if (!identity.canAssess || identity.departmentId !== "corp-monitoring") {
    throw new HttpError(403, "A Corporate Monitoring assessor role is required", "ASSESSOR_REQUIRED");
  }
}

function requireReviewer(identity) {
  if (!identity.canReview) {
    throw new HttpError(403, "An AGM HOD reviewer role is required", "REVIEWER_REQUIRED");
  }
}

module.exports = { GROUPS, getIdentity, parseGroups, requireAssessor, requireReviewer };
