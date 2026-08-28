"use strict";

const repository = require("./lib/repository");
const { getIdentity, requireArchivePermission, validateDepartmentId } = require("./lib/auth");
const { HttpError, getPathParameter, handleError, jsonResponse } = require("./lib/http");

function createArchiveRiskHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());

  return async function archiveRiskHandler(event) {
    try {
      const identity = getIdentity(event);
      requireArchivePermission(identity);

      const departmentId = validateDepartmentId(
        getPathParameter(event, "departmentId", "dept_id") || ""
      );
      const riskId = getPathParameter(event, "riskId", "risk_id");
      if (!riskId) throw new HttpError(400, "riskId path parameter is required", "VALIDATION_ERROR");

      const existing = await repo.getRisk(departmentId, riskId);
      if (!existing) throw new HttpError(404, "Risk not found", "RISK_NOT_FOUND");
      if (existing.status === "archived") {
        throw new HttpError(409, "Risk is already archived", "RISK_ALREADY_ARCHIVED");
      }

      const item = await repo.archiveRisk({
        departmentId,
        riskId,
        userId: identity.userId,
        archivedAt: now().toISOString()
      });

      return jsonResponse(200, { message: "Risk archived", item });
    } catch (error) {
      return handleError(error, "archiveRisk");
    }
  };
}

exports.createArchiveRiskHandler = createArchiveRiskHandler;
exports.handler = createArchiveRiskHandler();
