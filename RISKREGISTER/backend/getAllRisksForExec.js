"use strict";

const repository = require("./lib/repository");
const { getIdentity, requireFullVisibility, validateDepartmentId } = require("./lib/auth");
const {
  getBooleanQueryParameter,
  getQueryParameter,
  handleError,
  jsonResponse
} = require("./lib/http");

function createGetAllRisksForExecHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;

  return async function getAllRisksForExecHandler(event) {
    try {
      const identity = getIdentity(event);
      requireFullVisibility(identity);

      const requestedDepartment = getQueryParameter(event, "departmentId", "dept_id");
      const departmentId = requestedDepartment ? validateDepartmentId(requestedDepartment) : undefined;
      const includeArchived = getBooleanQueryParameter(event, "includeArchived", false);
      const items = await repo.listAllRisks(departmentId);
      const visibleItems = includeArchived
        ? items
        : items.filter(item => item.status !== "archived");

      return jsonResponse(200, {
        count: visibleItems.length,
        department_id: departmentId || null,
        include_archived: includeArchived,
        items: visibleItems
      });
    } catch (error) {
      return handleError(error, "getAllRisksForExec");
    }
  };
}

exports.createGetAllRisksForExecHandler = createGetAllRisksForExecHandler;
exports.handler = createGetAllRisksForExecHandler();
