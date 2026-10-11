"""Prepare the supplied URL CSVs, train and evaluate a URL classifier."""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

import joblib
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupShuffleSplit

ROOT = Path(__file__).resolve().parents[4]
SERVICE_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = SERVICE_ROOT / "model_artifacts"
logger = logging.getLogger("securesense.training")
HOST_PATTERN = re.compile(r"^(?:[a-z][a-z0-9+.-]*://)?(?:[^/@]*@)?([^/:?#]+)", re.I)


def load_datasets(ds1_path: Path, ds2_path: Path) -> tuple[pd.DataFrame, dict]:
    """Read only URL and label columns, normalize labels, and audit source files."""
    logger.info("Reading URL and label columns from %s", ds1_path)
    first = pd.read_csv(
        ds1_path,
        usecols=["url", "type"],
        dtype={"url": "string", "type": "string"},
        encoding="utf-8-sig",
        on_bad_lines="error",
    )
    first = first.rename(columns={"url": "url", "type": "label"})
    first["source"] = "url_multiclass"

    logger.info("Reading URL and label columns from %s", ds2_path)
    second = pd.read_csv(
        ds2_path,
        usecols=["URL", "label"],
        dtype={"URL": "string", "label": "string"},
        encoding="utf-8-sig",
        on_bad_lines="error",
    )
    second = second.rename(columns={"URL": "url"})
    second["label"] = second["label"].str.strip().map({"1": "benign", "0": "phishing"})
    second["source"] = "url_binary"

    combined = pd.concat(
        [first[["url", "label", "source"]], second[["url", "label", "source"]]],
        ignore_index=True,
    )
    source_counts = combined["source"].value_counts().to_dict()
    missing_before_cleaning = int(combined[["url", "label"]].isna().any(axis=1).sum())
    combined["url"] = combined["url"].fillna("").str.strip()
    combined["label"] = combined["label"].fillna("").str.strip().str.lower()
    empty_url_rows = int(combined["url"].eq("").sum())
    unsupported_labels = sorted(set(combined["label"]) - {"benign", "phishing", "defacement", "malware"})
    combined = combined[
        combined["url"].ne("")
        & combined["label"].isin(["benign", "phishing", "defacement", "malware"])
    ].copy()

    combined["normalized_url"] = combined["url"].str.lower().str.rstrip("/")
    conflicting = combined.groupby("normalized_url", sort=False)["label"].nunique()
    conflict_urls = set(conflicting[conflicting > 1].index)
    conflict_rows = int(combined["normalized_url"].isin(conflict_urls).sum())
    combined = combined[~combined["normalized_url"].isin(conflict_urls)]
    before_dedup = len(combined)
    combined = combined.drop_duplicates(subset="normalized_url", keep="first").reset_index(drop=True)
    duplicate_rows = before_dedup - len(combined)

    domains = combined["url"].map(_domain_group)
    no_domain_count = int(domains.eq("").sum())
    domains = domains.where(domains.ne(""), combined["normalized_url"])
    audit = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "url_multiclass": {
                "path": str(ds1_path),
                "rows": int(source_counts.get("url_multiclass", 0)),
                "label_mapping": "type values preserved",
                "label_counts_before_dedup": {
                    str(k): int(v)
                    for k, v in first["label"].value_counts(dropna=False).items()
                },
            },
            "url_binary": {
                "path": str(ds2_path),
                "rows": int(source_counts.get("url_binary", 0)),
                "label_mapping": {"1": "benign", "0": "phishing"},
                "label_counts_before_dedup": {
                    str(k): int(v)
                    for k, v in second["label"].value_counts(dropna=False).items()
                },
            },
        },
        "preparation": {
            "rows_before_cleaning": int(source_counts.get("url_multiclass", 0) + source_counts.get("url_binary", 0)),
            "missing_rows_removed": missing_before_cleaning,
            "empty_url_rows_removed": empty_url_rows,
            "unsupported_labels": unsupported_labels,
            "conflicting_duplicate_urls_removed": conflict_rows,
            "duplicate_urls_removed": int(duplicate_rows),
            "urls_without_hostname": no_domain_count,
            "rows_after_cleaning": int(len(combined)),
            "class_counts": {
                str(k): int(v) for k, v in combined["label"].value_counts().items()
            },
        },
    }
    combined["group"] = domains.to_numpy()
    return combined, audit


def _domain_group(value: str) -> str:
    candidate = str(value).strip()
    if not candidate:
        return ""
    try:
        parsed = urlsplit(candidate if "://" in candidate else f"//{candidate}")
        return (parsed.hostname or "").lower().rstrip(".")
    except ValueError:
        match = HOST_PATTERN.match(candidate)
        return match.group(1).lower().rstrip(".") if match else ""


