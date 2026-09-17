"""Offline authentication checks; never access the application's saved database."""
import importlib
import os
from pathlib import Path
import sys
import time
from types import SimpleNamespace, ModuleType
import unittest
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
import auth


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.environment = patch.dict(os.environ, {
            "COGNITO_USER_POOL_ID": "ap-southeast-1_TestPool",
            "COGNITO_CLIENT_ID": "test-client", "PREVOTING_REQUIRED_GROUP": "approved-test-group",
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.jwks = patch.object(auth, "jwks_client", return_value=SimpleNamespace(
            get_signing_key_from_jwt=lambda token: SimpleNamespace(key=self.key.public_key())
        ))
        self.jwks.start()
        self.addCleanup(self.jwks.stop)

    def token(self, **extra):
        claims = {"sub": "employee", "iss": "https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_TestPool",
                  "iat": int(time.time()), "exp": int(time.time()) + 300,
                  "client_id": "test-client", "token_use": "access", "cognito:groups": ["approved-test-group"]}
        claims.update(extra)
        return jwt.encode(claims, self.key, algorithm="RS256", headers={"kid": "test"})

    def check(self, token):
        return auth.require_identity(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))

    def test_valid_signed_access_token(self):
        self.assertEqual(self.check(self.token())["sub"], "employee")

    def test_missing_token_and_missing_config(self):
        with self.assertRaises(HTTPException) as error:
            auth.require_identity(None)
        self.assertEqual(error.exception.status_code, 401)
        with patch.dict(os.environ, {"PREVOTING_REQUIRED_GROUP": ""}):
            with self.assertRaises(HTTPException) as error:
                self.check(self.token())
            self.assertEqual(error.exception.status_code, 503)

    def test_expired_forged_wrong_issuer_client_and_id_token(self):
        for changes in [{"exp": 1}, {"iss": "https://attacker.invalid"}, {"client_id": "other"}, {"token_use": "id"}]:
            with self.subTest(changes=changes), self.assertRaises(HTTPException) as error:
                self.check(self.token(**changes))
            self.assertEqual(error.exception.status_code, 401)
        token = self.token()
        parts = token.split(".")
        parts[2] = "A" * len(parts[2])
        with self.assertRaises(HTTPException) as error:
            self.check(".".join(parts))
        self.assertEqual(error.exception.status_code, 401)

    def test_group_membership_required(self):
        with self.assertRaises(HTTPException) as error:
            self.check(self.token(**{"cognito:groups": ["rr-viewers-all"]}))
        self.assertEqual(error.exception.status_code, 403)

    def test_every_api_route_rejects_anonymous_requests(self):
        from fastapi.testclient import TestClient
        from sqlalchemy import create_engine
        from sqlalchemy.orm import declarative_base, sessionmaker
        from sqlalchemy.pool import StaticPool
        database = ModuleType("database")
        database.Base = declarative_base()
        database.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        session = sessionmaker(bind=database.engine)
        def get_db():
            with session() as db:
                yield db
        database.get_db = get_db
        extractor = ModuleType("extractor")
        extractor.extract_bursa_notice = lambda url: {}
        with patch.dict(sys.modules, {"database": database, "extractor": extractor}):
            api = importlib.import_module("api")
            client = TestClient(api.app)
            for method, route in [("GET", "/"), ("GET", "/api/pre-voting/history"),
                                  ("GET", "/api/pre-voting/history/1"),
                                  ("POST", "/api/pre-voting/submit"), ("POST", "/api/pre-voting/extract")]:
                response = client.request(method, route, json={})
                self.assertEqual(response.status_code, 401, route)
            response = client.get("/api/pre-voting/history", headers={"authorization": f"Bearer {self.token()}"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), [])
        database.engine.dispose()


if __name__ == "__main__":
    unittest.main()
