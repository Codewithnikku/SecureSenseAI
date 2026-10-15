# SecureSense AI URL model

This service trains a multi-class URL threat classifier and exposes a local
HTTP API for analyzing URL text. URL submissions are parsed as text only: the
service never opens, resolves, or fetches a submitted URL.

## Data preparation and training

From the repository root, install the service requirements in a Python 3.10+
environment, then run:

```powershell
python -m pip install -r services/ml-api/requirements.txt
python services/ml-api/app/training/train_model.py
```

The training job reads just `url,type` from `Datasets/ds_1.csv` and `URL,label`
from `Datasets/ds_2.csv`. The binary data's `1` label is interpreted as benign
and `0` as phishing. That is the source dataset's assumed label convention;
confirm it against the original dataset documentation before relying on model
results.

Preparation trims URLs and labels, removes missing or unsupported rows,
excludes URLs with conflicting labels, and deduplicates normalized URL text.
It derives 34 lexical features locally, including URL length, character counts,
host structure, query characteristics, and suspicious-term flags. It does not
use filenames, page contents, redirects, or any fetched network data.

The deterministic 80/20 evaluation split groups identical hostnames together
to reduce leakage between train and test data. The class-balanced
`HistGradientBoostingClassifier` reports accuracy, macro/weighted F1, precision,
recall, per-class support, a confusion matrix, and held-out group counts.
Artifacts are written to `services/ml-api/model_artifacts/`; the trained model
and its summary are git-ignored. The summary is generated only after a
successful fit and evaluation.

## Start the inference API

From the repository root:

```powershell
python -m uvicorn app.main:app --app-dir services/ml-api --host 127.0.0.1 --port 8000
```

- `GET http://127.0.0.1:8000/health` checks model readiness.
- `GET http://127.0.0.1:8000/insights` returns dataset audit and held-out metrics.
- `POST http://127.0.0.1:8000/analyze` accepts `{"url":"https://example.com"}`.

The dashboard's `/analysis` page sends each submitted URL to this API and
updates its result from the trained model prediction and per-class scores. Set
`NEXT_PUBLIC_ML_API_URL` in `apps/web/.env.local` to the API base URL when it is
not `http://127.0.0.1:8000`. Configure `SECURESENSE_ALLOWED_ORIGINS` on the API
when the dashboard runs on another origin.

The dashboard can use a dark-styled Google Map when the Google Maps JavaScript
API is enabled. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `apps/web/.env.local`;
the dashboard keeps its local preview map when this setting is absent. Google
Maps browser keys are visible to visitors, so restrict the key by HTTP referrer
to your local development origin and deployed dashboard domains, enable only
the Maps JavaScript API, and set an appropriate usage quota.

For deployments, pin the model artifact before it is loaded by setting
`SECURESENSE_MODEL_SHA256` to its trusted SHA-256 digest. For example, generate
the digest with `Get-FileHash services/ml-api/model_artifacts/url_threat_model.joblib -Algorithm SHA256`
in PowerShell. The API verifies this digest before deserializing the model.
The API is unauthenticated and is intended to stay bound to `127.0.0.1` for
local development. CORS is not authentication; deployments that expose the API
outside a trusted host must put it behind an authenticated, rate-limiting
gateway before accepting traffic.

## Interpreting results

This is a lexical, dataset-trained baseline—not a reputation service, malware
sandbox, or guarantee that a URL is safe. `confidence` is the winning model
class probability and is not probability-calibrated. Unknown domains, new
attack patterns, misleading labels, and domain drift can cause false positives
or negatives. Review uncertain or high-risk results before taking action.

## Tests

```powershell
python -m unittest discover -s services/ml-api/tests -v
```
