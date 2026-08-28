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
  if (event?.body === undefined || event?.body === null || event.body === "") {
    return {};
  }

  if (typeof event.body === "object" && !Array.isArray(event.body)) {
    return event.body;
  }

  if (typeof event.body !== "string") {
    throw new HttpError(400, "Request body must be a JSON object", "INVALID_JSON");
  }

  try {
    const parsed = JSON.parse(event.body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
}

function getPathParameter(event, ...names) {
  for (const name of names) {
    const value = event?.pathParameters?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function getQueryParameter(event, ...names) {
  for (const name of names) {
    const value = event?.queryStringParameters?.[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function getBooleanQueryParameter(event, name, defaultValue = false) {
  const raw = event?.queryStringParameters?.[name];
  if (raw === undefined || raw === null || raw === "") return defaultValue;
  if (raw === true || raw === "true") return true;
  if (raw === false || raw === "false") return false;
  throw new HttpError(400, `${name} must be true or false`, "INVALID_QUERY_PARAMETER");
}

function handleError(error, operation) {
  if (error instanceof HttpError) {
    return jsonResponse(error.statusCode, { error: error.message, code: error.code });
  }

  console.error(`${operation} failed`, error);
  return jsonResponse(500, {
    error: "An unexpected server error occurred",
    code: "INTERNAL_ERROR"
  });
}

module.exports = {
  HttpError,
  getBooleanQueryParameter,
  getPathParameter,
  getQueryParameter,
  handleError,
  jsonResponse,
  parseBody
};

