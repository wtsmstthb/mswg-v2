"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { HttpError, getPathParameter, handleError, jsonResponse, parseBody } = require("./lib/http");
const { computeRating, validateExpectedVersion, validateUpdateRisk } = require("./lib/validation");

function createUpdateRiskHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());

  return async function updateRiskHandler(event) {
    try {
      const identity = getIdentity(event);
      const riskId = getPathParameter(event, "riskId", "risk_id");
      if (!riskId) throw new HttpError(400, "riskId path parameter is required", "VALIDATION_ERROR");

      const body = parseBody(event);
      const changes = validateUpdateRisk(body);
      const requestedVersion = validateExpectedVersion(body.expected_version);
      const existing = await repo.getRisk(identity.departmentId, riskId);

      if (!existing) throw new HttpError(404, "Risk not found", "RISK_NOT_FOUND");
      if (existing.status === "archived") {
        throw new HttpError(409, "Archived risks cannot be updated", "RISK_ARCHIVED");
      }
      if (existing.created_by !== identity.userId) {
        throw new HttpError(403, "Only the creator of this risk can update it", "CREATOR_REQUIRED");
      }

      const expectedVersion = requestedVersion || existing.record_version || 1;
      if ((existing.record_version || 1) !== expectedVersion) {
        throw new HttpError(409, "This risk has changed since it was opened. Reload it before saving.", "VERSION_CONFLICT");
      }

      if (changes.element !== undefined) changes.title = changes.element;
      if (changes.statement !== undefined) changes.description = changes.statement;
      if (changes.inherent_impact !== undefined) changes.impact = changes.inherent_impact;
      if (changes.inherent_likelihood !== undefined) changes.likelihood = changes.inherent_likelihood;
      const merged = { ...existing, ...changes };
      if ((changes.inherent_impact !== undefined || changes.inherent_likelihood !== undefined) && merged.inherent_impact && merged.inherent_likelihood) {
        changes.inherent_rating = computeRating(merged.inherent_impact, merged.inherent_likelihood);
      }
      if ((changes.residual_impact !== undefined || changes.residual_likelihood !== undefined) && merged.residual_impact && merged.residual_likelihood) {
        changes.residual_rating = computeRating(merged.residual_impact, merged.residual_likelihood);
      }
      for (const field of Object.keys(changes)) {
        if (changes[field] === existing[field]) delete changes[field];
      }
      if (!Object.keys(changes).length) {
        throw new HttpError(400, "No risk values have changed", "NO_CHANGES");
      }

      const result = await repo.updateRiskWithHistory({
        existing,
        changes,
        expectedVersion,
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
