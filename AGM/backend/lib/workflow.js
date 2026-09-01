"use strict";

const crypto = require("crypto");
const { HttpError } = require("./http");
const { expectedVersion, text, validatePayload } = require("./validation");

const STATUS = Object.freeze({
  draft: "DRAFT",
  submitted: "SUBMITTED",
  approved: "APPROVED",
  returned: "RETURNED"
});

function requireExisting(item) {
  if (!item) throw new HttpError(404, "Assessment not found", "ASSESSMENT_NOT_FOUND");
  return item;
}

function requireCreator(item, identity) {
  if (item.created_by !== identity.userId) {
    throw new HttpError(403, "Only the original assessor may edit or submit this assessment", "CREATOR_REQUIRED");
  }
}

function assertVersion(item, body) {
  const expected = expectedVersion(body);
  if (item.record_version !== expected) {
    throw new HttpError(409, "This assessment changed in another session. Reload it before trying again.", "VERSION_CONFLICT");
  }
  return expected;
}

function recordSnapshot(item) {
  return {
    assessment_id: item.assessment_id,
    revision: item.revision,
    record_version: item.record_version,
    status: item.status,
    fields: item.fields,
    answers: item.answers,
    comments: item.comments,
    scores: item.scores,
    created_by: item.created_by,
    created_by_name: item.created_by_name,
    created_at: item.created_at,
    updated_by: item.updated_by,
    updated_by_name: item.updated_by_name,
    updated_at: item.updated_at,
    submitted_by: item.submitted_by,
    submitted_by_name: item.submitted_by_name,
    submitted_at: item.submitted_at,
    approved_by: item.approved_by,
    approved_by_name: item.approved_by_name,
    approved_at: item.approved_at,
    review_comment: item.review_comment,
    report_schema_version: 1
  };
}

function historyEvent(item, type, identity, at, details = {}) {
  return {
    assessment_id: item.assessment_id,
    event_at: `${at}#${crypto.randomUUID()}`,
    event_type: type,
    revision: item.revision,
    record_version: item.record_version,
    status: item.status,
    actor_id: identity.userId,
    actor_name: identity.username,
    details,
    snapshot: recordSnapshot(item)
  };
}

function createAssessment({ body, identity, at, assessmentId = crypto.randomUUID() }) {
  const validated = validatePayload(body);
  const item = {
    assessment_id: assessmentId,
    revision: 1,
    record_version: 1,
    status: STATUS.draft,
    ...validated,
    created_by: identity.userId,
    created_by_name: identity.username,
    created_at: at,
    updated_by: identity.userId,
    updated_by_name: identity.username,
    updated_at: at,
    report_schema_version: 1
  };
  return { item, event: historyEvent(item, "CREATED", identity, at) };
}

function saveAssessment({ existing, body, identity, at }) {
  requireExisting(existing);
  requireCreator(existing, identity);
  assertVersion(existing, body);
  if (![STATUS.draft, STATUS.returned].includes(existing.status)) {
    throw new HttpError(409, "Only draft or returned assessments can be edited", "ASSESSMENT_LOCKED");
  }
  const validated = validatePayload(body);
  const item = {
    ...existing,
    ...validated,
    record_version: existing.record_version + 1,
    updated_by: identity.userId,
    updated_by_name: identity.username,
    updated_at: at
  };
  return { item, event: historyEvent(item, "SAVED", identity, at) };
}

function submitAssessment({ existing, body, identity, at }) {
  requireExisting(existing);
  requireCreator(existing, identity);
  assertVersion(existing, body);
  if (![STATUS.draft, STATUS.returned].includes(existing.status)) {
    throw new HttpError(409, "Only draft or returned assessments can be submitted", "INVALID_STATUS_TRANSITION");
  }
  const validated = validatePayload(existing, { requireComplete: true });
  const item = {
    ...existing,
    ...validated,
    status: STATUS.submitted,
    record_version: existing.record_version + 1,
    submitted_by: identity.userId,
    submitted_by_name: identity.username,
    submitted_at: at,
    updated_by: identity.userId,
    updated_by_name: identity.username,
    updated_at: at
  };
  return { item, event: historyEvent(item, "SUBMITTED", identity, at) };
}

function reviewAssessment({ existing, body, identity, at }) {
  requireExisting(existing);
  assertVersion(existing, body);
  if (existing.status !== STATUS.submitted) {
    throw new HttpError(409, "Only a submitted assessment can be reviewed", "INVALID_STATUS_TRANSITION");
  }
  const decision = text(body.decision, "decision", 20).toLowerCase();
  const comment = text(body.comment, "comment", 5000);
  if (!new Set(["approve", "return"]).has(decision)) {
    throw new HttpError(400, "decision must be approve or return", "VALIDATION_ERROR");
  }
  if (decision === "return" && !comment) {
    throw new HttpError(400, "A return reason is required", "VALIDATION_ERROR");
  }
  const item = {
    ...existing,
    status: decision === "approve" ? STATUS.approved : STATUS.returned,
    record_version: existing.record_version + 1,
    review_comment: comment,
    updated_by: identity.userId,
    updated_by_name: identity.username,
    updated_at: at
  };
  if (decision === "approve") {
    item.approved_by = identity.userId;
    item.approved_by_name = identity.username;
    item.approved_at = at;
    item.approved_snapshot = recordSnapshot(item);
  } else {
    item.returned_by = identity.userId;
    item.returned_by_name = identity.username;
    item.returned_at = at;
  }
  const eventType = decision === "approve" ? "APPROVED" : "RETURNED";
  return { item, event: historyEvent(item, eventType, identity, at, { comment }) };
}

function reopenAssessment({ existing, body, identity, at }) {
  requireExisting(existing);
  assertVersion(existing, body);
  if (existing.status !== STATUS.approved) {
    throw new HttpError(409, "Only an approved assessment can be reopened", "INVALID_STATUS_TRANSITION");
  }
  const reason = text(body.reason, "reason", 5000);
  if (!reason) throw new HttpError(400, "A reason for reopening is required", "VALIDATION_ERROR");
  const item = {
    ...existing,
    status: STATUS.returned,
    revision: existing.revision + 1,
    record_version: existing.record_version + 1,
    review_comment: reason,
    reopened_by: identity.userId,
    reopened_by_name: identity.username,
    reopened_at: at,
    updated_by: identity.userId,
    updated_by_name: identity.username,
    updated_at: at
  };
  return { item, event: historyEvent(item, "REOPENED", identity, at, { reason }) };
}

function summary(item) {
  return {
    assessment_id: item.assessment_id,
    company: item.fields?.company || "",
    meeting_date: item.fields?.date || "",
    meeting_mode: item.fields?.mode || "",
    meeting_type: item.fields?.type || "",
    status: item.status,
    score: item.scores?.percentage ?? null,
    revision: item.revision,
    record_version: item.record_version,
    created_by: item.created_by,
    created_by_name: item.created_by_name,
    updated_at: item.updated_at,
    submitted_at: item.submitted_at || null,
    approved_at: item.approved_at || null
  };
}

module.exports = {
  STATUS,
  assertVersion,
  createAssessment,
  historyEvent,
  recordSnapshot,
  reopenAssessment,
  requireCreator,
  requireExisting,
  reviewAssessment,
  saveAssessment,
  submitAssessment,
  summary
};
