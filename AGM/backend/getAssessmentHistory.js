"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { handleError, jsonResponse, pathParameter } = require("./lib/http");
const { requireExisting } = require("./lib/workflow");

function createGetAssessmentHistoryHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  return async function handler(event) {
    try {
      getIdentity(event);
      const assessmentId = pathParameter(event, "assessmentId");
      requireExisting(await repo.getAssessment(assessmentId));
      const items = await repo.listHistory(assessmentId);
      return jsonResponse(200, { count: items.length, items });
    } catch (error) {
      return handleError(error, "getAssessmentHistory");
    }
  };
}

exports.createGetAssessmentHistoryHandler = createGetAssessmentHistoryHandler;
exports.handler = createGetAssessmentHistoryHandler();
