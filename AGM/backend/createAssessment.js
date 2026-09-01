"use strict";

const repository = require("./lib/repository");
const workflow = require("./lib/workflow");
const { getIdentity, requireAssessor } = require("./lib/auth");
const { handleError, jsonResponse, parseBody } = require("./lib/http");

function createCreateAssessmentHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());
  const randomUUID = dependencies.randomUUID;
  return async function handler(event) {
    try {
      const identity = getIdentity(event);
      requireAssessor(identity);
      const result = workflow.createAssessment({
        body: parseBody(event), identity, at: now().toISOString(), assessmentId: randomUUID?.()
      });
      await repo.createAssessment(result.item, result.event);
      return jsonResponse(201, { message: "Assessment draft created", item: result.item });
    } catch (error) {
      return handleError(error, "createAssessment");
    }
  };
}

exports.createCreateAssessmentHandler = createCreateAssessmentHandler;
exports.handler = createCreateAssessmentHandler();
