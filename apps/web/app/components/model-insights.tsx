"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useLocalStorageJson, useStoredState } from "../lib/local-storage";
import { Icon, Notice } from "./dashboard-ui";

type ModelSummary = {
  model_name: string;
  model_version: string;
  target_definition: Record<string, string>;
  evaluation_note: string;
  audit: {
    created_at: string;
    sources: Record<string, {
      path: string;
      rows: number;
      label_mapping: string | Record<string, string>;
      label_counts_before_dedup: Record<string, number>;
    }>;
    preparation: {
      rows_before_cleaning: number;
      missing_rows_removed: number;
      empty_url_rows_removed: number;
      conflicting_duplicate_urls_removed: number;
      duplicate_urls_removed: number;
      rows_after_cleaning: number;
      class_counts: Record<string, number>;
    };
  };
  metrics: {
    accuracy: number;
    precision_macro: number;
    recall_macro: number;
    f1_macro: number;
    f1_weighted: number;
    train_rows: number;
    test_rows: number;
    train_domains: number;
    test_domains: number;
    domain_overlap: number;
    feature_count: number;
    iterations: number;
    sklearn_version: string;
    classes: string[];
    per_class: Record<string, { precision: number; recall: number; f1: number; support: number }>;
    confusion_matrix: number[][];
  };
  algorithm: string;
  hyperparameters: Record<string, number | boolean>;
  training_activity: {
    stages: Array<{ name: string; duration_seconds: number; status: string }>;
  };
  training_seconds: number;
  urls_were_fetched: boolean;
};

type AnalysisResult = {
  id: string;
  analyzed_at: string;
  url: string;
  prediction: string;
  is_threat: boolean;
  confidence: number;
  class_probabilities: Record<string, number>;
  recommendation: string;
  model_name: string;
  disclaimer: string;
};

const ANALYSIS_HISTORY_KEY = "securesense-url-analysis-history";
const MAX_HISTORY = 15;
const EMPTY_ANALYSIS_HISTORY: AnalysisResult[] = [];

