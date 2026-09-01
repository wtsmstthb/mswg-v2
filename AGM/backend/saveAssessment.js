"use strict";

const repository = require("./lib/repository");
const workflow = require("./lib/workflow");
const { getIdentity, requireAssessor } = require("./lib/auth");
const { handleError, jsonResponse, parseBody, pathParameter } = require("./lib/http");

function createSaveAssessmentHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());
  return async function handler(event) {
    try {
      const identity = getIdentity(event);
      requireAssessor(identity);
      const assessmentId = pathParameter(event, "assessmentId");
      const existing = await repo.getAssessment(assessmentId);
      const result = workflow.saveAssessment({ existing, body: parseBody(event), identity, at: now().toISOString() });
      await repo.replaceAssessment(result.item, result.event, existing.record_version);
      return jsonResponse(200, { message: "Draft saved", item: result.item });
    } catch (error) {
      return handleError(error, "saveAssessment");
    }
  };
}

exports.createSaveAssessmentHandler = createSaveAssessmentHandler;
exports.handler = createSaveAssessmentHandler();
