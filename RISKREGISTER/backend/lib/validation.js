"use strict";

const { HttpError } = require("./http");

const RISK_RATINGS = Object.freeze(["Low", "Medium Low", "Medium High", "High"]);
const RATING_SET = new Set(RISK_RATINGS);
const RATING_SCORE = Object.freeze({ Low: 1, "Medium Low": 2, "Medium High": 3, High: 4 });
const QUARTERS = new Set(["Q1", "Q2", "Q3", "Q4"]);
const YES_PARTIAL_NO = new Set(["Yes", "Partially", "No"]);
const EFFECTIVENESS = new Set(["Effective", "Partially Effective", "Not Effective"]);
const TRENDS = new Set(["Increasing", "Stable", "Decreasing"]);

const EDITABLE_FIELDS = Object.freeze([
  "title", "description", "likelihood", "impact", "residual_rating",
  "quarter", "element", "statement", "inherent_impact", "inherent_likelihood",
  "control_methods", "addressed_root_cause", "control_documented",
  "applied_consistently", "control_effectiveness", "risk_trend",
  "residual_impact", "residual_likelihood"
]);

function validateString(value, field, options = {}) {
  const { required = false, minLength = 0, maxLength = 5000 } = options;
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`, "VALIDATION_ERROR");
    return undefined;
  }
  if (typeof value !== "string") throw new HttpError(400, `${field} must be text`, "VALIDATION_ERROR");
  const trimmed = value.trim();
  if (required && !trimmed) throw new HttpError(400, `${field} is required`, "VALIDATION_ERROR");
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new HttpError(400, `${field} must contain between ${minLength} and ${maxLength} characters`, "VALIDATION_ERROR");
  }
  return trimmed;
}

function validateEnum(value, field, allowed, required = false) {
  const normalized = validateString(value, field, { required, maxLength: 50 });
  if (normalized === undefined) return undefined;
  if (!allowed.has(normalized)) throw new HttpError(400, `${field} has an unsupported value`, "VALIDATION_ERROR");
  return normalized;
}

function validateRating(value, field, required = false) {
  const rating = validateString(value, field, { required, minLength: required ? 1 : 0, maxLength: 30 });
  if (rating === undefined) return undefined;
  if (!RATING_SET.has(rating)) {
    throw new HttpError(400, `${field} must be one of: ${RISK_RATINGS.join(", ")}`, "VALIDATION_ERROR");
  }
  return rating;
}

function computeRating(impact, likelihood) {
  const score = RATING_SCORE[impact] + RATING_SCORE[likelihood];
  if (score <= 3) return "Low";
  if (score <= 5) return "Medium Low";
  if (score <= 7) return "Medium High";
  return "High";
}

function validateQuarter(value, required = false) {
  return validateEnum(value, "quarter", QUARTERS, required);
}

function validateCreateRisk(body) {
  const element = validateString(body.element ?? body.title, "element", { required: true, minLength: 3, maxLength: 200 });
  const statement = validateString(body.statement ?? body.description ?? element, "statement", { required: true, minLength: 3, maxLength: 5000 });
  const inherentImpact = validateRating(body.inherent_impact ?? body.impact, "inherent_impact", true);
  const inherentLikelihood = validateRating(body.inherent_likelihood ?? body.likelihood, "inherent_likelihood", true);
  const residualImpact = validateRating(body.residual_impact ?? body.impact, "residual_impact", true);
  const residualLikelihood = validateRating(body.residual_likelihood ?? body.likelihood, "residual_likelihood", true);
  const suppliedResidualRating = body.residual_rating === undefined ? undefined : validateRating(body.residual_rating, "residual_rating", true);
  const input = {
    title: element,
    description: statement,
    likelihood: inherentLikelihood,
    impact: inherentImpact,
    residual_rating: body.residual_impact !== undefined || body.residual_likelihood !== undefined
      ? computeRating(residualImpact, residualLikelihood)
      : suppliedResidualRating || computeRating(residualImpact, residualLikelihood),
    element,
    statement,
    inherent_impact: inherentImpact,
    inherent_likelihood: inherentLikelihood,
    inherent_rating: computeRating(inherentImpact, inherentLikelihood),
    residual_impact: residualImpact,
    residual_likelihood: residualLikelihood,
    control_methods: validateString(body.control_methods ?? "", "control_methods", { maxLength: 10000 }) || "",
    addressed_root_cause: validateEnum(body.addressed_root_cause ?? "Partially", "addressed_root_cause", YES_PARTIAL_NO, true),
    control_documented: validateEnum(body.control_documented ?? "Partially", "control_documented", YES_PARTIAL_NO, true),
    applied_consistently: validateEnum(body.applied_consistently ?? "Partially", "applied_consistently", YES_PARTIAL_NO, true),
    control_effectiveness: validateEnum(body.control_effectiveness ?? "Partially Effective", "control_effectiveness", EFFECTIVENESS, true),
    risk_trend: validateEnum(body.risk_trend ?? "Stable", "risk_trend", TRENDS, true)
  };
  const quarter = validateQuarter(body.quarter);
  if (quarter) input.quarter = quarter;
  return input;
}

function validateUpdateRisk(body) {
  const suppliedFields = EDITABLE_FIELDS.filter(field => body[field] !== undefined);
  if (!suppliedFields.length) throw new HttpError(400, "At least one editable risk field is required", "VALIDATION_ERROR");
  const changes = {};
  if (body.title !== undefined) changes.title = validateString(body.title, "title", { required: true, minLength: 3, maxLength: 200 });
  if (body.description !== undefined) changes.description = validateString(body.description, "description", { maxLength: 5000 }) || "";
  if (body.likelihood !== undefined) changes.likelihood = validateRating(body.likelihood, "likelihood", true);
  if (body.impact !== undefined) changes.impact = validateRating(body.impact, "impact", true);
  if (body.residual_rating !== undefined) changes.residual_rating = validateRating(body.residual_rating, "residual_rating", true);
  if (body.quarter !== undefined) changes.quarter = validateQuarter(body.quarter, true);
  if (body.element !== undefined) changes.element = validateString(body.element, "element", { required: true, minLength: 3, maxLength: 200 });
  if (body.statement !== undefined) changes.statement = validateString(body.statement, "statement", { required: true, minLength: 3, maxLength: 5000 });
  if (body.inherent_impact !== undefined) changes.inherent_impact = validateRating(body.inherent_impact, "inherent_impact", true);
  if (body.inherent_likelihood !== undefined) changes.inherent_likelihood = validateRating(body.inherent_likelihood, "inherent_likelihood", true);
  if (body.residual_impact !== undefined) changes.residual_impact = validateRating(body.residual_impact, "residual_impact", true);
  if (body.residual_likelihood !== undefined) changes.residual_likelihood = validateRating(body.residual_likelihood, "residual_likelihood", true);
  if (body.control_methods !== undefined) changes.control_methods = validateString(body.control_methods, "control_methods", { maxLength: 10000 }) || "";
  if (body.addressed_root_cause !== undefined) changes.addressed_root_cause = validateEnum(body.addressed_root_cause, "addressed_root_cause", YES_PARTIAL_NO, true);
  if (body.control_documented !== undefined) changes.control_documented = validateEnum(body.control_documented, "control_documented", YES_PARTIAL_NO, true);
  if (body.applied_consistently !== undefined) changes.applied_consistently = validateEnum(body.applied_consistently, "applied_consistently", YES_PARTIAL_NO, true);
  if (body.control_effectiveness !== undefined) changes.control_effectiveness = validateEnum(body.control_effectiveness, "control_effectiveness", EFFECTIVENESS, true);
  if (body.risk_trend !== undefined) changes.risk_trend = validateEnum(body.risk_trend, "risk_trend", TRENDS, true);
  return changes;
}

function validateExpectedVersion(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!Number.isInteger(value) || value < 1) throw new HttpError(400, "expected_version must be a positive integer", "VALIDATION_ERROR");
  return value;
}

module.exports = {
  EDITABLE_FIELDS,
  RISK_RATINGS,
  computeRating,
  validateCreateRisk,
  validateExpectedVersion,
  validateRating,
  validateUpdateRisk
};
