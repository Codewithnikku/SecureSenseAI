import sys
import unittest
from pathlib import Path

import pandas as pd

SERVICE_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

from app.features.url_features import FEATURE_COLUMNS, extract_features
from app.main import AnalyzeRequest


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


if __name__ == "__main__":
    unittest.main()
