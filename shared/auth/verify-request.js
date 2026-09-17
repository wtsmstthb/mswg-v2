"use strict";

const { CognitoJwtVerifier } = require("aws-jwt-verify");
let verifier;

function createVerifier(userPoolId, clientId) {
  return CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access" });
}

async function verifyRequest(authorization) {
  const match = typeof authorization === "string" && authorization.match(/^Bearer (\S+)$/i);
  if (!match) throw Object.assign(new Error("Sign in with your company account."), { status: 401 });
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    throw Object.assign(new Error("Server sign-in is not configured. Contact the administrator."), { status: 503 });
  }
  try {
    verifier ||= createVerifier(userPoolId, clientId);
    const claims = await verifier.verify(match[1]);
    if (!claims.sub) throw new Error("Missing subject");
    return claims;
  } catch {
    throw Object.assign(new Error("Your session is invalid or expired. Please sign in again."), { status: 401 });
  }
}

module.exports = { verifyRequest, createVerifier };