function apiBase() {
  return (process.env.NEXT_PUBLIC_ML_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
}

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function count(value: number) {
  return new Intl.NumberFormat().format(value);
}

function friendlyError(error: unknown) {
  return error instanceof Error ? error.message : "The model service returned an unexpected error.";
}

async function fetchInsights(signal?: AbortSignal) {
  const response = await fetch(`${apiBase()}/insights`, { signal, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(body?.detail || `The model service returned HTTP ${response.status}.`);
  }
  return await response.json() as ModelSummary;
}

function DataClasses({ data }: { data: Record<string, number> }) {
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);
  return (
    <div className="class-distribution">
      {Object.entries(data).map(([label, value]) => (
        <div className="class-row" key={label}>
          <span>{label}</span>
          <div className="class-bar-track"><span style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></div>
          <strong>{count(value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function ModelInsightsWidget() {
  const [summary, setSummary] = useState<ModelSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchInsights(controller.signal)
      .then(setSummary)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(friendlyError(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <section className="panel model-widget">
      <div className="panel-heading">
        <div><h2>Trained URL model</h2><p>Measured on held-out hostnames, not live traffic</p></div>
        <span className={`model-state${summary ? " ready" : ""}`}><i />{loading ? "Checking model" : summary ? "Model ready" : "Model offline"}</span>
      </div>
      {summary ? (
        <>
          <div className="model-widget-metrics">
            <div><strong>{percent(summary.metrics.accuracy)}</strong><span>Test accuracy</span></div>
            <div><strong>{percent(summary.metrics.f1_macro)}</strong><span>Macro F1</span></div>
            <div><strong>{count(summary.audit.preparation.rows_after_cleaning)}</strong><span>Prepared URLs</span></div>
            <div><strong>{count(summary.metrics.test_rows)}</strong><span>Test URLs</span></div>
          </div>
          <DataClasses data={summary.audit.preparation.class_counts} />
          <a className="text-link model-widget-link" href="/insights">Explore model &amp; data insights <Icon name="arrow" size={14} /></a>
        </>
      ) : (
        <div className="model-offline">
          <p>{loading ? "Checking the local ML API for a trained model." : "Train the CSV model and start the local ML API to see evaluation results here."}</p>
          {!loading && error && <small>{error}</small>}
          <a className="text-link" href="/insights">Model setup instructions <Icon name="arrow" size={14} /></a>
        </div>
      )}
    </section>
  );
}

export function ModelInsightsPage() {
  const [summary, setSummary] = useState<ModelSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetchInsights(controller.signal)
      .then(setSummary)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(friendlyError(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) {
    return <section className="panel insights-loading" role="status"><span className="spinner" />Loading training and dataset insights…</section>;
  }
  if (!summary) {
    return (
      <section className="panel insights-offline">
        <span className="empty-state-icon"><Icon name="database" size={22} /></span>
        <h2>Model insights are not available yet</h2>
        <p>Train the model from the two project CSVs, then start the local API to show real preprocessing and test metrics here.</p>
        <pre>python services/ml-api/app/training/train_model.py{"\n"}python -m uvicorn app.main:app --app-dir services/ml-api --host 127.0.0.1 --port 8000</pre>
        <p className="error-detail">{error}</p>
      </section>
    );
  }

  const { metrics, audit, target_definition: targetDefinition } = summary;
  const prep = audit.preparation;

  return (
    <>
      <Notice>This evaluation uses a held-out hostname split from the supplied CSVs. Scores are not guarantees about live URLs.</Notice>
      <section className="model-hero panel">
        <div><span className="model-state ready"><i />TRAINED MODEL</span><h2>{summary.model_name}</h2><p>Version {summary.model_version} · {metrics.sklearn_version} · {metrics.feature_count} lexical URL features · {metrics.iterations} boosting iterations</p></div>
        <div className="model-hero-f1"><strong>{percent(metrics.f1_macro)}</strong><span>Macro F1</span></div>
      </section>
      <section className="metric-grid model-metric-grid" aria-label="Model evaluation metrics">
        {[
          ["Accuracy", metrics.accuracy, "Correct predictions on held-out hostnames"],
          ["Macro precision", metrics.precision_macro, "Average precision across threat classes"],
          ["Macro recall", metrics.recall_macro, "Average recall across threat classes"],
          ["Weighted F1", metrics.f1_weighted, "F1 weighted by class support"],
        ].map(([label, score, detail]) => (
          <article className="metric-card" key={String(label)}><p className="metric-label">{label}</p><div className="metric-bottom"><strong>{percent(Number(score))}</strong></div><span className="model-metric-detail">{detail}</span></article>
        ))}
      </section>
      <section className="insights-grid model-visual-grid" aria-label="Charts and training activity">
        <article className="panel insight-panel chart-insight-panel">
          <div className="panel-heading"><div><h2>Evaluation scorecard</h2><p>Held-out hostname test metrics</p></div></div>
          <div className="score-chart" role="img" aria-label={`Model evaluation scores: accuracy ${percent(metrics.accuracy)}, macro precision ${percent(metrics.precision_macro)}, macro recall ${percent(metrics.recall_macro)}, macro F1 ${percent(metrics.f1_macro)}, weighted F1 ${percent(metrics.f1_weighted)}.`}>
            {[["Accuracy", metrics.accuracy], ["Macro precision", metrics.precision_macro], ["Macro recall", metrics.recall_macro], ["Macro F1", metrics.f1_macro], ["Weighted F1", metrics.f1_weighted]].map(([label, value]) => (
              <div className="score-bar-row" key={String(label)}><span>{String(label)}</span><div className="score-bar-track"><i style={{ width: percent(Number(value)) }} /></div><strong>{percent(Number(value))}</strong></div>
            ))}
          </div>
          <div className="chart-footnote">Higher scores indicate better classification on this test split, not a guarantee on unseen traffic.</div>
        </article>
        <article className="panel insight-panel chart-insight-panel">
          <div className="panel-heading"><div><h2>Training data by source</h2><p>{count(prep.rows_after_cleaning)} unique URLs after preparation</p></div></div>
          {Object.entries(audit.sources).map(([source, data]) => {
            const share = prep.rows_after_cleaning ? (data.rows / prep.rows_before_cleaning) * 100 : 0;
            return <div className="source-bar-row" key={source}><div><strong>{source === "url_multiclass" ? "Threat URL dataset" : "URL feature dataset"}</strong><span>{count(data.rows)} raw rows · {share.toFixed(1)}%</span></div><div className="source-bar-track"><i className={source === "url_multiclass" ? "source-bar-primary" : "source-bar-secondary"} style={{ width: `${share}%` }} /></div></div>;
          })}
          <h3 className="subsection-heading">Class balance after cleaning</h3>
          <DataClasses data={prep.class_counts} />
        </article>
        <article className="panel insight-panel chart-insight-panel">
          <div className="panel-heading"><div><h2>F1 by threat class</h2><p>Class-specific quality on held-out URLs</p></div></div>
          <div className="per-class-chart" role="img" aria-label="F1 score by target class">
            {metrics.classes.map((label) => {
              const score = metrics.per_class[label];
              return <div className="per-class-chart-row" key={label}><span>{label}</span><div className="per-class-bars"><i className="precision-bar" style={{ width: percent(score.precision) }} /><i className="recall-bar" style={{ width: percent(score.recall) }} /><i className="f1-bar" style={{ width: percent(score.f1) }} /></div><strong>{percent(score.f1)}</strong></div>;
            })}
          </div>
          <div className="chart-legend model-chart-legend"><span><i className="legend-dot detected-dot" />Precision</span><span><i className="legend-dot blocked-dot" />Recall</span><span><i className="legend-dot f1-dot" />F1</span></div>
        </article>
        <article className="panel insight-panel chart-insight-panel">
          <div className="panel-heading"><div><h2>Training activity</h2><p>Elapsed time by completed pipeline stage</p></div><span className="sample-badge">{summary.training_seconds}s total</span></div>
          <div className="training-timeline">
            {summary.training_activity.stages.map((stage, index) => <div className="training-stage" key={stage.name}><span className="training-stage-marker"><Icon name="check" size={12} /></span><div className="training-stage-copy"><strong>{stage.name}</strong><span>{stage.status}</span></div><div className="training-stage-track"><i style={{ width: `${Math.max(3, (stage.duration_seconds / Math.max(summary.training_seconds, 1)) * 100)}%` }} /></div><time>{stage.duration_seconds}s</time><span className="training-stage-number">{String(index + 1).padStart(2, "0")}</span></div>)}
          </div>
        </article>
      </section>
      <section className="insights-grid">
        <article className="panel insight-panel">
          <div className="panel-heading"><div><h2>Prepared dataset</h2><p>Cleaning and deduplication summary</p></div></div>
          <div className="prep-stats">
            <div><span>Rows reviewed</span><strong>{count(prep.rows_before_cleaning)}</strong></div>
            <div><span>Unique URLs kept</span><strong>{count(prep.rows_after_cleaning)}</strong></div>
            <div><span>Missing rows removed</span><strong>{count(prep.missing_rows_removed)}</strong></div>
            <div><span>Empty URLs removed</span><strong>{count(prep.empty_url_rows_removed)}</strong></div>
            <div><span>Conflicting-label URL rows removed</span><strong>{count(prep.conflicting_duplicate_urls_removed)}</strong></div>
            <div><span>Duplicate URLs removed</span><strong>{count(prep.duplicate_urls_removed)}</strong></div>
          </div>
          <h3 className="subsection-heading">Label balance</h3>
          <DataClasses data={prep.class_counts} />
          <p className="model-note">Binary data label mapping: {targetDefinition.binary_source_note}</p>
        </article>
        <article className="panel insight-panel">
          <div className="panel-heading"><div><h2>Per-class performance</h2><p>Test metrics by predicted URL label</p></div></div>
          <div className="class-metric-table">
            <div className="class-metric-row class-metric-header"><span>CLASS</span><span>PRECISION</span><span>RECALL</span><span>F1</span></div>
            {metrics.classes.map((label) => {
              const score = metrics.per_class[label];
              return <div className="class-metric-row" key={label}><strong>{label}</strong><span>{percent(score.precision)}</span><span>{percent(score.recall)}</span><span>{percent(score.f1)}</span></div>;
            })}
          </div>
          <h3 className="subsection-heading">Confusion matrix</h3>
          <div className="confusion-wrap"><table className="confusion-table"><caption>Rows are actual classes; columns are predicted classes.</caption><thead><tr><th>Actual ↓ / Predicted →</th>{metrics.classes.map((label) => <th key={label}>{label}</th>)}</tr></thead><tbody>{metrics.confusion_matrix.map((row, index) => {
            const max = Math.max(1, ...metrics.confusion_matrix.flat());
            return <tr key={metrics.classes[index]}><th>{metrics.classes[index]}</th>{row.map((value, cellIndex) => <td key={`${index}-${cellIndex}`} style={{ backgroundColor: `rgba(104, 84, 210, ${0.04 + 0.34 * (value / max)})` }}>{count(value)}</td>)}</tr>;
          })}</tbody></table></div>
        </article>
      </section>
      <section className="panel evaluation-panel">
        <span className="evaluation-icon"><Icon name="shield" size={19} /></span>
        <div><h2>How to interpret these scores</h2><p>{summary.evaluation_note} The model reads URL text only. It does not visit a site, assess its page contents, or verify whether a destination is currently compromised. Confidence is not calibrated and should not be treated as certainty.</p><p>{summary.algorithm}. Trained {new Date(audit.created_at).toLocaleString()}. Training took {summary.training_seconds}s. Train and test hostname groups overlap: {metrics.domain_overlap}.</p></div>
      </section>
    </>
  );
}

export function UrlAnalysisPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useStoredState(ANALYSIS_HISTORY_KEY, EMPTY_ANALYSIS_HISTORY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = url.trim();
    if (!candidate) {
      setError("Enter a URL or domain to analyze.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${apiBase()}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: candidate }),
      });
      const payload = await response.json() as AnalysisResult | { detail?: string };
      if (!response.ok) {
        const detail = "detail" in payload && payload.detail ? payload.detail : `The model service returned HTTP ${response.status}.`;
        throw new Error(detail);
      }
      const analysis = payload as AnalysisResult;
      const saved: AnalysisResult = { ...analysis, id: crypto.randomUUID(), analyzed_at: new Date().toISOString() };
      const nextHistory = [saved, ...history].slice(0, MAX_HISTORY);
      setHistory(nextHistory);
      setResult(saved);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="analysis-hero">
        <span className="analysis-hero-icon"><Icon name="radar" size={24} /></span>
        <p className="eyebrow">LOCAL MACHINE-LEARNING SCAN</p>
        <h2>Check a URL before you click.</h2>
        <p>Analyze URL text with the model trained on this project&apos;s phishing, malware, defacement, and benign datasets.</p>
        <form className="url-analysis-form" onSubmit={analyze}>
          <label className="url-input-wrap"><Icon name="globe" size={18} /><input type="text" autoComplete="url" maxLength={2048} required placeholder="Paste a URL or enter a domain, e.g. example.com" value={url} onChange={(event) => setUrl(event.target.value)} aria-label="URL to analyze" /></label>
          <button className="button button-primary" type="submit" disabled={loading}>{loading ? <><span className="spinner" />Analyzing…</> : <><Icon name="scan" size={16} />Analyze URL</>}</button>
        </form>
        <p className="analysis-privacy"><Icon name="lock" size={13} />URL text is analyzed locally; this tool never visits the submitted address.</p>
      </section>
      {error && <Notice>{error} Start the API with the setup command below if it is not running.</Notice>}
      {result && (
        <section className={`analysis-result panel ${result.is_threat ? "threat-result" : "benign-result"}`} aria-live="polite">
          <div className="analysis-result-top"><span className={`analysis-result-icon ${result.is_threat ? "danger" : "safe"}`}><Icon name={result.is_threat ? "alert" : "check"} size={22} /></span><div><span className="eyebrow">MODEL ASSESSMENT</span><h2>{result.prediction === "benign" ? "No malicious signals found" : `${result.prediction} indicators found`}</h2></div><span className="confidence-badge">{percent(result.confidence)} score</span></div>
          <p className="analyzed-url">{result.url}</p>
          <p className="result-recommendation">{result.recommendation}</p>
          <div className="probability-list"><h3>Class scores</h3>{Object.entries(result.class_probabilities).sort((a, b) => b[1] - a[1]).map(([label, score]) => <div className="probability-row" key={label}><span>{label}</span><div className="probability-track"><i className={label === "benign" ? "benign-bar" : "threat-bar"} style={{ width: percent(score) }} /></div><strong>{percent(score)}</strong></div>)}</div>
          <p className="model-note">{result.disclaimer}</p>
        </section>
      )}
      <Notice>Research baseline, not a safety guarantee. Review uncertain results and never rely on one classifier to decide whether to visit a site.</Notice>
      <section className="panel data-panel analysis-history-panel">
        <div className="panel-heading page-panel-heading"><div><h2>Recent URL checks</h2><p>Analysis results saved only in this browser</p></div><span className="sample-badge">LOCAL HISTORY</span></div>
        {history.length > 0 ? <div className="analysis-history-list">{history.slice(0, 5).map((item) => <div className="analysis-history-row" key={item.id}><span className={`analysis-history-status ${item.is_threat ? "danger" : "safe"}`}><Icon name={item.is_threat ? "alert" : "check"} size={15} /></span><span className="analysis-history-url"><strong>{item.url}</strong><small>{new Date(item.analyzed_at).toLocaleString()}</small></span><span className={`table-status ${item.is_threat ? "quarantined" : "completed"}`}>{item.prediction}</span><span className="confidence-badge">{percent(item.confidence)}</span></div>)}</div> : <div className="history-empty">Your URL checks will appear here after you run an analysis.</div>}
      </section>
      <div className="setup-command"><strong>Model API not running?</strong><code>python -m uvicorn app.main:app --app-dir services/ml-api --host 127.0.0.1 --port 8000</code><span>Train the model first with <code>python services/ml-api/app/training/train_model.py</code>.</span></div>
    </>
  );
}

export function LatestAnalysisWidget() {
  const history = useLocalStorageJson(ANALYSIS_HISTORY_KEY, EMPTY_ANALYSIS_HISTORY);

  const latest = history[0];
  return (
    <section className="panel latest-analysis-widget">
      <div className="panel-heading"><div><h2>Latest URL analysis</h2><p>Updates when you analyze a URL</p></div><a className="text-link" href="/analysis">Analyze URL <Icon name="arrow" size={14} /></a></div>
      {latest ? <div className="latest-analysis-result"><span className={`analysis-history-status ${latest.is_threat ? "danger" : "safe"}`}><Icon name={latest.is_threat ? "alert" : "check"} size={16} /></span><div className="analysis-history-url"><strong>{latest.url}</strong><small>Predicted {latest.prediction} · {percent(latest.confidence)} model score</small></div><time>{new Date(latest.analyzed_at).toLocaleString()}</time></div> : <div className="model-offline"><p>No URL checks yet. Submit a URL to see its model result here.</p><a className="text-link" href="/analysis">Start an analysis <Icon name="arrow" size={14} /></a></div>}
    </section>
  );
}
