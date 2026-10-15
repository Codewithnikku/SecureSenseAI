import hashlib
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd
from fastapi import HTTPException
from fastapi.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.features.url_features import FEATURE_COLUMNS, extract_features
from app import main
from app.main import AnalyzeRequest, verify_model_integrity


class UrlFeatureTests(unittest.TestCase):
    def test_feature_matrix_is_stable_and_numeric(self):
        features = extract_features(
            [
                "https://www.example.com/account",
                "http://192.0.2.1/login?next=a%40b.test",
                "",
            ]
        )
        self.assertEqual(list(features.columns), FEATURE_COLUMNS)
        self.assertEqual(features.shape, (3, len(FEATURE_COLUMNS)))
        self.assertTrue(all(pd.api.types.is_numeric_dtype(dtype) for dtype in features.dtypes))
        self.assertTrue(features.notna().all().all())

    def test_url_features_describe_text_without_fetching(self):
        features = extract_features(
            ["https://www.example.com/account", "http://192.0.2.1/login?next=a%40b.test"]
        )
        self.assertEqual(features.iloc[0]["has_https"], 1)
        self.assertEqual(features.iloc[0]["has_www"], 1)
        self.assertEqual(features.iloc[1]["has_ip_literal"], 1)
        self.assertGreater(features.iloc[1]["query_parameter_count"], 0)
        self.assertEqual(features.iloc[1]["has_encoded_char"], 1)

    def test_malformed_url_text_does_not_crash_feature_extraction(self):
        features = extract_features(["http://[broken", "::::", "https://example.test:bad"])
        self.assertEqual(features.shape[0], 3)
        self.assertTrue(features.notna().all().all())


class AnalyzeRequestTests(unittest.TestCase):
    def test_accepts_full_and_bare_domains(self):
        self.assertEqual(AnalyzeRequest(url="https://example.com/path").url, "https://example.com/path")
        self.assertEqual(AnalyzeRequest(url="example.com").url, "example.com")

    def test_rejects_non_web_schemes_and_credentials(self):
        for value in ("javascript:alert(1)", "file:///etc/passwd", "https://user:pass@example.com"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                AnalyzeRequest(url=value)

    def test_rejects_control_characters(self):
        with self.assertRaises(ValueError):
            AnalyzeRequest(url="https://example.com/\n")

    def test_model_integrity_check_rejects_modified_artifacts(self):
        with tempfile.TemporaryDirectory() as directory:
            artifact = Path(directory) / "model.joblib"
            artifact.write_bytes(b"trusted model bytes")
            expected_hash = hashlib.sha256(artifact.read_bytes()).hexdigest()

            with artifact.open("rb") as model_file:
                verify_model_integrity(model_file, expected_hash)
            with artifact.open("rb") as model_file, self.assertRaisesRegex(ValueError, "integrity check failed"):
                verify_model_integrity(model_file, "0" * 64)
            with artifact.open("rb") as model_file, self.assertRaisesRegex(ValueError, "64-character"):
                verify_model_integrity(model_file, "not-a-hash")

    def test_model_unavailable_response_does_not_disclose_server_paths(self):
        private_path = r"C:\private\deployment\model_artifacts\url_threat_model.joblib"
        with patch("app.main.load_artifact", side_effect=FileNotFoundError(private_path)):
            with self.assertRaises(HTTPException) as response:
                main.analyze(AnalyzeRequest(url="https://example.com"))

        self.assertEqual(response.exception.status_code, 503)
        self.assertNotIn(private_path, response.exception.detail)

    def test_api_responses_include_security_headers(self):
        with TestClient(main.app) as client:
            response = client.get("/not-found")

        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["referrer-policy"], "no-referrer")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")


if __name__ == "__main__":
    unittest.main()
