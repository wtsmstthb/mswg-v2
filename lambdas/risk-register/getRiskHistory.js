"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { HttpError, getPathParameter, handleError, jsonResponse } = require("./lib/http");

function createGetRiskHistoryHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;

  return async function getRiskHistoryHandler(event) {
    try {
      const identity = getIdentity(event);
      const riskId = getPathParameter(event, "riskId", "risk_id");
      if (!riskId) throw new HttpError(400, "riskId path parameter is required", "VALIDATION_ERROR");

      const items = await repo.listRiskHistory(riskId);
      const visibleItems = identity.canViewAll
        ? items
        : items.filter(item => item.dept_id === identity.departmentId);

      if (items.length && !visibleItems.length) {
        throw new HttpError(404, "Risk history not found", "HISTORY_NOT_FOUND");
      }

      return jsonResponse(200, { count: visibleItems.length, items: visibleItems });
    } catch (error) {
      return handleError(error, "getRiskHistory");
    }
  };
}

exports.createGetRiskHistoryHandler = createGetRiskHistoryHandler;
exports.handler = createGetRiskHistoryHandler();
