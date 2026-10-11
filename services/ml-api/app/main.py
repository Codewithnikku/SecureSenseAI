"""Local URL analysis API. URL inputs are parsed as text; never fetched."""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from app.features.url_features import extract_features

logger = logging.getLogger("securesense.api")
SERVICE_ROOT = Path(__file__).resolve().parents[1]
ARTIFACT_DIR = Path(
    os.environ.get("SECURESENSE_MODEL_DIR", str(SERVICE_ROOT / "model_artifacts"))
).resolve()
MODEL_PATH = ARTIFACT_DIR / "url_threat_model.joblib"
SUMMARY_PATH = ARTIFACT_DIR / "training_summary.json"

app = FastAPI(
    title="SecureSense AI URL Analysis",
    description=(
        "Analyzes the text and lexical features of a submitted URL using the "
        "locally trained model. URLs are never opened or fetched."
    ),
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "SECURESENSE_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class AnalyzeRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)

    @field_validator("url", mode="before")
    @classmethod
    def validate_url_text(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Enter a URL as text.")
        if any(ord(character) < 32 for character in value):
            raise ValueError("The URL cannot contain control characters.")
        candidate = value.strip()
        if not candidate:
            raise ValueError("Enter a URL.")
        if candidate.startswith("//"):
            raise ValueError("Enter a full URL or a domain name.")
        parsed = urlsplit(candidate if "://" in candidate else f"https://{candidate}")
        if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
            raise ValueError("Enter a valid HTTP or HTTPS URL or domain name.")
        if parsed.username is not None or parsed.password is not None:
            raise ValueError("URLs containing embedded credentials are not accepted.")
        try:
            parsed.port
        except ValueError as error:
            raise ValueError("The URL contains an invalid port.") from error
        return candidate


@lru_cache(maxsize=1)
def load_artifact() -> dict:
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Trained model not found at {MODEL_PATH}. Run the training script first."
        )
    artifact = joblib.load(MODEL_PATH)
    if not isinstance(artifact, dict) or "model" not in artifact:
        raise ValueError(f"Model artifact at {MODEL_PATH} has an invalid format.")
    return artifact


def read_summary() -> dict:
    if not SUMMARY_PATH.is_file():
        raise FileNotFoundError(
            f"Training summary not found at {SUMMARY_PATH}. Run the training script first."
        )
    with SUMMARY_PATH.open(encoding="utf-8") as summary_file:
        summary = json.load(summary_file)
    if not isinstance(summary, dict) or "metrics" not in summary or "audit" not in summary:
        raise ValueError(f"Training summary at {SUMMARY_PATH} has an invalid format.")
    return summary


@app.get("/health")
def health() -> dict:
    try:
        load_artifact()
    except FileNotFoundError:
        return {"status": "model_not_trained", "model_ready": False}
    except Exception:
        logger.exception("Unable to load the model artifact.")
        raise HTTPException(status_code=500, detail="The model artifact could not be loaded.")
    return {"status": "ready", "model_ready": True}


@app.get("/insights")
def insights() -> dict:
    try:
        return read_summary()
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except (OSError, json.JSONDecodeError, ValueError) as error:
        logger.exception("Unable to read training insights.")
        raise HTTPException(status_code=500, detail="Training insights could not be read.") from error


@app.post("/analyze")
def analyze(request: AnalyzeRequest) -> dict:
    try:
        artifact = load_artifact()
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as error:
        logger.exception("Unable to load the trained URL classifier.")
        raise HTTPException(status_code=500, detail="The trained model could not be loaded.") from error

    try:
        features = extract_features([request.url])
        model = artifact["model"]
        probabilities = model.predict_proba(features)[0]
        class_names = [str(name) for name in model.classes_]
        class_scores = {
            name: round(float(score), 6)
            for name, score in zip(class_names, probabilities, strict=True)
        }
        predicted_class = class_names[int(probabilities.argmax())]
        confidence = float(probabilities.max())
    except Exception as error:
        logger.exception("URL analysis failed.")
        raise HTTPException(status_code=500, detail="The URL could not be analyzed.") from error

    is_threat = predicted_class != "benign"
    if confidence < 0.6:
        recommendation = "Manual review recommended: the model is uncertain."
    elif is_threat:
        recommendation = "Treat as suspicious and investigate before opening."
    else:
        recommendation = "No malicious signals detected in the submitted URL text."
    return {
        "url": request.url,
        "prediction": predicted_class,
        "is_threat": is_threat,
        "confidence": round(confidence, 6),
        "class_probabilities": class_scores,
        "recommendation": recommendation,
        "model_name": "SecureSense URL Threat Classifier",
        "disclaimer": (
            "This result is a model estimate from URL text only, not a guarantee. "
            "The URL was not opened or fetched."
        ),
    }
