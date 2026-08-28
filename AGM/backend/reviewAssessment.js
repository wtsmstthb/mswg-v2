"use strict";

const repository = require("./lib/repository");
const workflow = require("./lib/workflow");
const { getIdentity, requireReviewer } = require("./lib/auth");
const { handleError, jsonResponse, parseBody, pathParameter } = require("./lib/http");

function createReviewAssessmentHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());
  return async function handler(event) {
    try {
      const identity = getIdentity(event);
      requireReviewer(identity);
      const assessmentId = pathParameter(event, "assessmentId");
      const existing = await repo.getAssessment(assessmentId);
      const result = workflow.reviewAssessment({ existing, body: parseBody(event), identity, at: now().toISOString() });
      await repo.replaceAssessment(result.item, result.event, existing.record_version);
      return jsonResponse(200, {
        message: result.item.status === "APPROVED" ? "Assessment approved and locked" : "Assessment returned for correction",
        item: result.item
      });
    } catch (error) {
      return handleError(error, "reviewAssessment");
    }
  };
}

exports.createReviewAssessmentHandler = createReviewAssessmentHandler;
exports.handler = createReviewAssessmentHandler();
