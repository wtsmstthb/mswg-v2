"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { HttpError, getPathParameter, handleError, jsonResponse, parseBody } = require("./lib/http");
const { validateUpdateRisk } = require("./lib/validation");

function createUpdateRiskHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());

  return async function updateRiskHandler(event) {
    try {
      const identity = getIdentity(event);
      const riskId = getPathParameter(event, "riskId", "risk_id");
      if (!riskId) throw new HttpError(400, "riskId path parameter is required", "VALIDATION_ERROR");

      const changes = validateUpdateRisk(parseBody(event));
      const existing = await repo.getRisk(identity.departmentId, riskId);

      if (!existing) throw new HttpError(404, "Risk not found", "RISK_NOT_FOUND");
      if (existing.status === "archived") {
        throw new HttpError(409, "Archived risks cannot be updated", "RISK_ARCHIVED");
      }
      if (existing.created_by !== identity.userId) {
        throw new HttpError(403, "Only the creator of this risk can update it", "CREATOR_REQUIRED");
      }

      const result = await repo.updateRiskWithHistory({
        existing,
        changes,
        userId: identity.userId,
        changedAt: now().toISOString()
      });

      return jsonResponse(200, {
        message: "Risk updated and audit history recorded",
        item: result.item
      });
    } catch (error) {
      return handleError(error, "updateRisk");
    }
  };
}

exports.createUpdateRiskHandler = createUpdateRiskHandler;
exports.handler = createUpdateRiskHandler();
