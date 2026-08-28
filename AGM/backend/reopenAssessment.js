"use strict";

const repository = require("./lib/repository");
const workflow = require("./lib/workflow");
const { getIdentity, requireReviewer } = require("./lib/auth");
const { handleError, jsonResponse, parseBody, pathParameter } = require("./lib/http");

function createReopenAssessmentHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());
  return async function handler(event) {
    try {
      const identity = getIdentity(event);
      requireReviewer(identity);
      const assessmentId = pathParameter(event, "assessmentId");
      const existing = await repo.getAssessment(assessmentId);
      const result = workflow.reopenAssessment({ existing, body: parseBody(event), identity, at: now().toISOString() });
      await repo.replaceAssessment(result.item, result.event, existing.record_version);
      return jsonResponse(200, { message: "Approved assessment reopened as a new revision", item: result.item });
    } catch (error) {
      return handleError(error, "reopenAssessment");
    }
  };
}

exports.createReopenAssessmentHandler = createReopenAssessmentHandler;
exports.handler = createReopenAssessmentHandler();