def train(ds1_path: Path, ds2_path: Path, output_dir: Path) -> dict:
    started = time.monotonic()
    logger.info("Preparing datasets.")
    frame, audit = load_datasets(ds1_path, ds2_path)
    prepared_at = time.monotonic()
    logger.info(
        "Prepared %s unique, non-conflicting URLs across classes %s",
        len(frame),
        audit["preparation"]["class_counts"],
    )

    from app.features.url_features import FEATURE_COLUMNS, extract_features

    labels = frame["label"].to_numpy()
    groups = frame["group"].to_numpy()
    logger.info("Extracting %s lexical features from URL text.", len(FEATURE_COLUMNS))
    features = extract_features(frame["url"])
    features_at = time.monotonic()
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_indices, test_indices = next(splitter.split(features, labels, groups))
    x_train, x_test = features.iloc[train_indices], features.iloc[test_indices]
    y_train, y_test = labels[train_indices], labels[test_indices]
    split_at = time.monotonic()

    logger.info(
        "Training HistGradientBoosting on %s URLs; held-out domain test has %s URLs.",
        len(train_indices),
        len(test_indices),
    )
    model = HistGradientBoostingClassifier(
        max_iter=140,
        learning_rate=0.1,
        max_leaf_nodes=31,
        l2_regularization=1.0,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=12,
        class_weight="balanced",
    )
    model.fit(x_train, y_train)
    fitted_at = time.monotonic()
    predictions = model.predict(x_test)
    classes = model.classes_.tolist()
    report = classification_report(
        y_test,
        predictions,
        labels=classes,
        output_dict=True,
        zero_division=0,
    )
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision_macro": float(precision_score(y_test, predictions, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_test, predictions, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_test, predictions, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_test, predictions, average="weighted", zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, predictions, labels=classes).tolist(),
        "per_class": {
            label: {
                "precision": float(report[label]["precision"]),
                "recall": float(report[label]["recall"]),
                "f1": float(report[label]["f1-score"]),
                "support": int(report[label]["support"]),
            }
            for label in classes
        },
        "classes": classes,
        "train_rows": int(len(train_indices)),
        "test_rows": int(len(test_indices)),
        "train_domains": int(len(set(groups[train_indices]))),
        "test_domains": int(len(set(groups[test_indices]))),
        "domain_overlap": int(
            len(set(groups[train_indices]).intersection(set(groups[test_indices])))
        ),
        "feature_count": int(len(FEATURE_COLUMNS)),
        "iterations": int(model.n_iter_),
        "sklearn_version": sklearn.__version__,
    }
    summary = {
        "model_name": "SecureSense URL Threat Classifier",
        "model_version": "1.0.0",
        "algorithm": "Class-balanced HistGradientBoostingClassifier",
        "hyperparameters": {
            "max_iter": 140,
            "learning_rate": 0.1,
            "max_leaf_nodes": 31,
            "l2_regularization": 1.0,
            "early_stopping": True,
            "validation_fraction": 0.1,
            "n_iter_no_change": 12,
            "random_state": 42,
        },
        "target_definition": {
            "benign": "Non-malicious / legitimate URL",
            "phishing": "Phishing URL",
            "defacement": "Defacement URL",
            "malware": "Malware URL",
            "binary_source_note": "Dataset 2 label 1 is treated as benign and label 0 as phishing.",
        },
        "evaluation_note": (
            "Held-out hostname groups; metrics measure the provided URL datasets "
            "and are not a guarantee of real-world safety."
        ),
        "audit": audit,
        "metrics": metrics,
        "feature_columns": FEATURE_COLUMNS,
        "training_activity": {
            "stages": [
                {"name": "CSV preparation", "duration_seconds": round(prepared_at - started, 2), "status": "completed"},
                {"name": "Feature extraction", "duration_seconds": round(features_at - prepared_at, 2), "status": "completed"},
                {"name": "Domain-group split", "duration_seconds": round(split_at - features_at, 2), "status": "completed"},
                {"name": "Model training", "duration_seconds": round(fitted_at - split_at, 2), "status": "completed"},
                {"name": "Held-out evaluation", "duration_seconds": round(time.monotonic() - fitted_at, 2), "status": "completed"},
            ],
        },
        "training_seconds": round(time.monotonic() - started, 2),
        "training_data_is_local": True,
        "urls_were_fetched": False,
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    model_path = output_dir / "url_threat_model.joblib"
    summary_path = output_dir / "training_summary.json"
    logger.info("Saving model to %s", model_path)
    joblib.dump({"model": model, "feature_columns": FEATURE_COLUMNS}, model_path, compress=3)
    summary["model_artifact"] = model_path.name
    temporary_summary = summary_path.with_suffix(".json.tmp")
    temporary_summary.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    temporary_summary.replace(summary_path)
    logger.info(
        "Finished: accuracy %.3f, macro F1 %.3f, elapsed %ss.",
        metrics["accuracy"],
        metrics["f1_macro"],
        summary["training_seconds"],
    )
    return summary


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ds1", type=Path, default=ROOT / "Datasets" / "ds_1.csv")
    parser.add_argument("--ds2", type=Path, default=ROOT / "Datasets" / "ds_2.csv")
    parser.add_argument("--output-dir", type=Path, default=ARTIFACTS)
    args = parser.parse_args()
    for path in (args.ds1, args.ds2):
        if not path.is_file():
            parser.error(f"Dataset file does not exist: {path}")
    train(args.ds1, args.ds2, args.output_dir)


if __name__ == "__main__":
    sys.path.insert(0, str(SERVICE_ROOT))
    main()
