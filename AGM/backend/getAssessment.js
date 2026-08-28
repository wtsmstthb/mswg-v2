"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { handleError, jsonResponse, pathParameter } = require("./lib/http");
const { requireExisting } = require("./lib/workflow");

function itemPermissions(item, identity) {
  const isCreator = item.created_by === identity.userId;
  return {
    can_edit: identity.canAssess && isCreator && ["DRAFT", "RETURNED"].includes(item.status),
    can_submit: identity.canAssess && isCreator && ["DRAFT", "RETURNED"].includes(item.status),
    can_review: identity.canReview && item.status === "SUBMITTED",
    can_reopen: identity.canReview && item.status === "APPROVED"
  };
}

function createGetAssessmentHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  return async function handler(event) {
    try {
      const identity = getIdentity(event);
      const item = requireExisting(await repo.getAssessment(pathParameter(event, "assessmentId")));
      return jsonResponse(200, { item, permissions: itemPermissions(item, identity) });
    } catch (error) {
      return handleError(error, "getAssessment");
    }
  };
}

exports.createGetAssessmentHandler = createGetAssessmentHandler;
exports.handler = createGetAssessmentHandler();
