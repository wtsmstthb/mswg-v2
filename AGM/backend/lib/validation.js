"use strict";

const { HttpError } = require("./http");
const { calculateScores, questionsFor } = require("./scoring");

const FIELD_NAMES = Object.freeze([
  "company", "fye", "type", "date", "time", "mode", "hybrid", "venue", "notice",
  "attendees", "ended", "analyst", "voting", "mswg", "governance", "remarks",
  "comment_a", "comment_b", "comment_c", "comment_d", "comment_e", "comment_f"
]);
const REQUIRED_FIELDS = Object.freeze(["company", "fye", "type", "date", "time", "mode", "venue", "notice", "attendees", "analyst"]);

function objectValue(value, field) {
  if (value === undefined || value === null) return {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${field} must be an object`, "VALIDATION_ERROR");
  }
  return value;
}

function text(value, field, maxLength = 5000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" && typeof value !== "number") {
    throw new HttpError(400, `${field} must be text`, "VALIDATION_ERROR");
  }
  const result = String(value).trim();
  if (result.length > maxLength) throw new HttpError(400, `${field} is too long`, "VALIDATION_ERROR");
  return result;
}

function validatePayload(payload, { requireComplete = false } = {}) {
  const input = objectValue(payload, "assessment");
  const inputFields = objectValue(input.fields, "fields");
  const fields = {};
  for (const field of FIELD_NAMES) fields[field] = text(inputFields[field], field, field === "company" ? 200 : 5000);
  if (!fields.mode) fields.mode = "Physical";
  if (!new Set(["Physical", "Virtual"]).has(fields.mode)) {
    throw new HttpError(400, "mode must be Physical or Virtual", "VALIDATION_ERROR");
  }
  if (fields.type && !new Set(["AGM", "EGM"]).has(fields.type)) {
    throw new HttpError(400, "type must be AGM or EGM", "VALIDATION_ERROR");
  }

  const expectedQuestions = questionsFor(fields.mode);
  const allowedKeys = new Set(expectedQuestions.map(question => question.key));
  const inputAnswers = objectValue(input.answers, "answers");
  const answers = {};
  for (const [key, value] of Object.entries(inputAnswers)) {
    if (allowedKeys.has(key) && value !== undefined && value !== "") answers[key] = text(value, `answers.${key}`, 5);
  }

  const inputComments = objectValue(input.comments, "comments");
  const comments = {};
  for (const [key, value] of Object.entries(inputComments)) {
    if (allowedKeys.has(key)) comments[key] = text(value, `comments.${key}`, 5000);
  }
  const scores = calculateScores(fields.mode, answers);

  if (requireComplete) {
    const missingFields = REQUIRED_FIELDS.filter(field => !fields[field]);
    if (missingFields.length) {
      throw new HttpError(400, `Complete the required meeting details: ${missingFields.join(", ")}`, "INCOMPLETE_ASSESSMENT");
    }
    const missingAnswers = expectedQuestions.filter(question => !answers[question.key]).map(question => question.key);
    if (missingAnswers.length) {
      throw new HttpError(400, `Answer all scored questions before submission (${missingAnswers.length} remaining)`, "INCOMPLETE_ASSESSMENT");
    }
    const missingReasons = expectedQuestions.filter(question => {
      const answer = answers[question.key];
      return (answer === "N" || (question.type === "points" && answer === "0")) && !comments[question.key];
    });
    if (missingReasons.length) {
      throw new HttpError(400, `Add reasons/comments for all No or zero-point answers (${missingReasons.length} remaining)`, "INCOMPLETE_ASSESSMENT");
    }
  }

  return { fields, answers, comments, scores };
}

function expectedVersion(body) {
  const value = Number(body.record_version);
  if (!Number.isInteger(value) || value < 1) {
    throw new HttpError(400, "record_version is required and must be a positive integer", "VALIDATION_ERROR");
  }
  return value;
}

module.exports = { FIELD_NAMES, REQUIRED_FIELDS, expectedVersion, text, validatePayload };
