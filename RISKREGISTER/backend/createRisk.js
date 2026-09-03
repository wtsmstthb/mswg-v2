"use strict";

const crypto = require("crypto");
const repository = require("./lib/repository");
const { getIdentity } = require("./lib/auth");
const { handleError, jsonResponse, parseBody } = require("./lib/http");
const { validateCreateRisk } = require("./lib/validation");

function getQuarterAndYear(date) {
  return {
    quarter: `Q${Math.floor(date.getUTCMonth() / 3) + 1}`,
    year: date.getUTCFullYear()
  };
}

function createCreateRiskHandler(dependencies = {}) {
  const repo = dependencies.repository || repository;
  const now = dependencies.now || (() => new Date());
  const randomUUID = dependencies.randomUUID || crypto.randomUUID;

  return async function createRiskHandler(event) {
    try {
      const identity = getIdentity(event);
      const input = validateCreateRisk(parseBody(event));
      const currentTime = now();
      const timestamp = currentTime.toISOString();
      const automaticPeriod = getQuarterAndYear(currentTime);
      const quarter = input.quarter || automaticPeriod.quarter;
      delete input.quarter;
      const riskId = randomUUID();

      const item = {
        dept_id: identity.departmentId,
        risk_id: riskId,
        risk_reference: `RR-${automaticPeriod.year}-${riskId.slice(0, 8).toUpperCase()}`,
        created_by: identity.userId,
        created_by_name: identity.displayName,
        ...input,
        quarter,
        year: automaticPeriod.year,
        status: "active",
        record_version: 1,
        created_at: timestamp,
        updated_at: timestamp
      };

      await repo.createRisk(item);
      return jsonResponse(201, { message: "Risk created", item });
    } catch (error) {
      return handleError(error, "createRisk");
    }
  };
}

exports.createCreateRiskHandler = createCreateRiskHandler;
exports.handler = createCreateRiskHandler();
