"""Verify company Cognito access tokens before any Pre-Voting operation."""
import os
import re
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer = HTTPBearer(auto_error=False)


@lru_cache(maxsize=4)
def jwks_client(issuer):
    return jwt.PyJWKClient(f"{issuer}/.well-known/jwks.json", timeout=5)


def require_identity(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Sign in with your company account.")
    pool_id = os.getenv("COGNITO_USER_POOL_ID", "")
    client_id = os.getenv("COGNITO_CLIENT_ID", "")
    required_group = os.getenv("PREVOTING_REQUIRED_GROUP", "").strip()
    if not re.fullmatch(r"[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]+", pool_id) or not client_id or not required_group:
        raise HTTPException(503, "Pre-Voting sign-in and access group are not configured.")
    region = pool_id.split("_")[0]
    issuer = f"https://cognito-idp.{region}.amazonaws.com/{pool_id}"
    try:
        key = jwks_client(issuer).get_signing_key_from_jwt(credentials.credentials)
        claims = jwt.decode(
            credentials.credentials, key.key, algorithms=["RS256"], issuer=issuer,
            options={"verify_aud": False, "require": ["exp", "iat", "iss", "sub", "token_use", "client_id"]},
        )
        # Cognito access tokens use client_id; ID-token audience is not accepted here.
        if claims["token_use"] != "access" or claims["client_id"] != client_id or not claims["sub"]:
            raise jwt.InvalidTokenError("Invalid access token")
    except jwt.PyJWTError:
        raise HTTPException(401, "Your session is invalid or expired. Please sign in again.") from None
    groups = claims.get("cognito:groups", [])
    if not isinstance(groups, list) or required_group not in groups:
        raise HTTPException(403, "This account is not assigned to Pre-Voting.")
    return claims
