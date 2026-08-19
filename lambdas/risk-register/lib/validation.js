"use strict";

const { HttpError } = require("./http");

const RISK_RATINGS = Object.freeze(["Low", "Medium Low", "Medium High", "High"]);
const RATING_SET = new Set(RISK_RATINGS);
const EDITABLE_FIELDS = Object.freeze([
  "title",
  "description",
  "likelihood",
  "impact",
  "residual_rating"
]);

function validateString(value, field, options = {}) {
  const { required = false, minLength = 0, maxLength = 5000 } = options;

  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`, "VALIDATION_ERROR");
    return undefined;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be text`, "VALIDATION_ERROR");
  }

  const trimmed = value.trim();
  if (required && !trimmed) {
    throw new HttpError(400, `${field} is required`, "VALIDATION_ERROR");
  }
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throw new HttpError(
      400,
      `${field} must contain between ${minLength} and ${maxLength} characters`,
      "VALIDATION_ERROR"
    );
  }
  return trimmed;
}

function validateRating(value, field, required = false) {
  const rating = validateString(value, field, { required, minLength: required ? 1 : 0, maxLength: 30 });
  if (rating === undefined) return undefined;
  if (!RATING_SET.has(rating)) {
    throw new HttpError(
      400,
      `${field} must be one of: ${RISK_RATINGS.join(", ")}`,
      "VALIDATION_ERROR"
    );
  }
  return rating;
}

function validateCreateRisk(body) {
  return {
    title: validateString(body.title, "title", { required: true, minLength: 3, maxLength: 200 }),
    description: validateString(body.description ?? "", "description", { maxLength: 5000 }) || "",
    likelihood: validateRating(body.likelihood, "likelihood", true),
    impact: validateRating(body.impact, "impact", true),
    residual_rating: validateRating(body.residual_rating, "residual_rating", true)
  };
}

function validateUpdateRisk(body) {
  const suppliedFields = EDITABLE_FIELDS.filter(field => body[field] !== undefined);
  if (!suppliedFields.length) {
    throw new HttpError(400, "At least one editable risk field is required", "VALIDATION_ERROR");
  }

  const changes = {};
  if (body.title !== undefined) {
    changes.title = validateString(body.title, "title", { required: true, minLength: 3, maxLength: 200 });
  }
  if (body.description !== undefined) {
    changes.description = validateString(body.description, "description", { maxLength: 5000 }) || "";
  }
  if (body.likelihood !== undefined) changes.likelihood = validateRating(body.likelihood, "likelihood", true);
  if (body.impact !== undefined) changes.impact = validateRating(body.impact, "impact", true);
  if (body.residual_rating !== undefined) {
    changes.residual_rating = validateRating(body.residual_rating, "residual_rating", true);
  }
  return changes;
}

module.exports = {
  EDITABLE_FIELDS,
  RISK_RATINGS,
  validateCreateRisk,
  validateRating,
  validateUpdateRisk
};

