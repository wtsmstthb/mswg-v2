"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { handleError, jsonResponse } = require("./lib/http");
const { summary } = require("./lib/workflow");

function permissions(item, identity) {
  const isCreator = item.created_by === identity.userId;
  return {
    can_edit: identity.canAssess && isCreator && ["DRAFT", "RETURNED"].includes(item.status),
    can_submit: identity.canAssess && isCreator && ["DRAFT", "RETURNED"].includes(item.status),
    can_review: identity.canReview && item.status === "SUBMITTED",
    can_reopen: identity.canReview && item.status === "APPROVED"
  };
}

function createListAssessmentsHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  return async function handler(event) {
    try {
      const identity = getIdentity(event);
      const items = await repo.listAssessments();
      return jsonResponse(200, {
        count: items.length,
        items: items.map(item => ({ ...summary(item), permissions: permissions(item, identity) }))
      });
    } catch (error) {
      return handleError(error, "listAssessments");
    }
  };
}

exports.createListAssessmentsHandler = createListAssessmentsHandler;
exports.handler = createListAssessmentsHandler();
