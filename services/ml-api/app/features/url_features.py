"""Extract URL-only features without making any network requests."""

from __future__ import annotations

import ipaddress
import math
import re
from collections import Counter
from urllib.parse import SplitResult, urlsplit

import pandas as pd

FEATURE_COLUMNS = [
    "url_length",
    "host_length",
    "path_length",
    "query_length",
    "fragment_length",
    "dot_count",
    "hyphen_count",
    "slash_count",
    "question_count",
    "equals_count",
    "at_count",
    "ampersand_count",
    "percent_count",
    "underscore_count",
    "digit_count",
    "digit_ratio",
    "letter_count",
    "special_char_count",
    "subdomain_count",
    "host_digit_count",
    "host_hyphen_count",
    "host_is_ip",
    "has_https",
    "has_http",
    "has_www",
    "has_punycode",
    "has_encoded_char",
    "has_ip_literal",
    "has_at_symbol",
    "has_double_slash_path",
    "has_suspicious_word",
    "suspicious_word_count",
    "query_parameter_count",
    "url_entropy",
]

_SUSPICIOUS_TERMS = re.compile(
    r"(?i)(?:login|signin|verify|account|update|secure|bank|password|"
    r"confirm|wallet|free|gift|recover|auth|invoice|payment|support)"
)
_HOST_PATTERN = re.compile(r"^(?:[a-z][a-z0-9+.-]*://)?(?:[^/@]*@)?([^/:?#]+)", re.I)
_IPV4_PATTERN = re.compile(r"^(?:\d{1,3}\.){3}\d{1,3}$")


def _entropy(value: str) -> float:
    if not value:
        return 0.0
    counts = Counter(value)
    length = len(value)
    return -sum((count / length) * math.log2(count / length) for count in counts.values())


def _get_host(value: str) -> str:
    candidate = value.strip()
    if not candidate:
        return ""
    try:
        parsed = _safe_parts(candidate)
        host = parsed.hostname or ""
    except ValueError:
        match = _HOST_PATTERN.match(candidate)
        host = match.group(1) if match else ""
    return host.lower().rstrip(".")


def _safe_parts(value: str) -> SplitResult:
    try:
        return urlsplit(value if "://" in value else f"//{value}")
    except ValueError:
        return urlsplit("")


def _is_ip(host: str) -> int:
    if not host:
        return 0
    if _IPV4_PATTERN.fullmatch(host):
        try:
            ipaddress.ip_address(host)
            return 1
        except ValueError:
            return 0
    try:
        ipaddress.ip_address(host)
        return 1
    except ValueError:
        return 0


def extract_features(urls: list[str] | tuple[str, ...] | pd.Series) -> pd.DataFrame:
    """Create the fixed numeric feature matrix shared by training and inference."""
    values = pd.Series(urls, dtype="string").fillna("").astype(str).str.strip()
    lowered = values.str.lower()
    hosts = values.map(_get_host)
    parsed = values.map(_safe_parts)
    path_lengths = parsed.map(lambda item: len(item.path))
    query_lengths = parsed.map(lambda item: len(item.query))
    fragment_lengths = parsed.map(lambda item: len(item.fragment))
    host_lengths = hosts.str.len().fillna(0)
    digit_counts = values.str.count(r"\d")
    letters = values.str.count(r"[A-Za-z]")
    suspicious_counts = lowered.str.count(_SUSPICIOUS_TERMS)
    lengths = values.str.len()

    features = pd.DataFrame(
        {
            "url_length": lengths,
            "host_length": host_lengths,
            "path_length": path_lengths,
            "query_length": query_lengths,
            "fragment_length": fragment_lengths,
            "dot_count": values.str.count(r"\."),
            "hyphen_count": values.str.count("-"),
            "slash_count": values.str.count("/"),
            "question_count": values.str.count(r"\?"),
            "equals_count": values.str.count("="),
            "at_count": values.str.count("@"),
            "ampersand_count": values.str.count("&"),
            "percent_count": values.str.count("%"),
            "underscore_count": values.str.count("_"),
            "digit_count": digit_counts,
            "digit_ratio": digit_counts.div(lengths.clip(lower=1)),
            "letter_count": letters,
            "special_char_count": values.str.count(r"[^A-Za-z0-9]"),
            "subdomain_count": hosts.str.count(r"\."),
            "host_digit_count": hosts.str.count(r"\d"),
            "host_hyphen_count": hosts.str.count("-"),
            "host_is_ip": hosts.map(_is_ip),
            "has_https": lowered.str.startswith("https://").astype("int8"),
            "has_http": lowered.str.startswith("http://").astype("int8"),
            "has_www": hosts.str.startswith("www.").astype("int8"),
            "has_punycode": hosts.str.contains("xn--", regex=False).astype("int8"),
            "has_encoded_char": lowered.str.contains("%", regex=False).astype("int8"),
            "has_ip_literal": hosts.map(_is_ip),
            "has_at_symbol": values.str.contains("@", regex=False).astype("int8"),
            "has_double_slash_path": values.str.contains(r"//", regex=False).astype("int8"),
            "has_suspicious_word": suspicious_counts.gt(0).astype("int8"),
            "suspicious_word_count": suspicious_counts,
            "query_parameter_count": parsed.map(
                lambda item: item.query.count("&") + (1 if item.query else 0)
            ),
            "url_entropy": values.map(_entropy),
        },
        index=values.index,
    )
    return features.reindex(columns=FEATURE_COLUMNS).fillna(0).astype("float32")
