"use strict";

const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { handleError, jsonResponse } = require("./lib/http");

function createGetRisksByDeptHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;

  return async function getRisksByDeptHandler(event) {
    try {
      const identity = getIdentity(event);
      const items = await repo.listDepartmentRisks(identity.departmentId);
      const activeItems = items.filter(item => item.status !== "archived");

      return jsonResponse(200, {
        department_id: identity.departmentId,
        count: activeItems.length,
        items: activeItems
      });
    } catch (error) {
      return handleError(error, "getRisksByDept");
    }
  };
}

exports.createGetRisksByDeptHandler = createGetRisksByDeptHandler;
exports.handler = createGetRisksByDeptHandler();
