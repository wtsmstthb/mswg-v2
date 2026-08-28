"use strict";

class HttpError extends Error {
  constructor(statusCode, message, code = "REQUEST_ERROR") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function parseBody(event) {
  if (event?.body === undefined || event?.body === null || event.body === "") return {};
  if (typeof event.body === "object" && !Array.isArray(event.body)) return event.body;
  if (typeof event.body !== "string") {
    throw new HttpError(400, "Request body must be a JSON object", "INVALID_JSON");
  }
  try {
    const parsed = JSON.parse(event.body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
}

function pathParameter(event, name) {
  const value = event?.pathParameters?.[name];
  if (!value || !String(value).trim()) {
    throw new HttpError(400, `${name} path parameter is required`, "VALIDATION_ERROR");
  }
  return String(value).trim();
}

function handleError(error, operation) {
  if (error instanceof HttpError) {
    return jsonResponse(error.statusCode, { error: error.message, code: error.code });
  }
  if (error?.name === "ConditionalCheckFailedException" || error?.name === "TransactionCanceledException") {
    return jsonResponse(409, {
      error: "This assessment changed in another session. Reload it before trying again.",
      code: "VERSION_CONFLICT"
    });
  }
  console.error(`${operation} failed`, error);
  return jsonResponse(500, { error: "An unexpected server error occurred", code: "INTERNAL_ERROR" });
}

module.exports = { HttpError, handleError, jsonResponse, parseBody, pathParameter };
