"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityEvent, sampleActivity, sampleThreats, Threat, ThreatStatus } from "../lib/dashboard-data";
import { useStoredState } from "../lib/local-storage";
import { EmptyState, Icon, Notice, PageHeading } from "./dashboard-ui";
import { apiBase } from "./model-insights";
import { SecurityWorldMap } from "./security-world-map";

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ActionButton({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return (
    <button className={`button button-${variant}`} type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function OverviewPage() {
  const [range, setRange] = useState("Weekly");
  const [deviceQuery, setDeviceQuery] = useState("");
  const months = [
    { month: "Jan", clicked: 64, compromised: 84 },
    { month: "Feb", clicked: 43, compromised: 69 },
    { month: "Mar", clicked: 72, compromised: 96 },
    { month: "Apr", clicked: 48, compromised: 75 },
    { month: "May", clicked: 65, compromised: 86 },
    { month: "Jun", clicked: 48, compromised: 75 },
    { month: "Jul", clicked: 86, compromised: 100 },
    { month: "Aug", clicked: 51, compromised: 78 },
    { month: "Sep", clicked: 39, compromised: 62 },
    { month: "Oct", clicked: 62, compromised: 82 },
    { month: "Nov", clicked: 56, compromised: 78 },
    { month: "Dec", clicked: 46, compromised: 72 },
  ];
  const devices = sampleThreats.filter((threat) => (
    `${threat.name} ${threat.source} ${threat.severity} ${threat.status}`.toLowerCase().includes(deviceQuery.toLowerCase())
  ));

  return (
    <>
      <PageHeading
        eyebrow="SECURITY OPERATIONS · MONDAY, MAY 19, 2025"
        title="Threat activity overview"
        description="A live-style view of activity across your sample workspace."
        actions={
          <>
            <label className="button button-secondary range-control">
              <Icon name="clock" size={15} />
              <select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Select activity range">
                <option>Weekly</option><option>Monthly</option><option>Quarterly</option>
              </select>
            </label>
            <a className="button button-primary" href="/analysis"><Icon name="radar" size={15} />Scan a URL</a>
          </>
        }
      />

      <section className="reference-dashboard-grid reference-top-grid" aria-label="Traffic and threat overview">
        <article className="panel reference-panel traffic-panel">
          <div className="panel-heading reference-panel-heading">
            <div><h2>Traffic overview</h2><p>Threat activity across the workspace</p></div>
            <span className="range-readout">{range}</span>
          </div>
          <div className="reference-legend">
            <span><i className="legend-dot clicked-dot" />Link clicked</span>
            <span><i className="legend-dot compromised-dot" />Endpoint compromised</span>
          </div>
          <div className="reference-bar-chart" role="img" aria-label="Monthly link click and compromised endpoint activity">
            <div className="reference-y-labels" aria-hidden="true"><span>25k</span><span>20k</span><span>15k</span><span>10k</span><span>5k</span><span>0</span></div>
            <div className="reference-bars">
              {months.map((item) => (
                <div className="reference-bar-group" key={item.month} aria-label={`${item.month}: ${item.clicked} thousand clicks`}>
                  <span className="reference-bar-track" style={{ height: `${item.compromised}%` }} />
                  <span className="reference-bar-value" style={{ height: `${item.clicked}%` }} />
                  <small>{item.month}</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="panel reference-panel threat-types-panel">
          <div className="panel-heading reference-panel-heading"><div><h2>Threat types</h2><p>Severity distribution</p></div><button className="subtle-icon-button" aria-label="Threat type details"><span>···</span></button></div>
          <div className="threat-types-content">
            <div className="severity-donut" role="img" aria-label="Threat severity breakdown">
              <div className="donut-center"><strong>198.2 GB</strong><span>Scanned</span></div>
            </div>
            <div className="severity-legend">
              {[["Critical", "25%", "critical"], ["Major", "35%", "major"], ["Minor", "38%", "minor"], ["Other", "2%", "other"]].map(([label, value, tone]) => (
                <div className="severity-legend-item" key={label}><i className={tone} /><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="reference-dashboard-grid reference-middle-grid" aria-label="Threat focus and geographic activity">
        <article className="panel reference-panel focused-panel">
          <div className="panel-heading reference-panel-heading"><div><h2>Focused view</h2><p>Alerts by severity</p></div><span className="focused-info" title="Illustrative sample workspace data">i</span></div>
          <div className="focused-content">
            <div className="focused-legend">
              {[["Critical", "25", "critical"], ["Major", "245", "major"], ["Minor", "787", "minor"], ["Informational", "2", "other"]].map(([label, value, tone]) => (
                <div className="focused-legend-item" key={label}><i className={tone} /><span>{label}<small>{value} events</small></span></div>
              ))}
            </div>
            <div className="focused-donut" role="img" aria-label="2,163 alerts by severity">
              <div className="donut-center"><strong>2,163</strong><span>Total alerts</span></div>
            </div>
          </div>
        </article>

        <article className="panel reference-panel map-panel">
          <div className="panel-heading reference-panel-heading"><div><h2>Global traffic</h2><p>Activity by source region · illustrative sample data</p></div><span className="live-indicator"><i />Monitoring</span></div>
          <div className="map-content">
            <SecurityWorldMap />
            <aside className="country-card" aria-label="Top countries">
              <h3>Top countries</h3>
              {[["🇺🇸", "USA", "13", 32], ["🇮🇳", "India", "26", 45], ["🇨🇦", "Canada", "38", 65], ["🇨🇳", "China", "45", 85]].map(([flag, country, count, width]) => (
                <div className="country-row" key={country}>
                  <div><span className="country-flag">{flag}</span><strong>{country}</strong><small>({count})</small></div>
                  <span className="country-meter"><i style={{ width: `${width}%` }} /></span>
                </div>
              ))}
            </aside>
          </div>
        </article>
      </section>

      <section className="panel reference-panel devices-panel">
        <div className="panel-heading reference-panel-heading devices-heading">
          <div><h2>2,163 active devices</h2><p>Recently detected security events and assets</p></div>
          <label className="device-search"><Icon name="search" size={15} /><input value={deviceQuery} onChange={(event) => setDeviceQuery(event.target.value)} placeholder="Search identities" aria-label="Search active devices" /></label>
        </div>
        <div className="threat-table-wrap">
          <table className="threat-table reference-device-table">
            <thead><tr><th>ASSET NAME</th><th>SEVERITY</th><th>STATUS</th><th>LAST ACTIVE</th><th>TIME DETECTED (UTC)</th><th>ASSETS</th><th>ACTION</th></tr></thead>
            <tbody>{devices.map((threat) => (
              <tr key={threat.id}>
                <td><span className="device-name"><span className="device-mark"><Icon name="database" size={15} /></span><span><strong>{threat.name}</strong><small>{threat.source}</small></span></span></td>
                <td><span className={`severity-badge ${threat.severity.toLowerCase()}`}><i />{threat.severity}</span></td>
                <td><span className={`table-status ${threat.status.toLowerCase()}`}>{threat.status}</span></td>
                <td>{threat.detected}</td><td>09:18:24 UTC</td><td>{threat.type}</td>
                <td><a className="device-action" href="/threats" aria-label={`Review ${threat.name}`}><Icon name="arrow" size={15} /></a></td>
              </tr>
            ))}</tbody>
          </table>
          {devices.length === 0 && <EmptyState icon="search" title="No matching devices" description="Try another device name, source address, or severity." />}
        </div>
      </section>
    </>
  );
}

export function ThreatsPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("query") ?? "");
  const [severity, setSeverity] = useState("All severities");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [statuses, setStatuses] = useStoredState<Record<string, ThreatStatus>>("securesense-threat-statuses", {});
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [notice, setNotice] = useState("");

  const filteredThreats = useMemo(() => sampleThreats.filter((threat) => {
    const status = statuses[threat.id] ?? threat.status;
    const matchesQuery = `${threat.name} ${threat.source} ${threat.type} ${threat.id}`.toLowerCase().includes(query.toLowerCase());
    const matchesSeverity = severity === "All severities" || threat.severity === severity;
    const matchesStatus = statusFilter === "All statuses" || status === statusFilter;
    return matchesQuery && matchesSeverity && matchesStatus;
  }), [query, severity, statusFilter, statuses]);

  function resolveThreat(id: string) {
    setStatuses({ ...statuses, [id]: "Resolved" });
    setSelectedThreat(null);
    setNotice(`${id} marked as resolved in this browser.`);
  }

  return (
    <>
      <PageHeading eyebrow="THREAT CENTER" title="Threats" description="Search, filter, and review sample security events." actions={<ActionButton onClick={() => downloadCsv("securesense-threats.csv", [["ID", "Threat", "Source", "Type", "Detected", "Severity", "Status"], ...filteredThreats.map((threat) => [threat.id, threat.name, threat.source, threat.type, threat.detected, threat.severity, statuses[threat.id] ?? threat.status])])}><Icon name="download" size={16} />Export CSV</ActionButton>} />
      <Notice>Sample threat data only. Resolve actions are saved in this browser and do not change a live system.</Notice>
      {notice && <Notice tone="success">{notice}</Notice>}
      <section className="metric-grid threat-summary-grid" aria-label="Threat summary">
        <article className="metric-card"><p className="metric-label">Total events</p><div className="metric-bottom"><strong>{sampleThreats.length}</strong><span>sample records</span></div></article>
        <article className="metric-card"><p className="metric-label">Critical severity</p><div className="metric-bottom"><strong>{sampleThreats.filter((threat) => threat.severity === "Critical").length}</strong><span>require review</span></div></article>
        <article className="metric-card"><p className="metric-label">Blocked or quarantined</p><div className="metric-bottom"><strong>{sampleThreats.filter((threat) => ["Blocked", "Quarantined"].includes(threat.status)).length}</strong><span>sample mitigations</span></div></article>
        <article className="metric-card"><p className="metric-label">Resolved</p><div className="metric-bottom"><strong>{sampleThreats.filter((threat) => (statuses[threat.id] ?? threat.status) === "Resolved").length}</strong><span>in this workspace</span></div></article>
      </section>
      <section className="panel data-panel">
        <div className="data-toolbar">
          <label className="table-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, source, or ID" aria-label="Search threats" /></label>
          <div className="filter-group">
            <label className="filter-select"><span className="visually-hidden">Filter by severity</span><select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>
            <label className="filter-select"><span className="visually-hidden">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Blocked</option><option>Quarantined</option><option>Investigating</option><option>Resolved</option></select></label>
          </div>
        </div>
        <div className="threat-table-wrap">
          <table className="threat-table full-threat-table">
            <thead><tr><th>THREAT</th><th>TYPE</th><th>DETECTED</th><th>SEVERITY</th><th>STATUS</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
            <tbody>{filteredThreats.map((threat) => {
              const status = statuses[threat.id] ?? threat.status;
              return <tr key={threat.id}>
                <td><span className={`threat-icon ${threat.severity === "Medium" || threat.severity === "Low" ? "amber" : "red"}`}><Icon name={threat.type === "Brute force" ? "user" : threat.severity === "Critical" ? "alert" : "database"} size={16} /></span><span className="threat-name-cell"><strong>{threat.name}</strong><small>{threat.source} · {threat.id}</small></span></td>
                <td><span className="type-label">{threat.type}</span></td><td className="time-cell">{threat.detected}</td>
                <td><span className={`severity-badge ${threat.severity.toLowerCase()}`}><i />{threat.severity}</span></td>
                <td><span className={`table-status ${status.toLowerCase()}`}>{status}</span></td>
                <td><div className="table-actions"><button className="row-action" aria-label={`Review ${threat.name}`} onClick={() => setSelectedThreat(threat)}><Icon name="search" size={15} /></button>{status !== "Resolved" && <button className="resolve-button" onClick={() => resolveThreat(threat.id)}>Resolve</button>}</div></td>
              </tr>;
            })}</tbody>
          </table>
          {filteredThreats.length === 0 && <EmptyState icon="search" title="No matching threats" description="Try changing the search text or clearing a filter." action={<button className="button button-secondary" onClick={() => { setQuery(""); setSeverity("All severities"); setStatusFilter("All statuses"); }}>Clear filters</button>} />}
        </div>
        <div className="table-summary">Showing {filteredThreats.length} of {sampleThreats.length} sample events</div>
      </section>
      {selectedThreat && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedThreat(null)}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="threat-detail-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="Close threat details" onClick={() => setSelectedThreat(null)}>×</button>
            <p className="eyebrow">{selectedThreat.id} · {selectedThreat.detected}</p><h2 id="threat-detail-title">{selectedThreat.name}</h2>
            <p className="modal-description">This sample event was detected from <strong>{selectedThreat.source}</strong>. Its category is <strong>{selectedThreat.type}</strong> and severity is <strong>{selectedThreat.severity}</strong>.</p>
            <div className="detail-pair"><span>Current status</span><strong>{statuses[selectedThreat.id] ?? selectedThreat.status}</strong></div>
            {(statuses[selectedThreat.id] ?? selectedThreat.status) !== "Resolved" && <ActionButton variant="primary" onClick={() => resolveThreat(selectedThreat.id)}><Icon name="check" size={15} />Mark resolved</ActionButton>}
          </section>
        </div>
      )}
    </>
  );
}

type ScanRecord = {
  id: string;
  name: string;
  scope: string;
  started: string;
  duration: string;
  status: "Completed" | "Running" | "Failed";
  target?: string;
  prediction?: string;
  isThreat?: boolean;
  confidence?: number;
  recommendation?: string;
};
const initialScans: ScanRecord[] = [
  { id: "SC-2038", name: "Full system scan", scope: "Workspace", started: "Today, 09:18 AM", duration: "2m 34s", status: "Completed" },
  { id: "SC-2037", name: "Scheduled scan", scope: "Workspace", started: "Yesterday, 02:00 PM", duration: "1m 52s", status: "Completed" },
  { id: "SC-2036", name: "Quick scan", scope: "Critical assets", started: "May 17, 11:42 AM", duration: "48s", status: "Completed" },
  { id: "SC-2035", name: "Full system scan", scope: "Workspace", started: "May 16, 09:16 AM", duration: "2m 41s", status: "Completed" },
];

export function ScanHistoryPage() {
  const [scans, setScans] = useStoredState<ScanRecord[]>("securesense-scan-history", initialScans);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [scanError, setScanError] = useState("");
  const latestResult = scans[0]?.prediction ? scans[0] : null;

  async function startScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running) return;
    const candidate = target.trim();
    if (!candidate) return;
    const startedAt = performance.now();
    const scan: ScanRecord = {
      id: `SC-${Date.now().toString().slice(-5)}`,
      name: "URL threat scan",
      scope: "Local model",
      started: new Date().toLocaleString(),
      duration: "In progress",
      status: "Running",
      target: candidate,
    };
    setScans((current) => [scan, ...current.filter((item) => item.id !== scan.id)].slice(0, 100));
    setRunning(true);
    setNotice("");
    setScanError("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const [response] = await Promise.all([
        fetch(`${apiBase()}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: candidate }),
          cache: "no-store",
          signal: controller.signal,
        }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 850)),
      ]);
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The model service returned an unreadable response.");
      }
      if (!response.ok) {
        const detail = typeof payload === "object" && payload !== null && "detail" in payload && typeof payload.detail === "string"
          ? payload.detail
          : `The model service returned HTTP ${response.status}.`;
        throw new Error(detail);
      }
      if (
        typeof payload !== "object"
        || payload === null
        || !("prediction" in payload)
        || typeof payload.prediction !== "string"
        || !payload.prediction.trim()
        || !("is_threat" in payload)
        || typeof payload.is_threat !== "boolean"
        || !("confidence" in payload)
        || typeof payload.confidence !== "number"
        || !Number.isFinite(payload.confidence)
        || payload.confidence < 0
        || payload.confidence > 1
      ) {
        throw new Error("The model service returned an incomplete scan result.");
      }

      const result: ScanRecord = {
        ...scan,
        duration: `${((performance.now() - startedAt) / 1000).toFixed(1)}s`,
        status: "Completed",
        prediction: payload.prediction,
        isThreat: payload.is_threat,
        confidence: payload.confidence,
        recommendation: "recommendation" in payload && typeof payload.recommendation === "string"
          ? payload.recommendation
          : undefined,
      };
      setScans((current) => [result, ...current.filter((item) => item.id !== result.id)].slice(0, 100));
      setNotice(`Scan complete: ${result.prediction} · ${(payload.confidence * 100).toFixed(1)}% model score.`);
    } catch (reason) {
      const message = reason instanceof DOMException && reason.name === "AbortError"
        ? "The model service did not respond within 15 seconds."
        : reason instanceof Error
          ? reason.message
          : "The model service returned an unexpected error.";
      const failed: ScanRecord = {
        ...scan,
        duration: `${((performance.now() - startedAt) / 1000).toFixed(1)}s`,
        status: "Failed",
      };
      setScans((current) => [failed, ...current.filter((item) => item.id !== failed.id)].slice(0, 100));
      setScanError(`${message} Start the local ML API and confirm the CSV model is trained, then try again.`);
    } finally {
      window.clearTimeout(timeoutId);
      const remaining = 850 - (performance.now() - startedAt);
      if (remaining > 0) await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
      setRunning(false);
    }
  }

  return (
    <>
      <PageHeading eyebrow="LOCAL URL SCANNER" title="Scan history" description="Run a URL through your locally trained threat classifier and review its result." actions={<button className="button button-primary" type="submit" form="scan-url-form" disabled={running}><Icon name={running ? "clock" : "scan"} size={16} />{running ? "Scanning…" : "Scan and run"}</button>} />
      <Notice>URL text is analyzed locally by the trained model. Submitted destinations are never opened or fetched.</Notice>
      {notice && <Notice tone="success">{notice}</Notice>}
      {scanError && <div className="page-notice scan-error" role="alert">{scanError}</div>}
      <section className="panel scan-target-panel">
        <form id="scan-url-form" className="scan-target-form" onSubmit={startScan}>
          <label htmlFor="scan-target"><strong>URL or domain to scan</strong><span>Enter one HTTP/HTTPS URL or a domain name.</span></label>
          <input id="scan-target" type="text" autoComplete="url" maxLength={2048} required placeholder="https://example.com" value={target} onChange={(event) => setTarget(event.target.value)} disabled={running} />
          <span className="scan-target-note"><Icon name="lock" size={14} />Local URL-text analysis · no network request is sent to the destination</span>
        </form>
      </section>
      {running && (
        <section className="panel scan-progress" role="status" aria-live="polite">
          <span className="scan-loader" aria-hidden="true"><Icon name="radar" size={52} /></span>
          <p className="eyebrow">MODEL SCAN IN PROGRESS</p>
          <h2>Analyzing URL signals</h2>
          <strong className="scan-progress-target">{target}</strong>
          <span>Extracting lexical features and comparing them with the trained threat classes.</span>
        </section>
      )}
      {!running && latestResult && (
        <section className={`panel scan-result ${latestResult.isThreat ? "threat-result" : "benign-result"}`} aria-live="polite">
          <span className={`analysis-result-icon ${latestResult.isThreat ? "danger" : "safe"}`}><Icon name={latestResult.isThreat ? "alert" : "check"} size={20} /></span>
          <div className="scan-result-copy">
            <span className="eyebrow">LATEST MODEL RESULT</span>
            <h2>{latestResult.prediction} {latestResult.isThreat ? "indicators found" : "signals found"}</h2>
            <p>{latestResult.recommendation ?? "Review this model estimate before deciding whether to visit the destination."}</p>
            <strong className="scan-result-target">{latestResult.target}</strong>
          </div>
          <span className="confidence-badge">{((latestResult.confidence ?? 0) * 100).toFixed(1)}% score</span>
        </section>
      )}
      <section className="metric-grid threat-summary-grid" aria-label="Scan summary">
        <article className="metric-card"><p className="metric-label">Scans in history</p><div className="metric-bottom"><strong>{scans.length}</strong><span>saved in this browser</span></div></article>
        <article className="metric-card"><p className="metric-label">Completed</p><div className="metric-bottom"><strong>{scans.filter((scan) => scan.status === "Completed").length}</strong><span>model responses</span></div></article>
        <article className="metric-card"><p className="metric-label">Currently running</p><div className="metric-bottom"><strong>{running ? 1 : 0}</strong><span>local model scan</span></div></article>
        <article className="metric-card"><p className="metric-label">Last scan</p><div className="metric-bottom"><strong className="metric-small-value">{scans[0]?.started ?? "—"}</strong><span>{scans[0]?.name ?? "No scans yet"}</span></div></article>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading page-panel-heading"><div><h2>All scans</h2><p>Model results and earlier workspace records</p></div><span className="sample-badge">LOCAL HISTORY</span></div>
        <div className="threat-table-wrap">
          <table className="threat-table scan-table"><thead><tr><th>SCAN</th><th>TARGET / SCOPE</th><th>STARTED</th><th>RESULT</th><th>DURATION</th><th>STATUS</th></tr></thead>
            <tbody>{scans.map((scan) => <tr key={scan.id}><td><span className="threat-icon scan-row-icon"><Icon name="scan" size={16} /></span><span className="threat-name-cell"><strong>{scan.name}</strong><small>{scan.id}</small></span></td><td><span className="scan-target-cell">{scan.target ?? scan.scope}</span></td><td className="time-cell">{scan.started}</td><td>{scan.prediction ? <span className={`scan-prediction${scan.isThreat ? " is-threat" : ""}`}>{scan.prediction}{typeof scan.confidence === "number" ? ` · ${(scan.confidence * 100).toFixed(0)}%` : ""}</span> : "—"}</td><td>{scan.duration}</td><td><span className={`table-status ${scan.status.toLowerCase()}`}>{scan.status === "Running" && <span className="spinner" />}{scan.status}</span></td></tr>)}</tbody>
          </table>
          {scans.length === 0 && <EmptyState icon="scan" title="No scans yet" description="Start a sample scan to see its progress and history here." />}
        </div>
      </section>
    </>
  );
}

type ReportRecord = { id: string; name: string; period: string; created: string; format: string };
const reportRows = [
  ["Report", "Period", "Created", "Threats detected", "Threats blocked", "Scans completed"],
  ["Security overview", "Last 7 days", "May 19, 2025", "1,284", "1,276", "3,642"],
  ["Threat activity", "Last 30 days", "May 19, 2025", "4,810", "4,761", "10,240"],
];

export function ReportsPage() {
  const [reports, setReports] = useStoredState<ReportRecord[]>("securesense-reports", [
    { id: "RP-001", name: "Security overview", period: "Last 7 days", created: "May 19, 2025", format: "CSV" },
    { id: "RP-002", name: "Threat activity", period: "Last 30 days", created: "May 19, 2025", format: "CSV" },
  ]);
  const [period, setPeriod] = useState("Last 7 days");
  const [notice, setNotice] = useState("");

  function createReport() {
    const report: ReportRecord = { id: `RP-${Date.now().toString().slice(-5)}`, name: "Security overview", period, created: new Date().toLocaleString(), format: "CSV" };
    setReports([report, ...reports]);
    setNotice(`${period} report created and added to this browser.`);
  }

  function exportReport(report: ReportRecord) {
    downloadCsv(`securesense-${report.name.toLowerCase().replaceAll(" ", "-")}.csv`, [
      ...reportRows.slice(0, 1),
      [report.name, report.period, report.created, "1,284", "1,276", "3,642"],
    ]);
    setNotice(`${report.name} CSV downloaded.`);
  }

  return (
    <>
      <PageHeading eyebrow="INSIGHTS" title="Reports" description="Create, download, and manage sample security reports." actions={<label className="button button-secondary range-control"><Icon name="clock" size={16} /><select aria-label="Report period" value={period} onChange={(event) => setPeriod(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select></label>} />
      <Notice>Reports are generated from sample dashboard data and saved in this browser.</Notice>
      {notice && <Notice tone="success">{notice}</Notice>}
      <section className="report-create-card">
        <span className="report-art"><Icon name="file" size={22} /></span>
        <div><h2>Build a security report</h2><p>Export an overview of threats, mitigations, and scans for your selected period.</p></div>
        <ActionButton variant="primary" onClick={createReport}><Icon name="spark" size={15} />Generate report</ActionButton>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading page-panel-heading"><div><h2>Generated reports</h2><p>{reports.length} reports saved to this browser</p></div><span className="sample-badge">CSV EXPORT</span></div>
        <div className="threat-table-wrap"><table className="threat-table report-table"><thead><tr><th>REPORT</th><th>PERIOD</th><th>CREATED</th><th>FORMAT</th><th><span className="visually-hidden">Download</span></th></tr></thead>
          <tbody>{reports.map((report) => <tr key={report.id}><td><span className="threat-icon report-row-icon"><Icon name="file" size={16} /></span><span className="threat-name-cell"><strong>{report.name}</strong><small>{report.id}</small></span></td><td>{report.period}</td><td className="time-cell">{report.created}</td><td><span className="type-label">{report.format}</span></td><td><button className="button button-secondary table-download" onClick={() => exportReport(report)}><Icon name="download" size={14} />Download</button></td></tr>)}</tbody>
        </table></div>
      </section>
      <p className="data-caption"><Icon name="shield" size={14} /> Report values are illustrative sample data, not live security findings.</p>
    </>
  );
}

export function ActivityPage() {
  const [category, setCategory] = useState("All activity");
  const [query, setQuery] = useState("");
  const [events] = useState<ActivityEvent[]>(sampleActivity);
  const filteredEvents = events.filter((event) => {
    const matchesCategory = category === "All activity" || event.category === category;
    const matchesQuery = `${event.title} ${event.description}`.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      <PageHeading eyebrow="MONITORING" title="Live activity" description="Browse the recent sample events recorded in your workspace." />
      <Notice>This activity feed contains sample events. Connect an integration to receive live workspace events.</Notice>
      <section className="panel data-panel">
        <div className="data-toolbar">
          <label className="table-search"><Icon name="search" size={16} /><input placeholder="Search activity" aria-label="Search activity" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="filter-select"><span className="visually-hidden">Filter activity category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>All activity</option><option>Threat</option><option>Scan</option><option>System</option><option>Integration</option></select></label>
        </div>
        <div className="event-list">{filteredEvents.map((event) => {
          const icon = event.category === "Threat" ? "shield" : event.category === "Scan" ? "scan" : event.category === "Integration" ? "lock" : "settings";
          const tone = event.category === "Threat" ? "red" : event.category === "Scan" ? "green" : event.category === "Integration" ? "violet" : "blue";
          return <article className="event-row" key={event.id}><span className={`activity-icon ${tone}`}><Icon name={icon} size={16} /></span><div className="event-copy"><strong>{event.title}</strong><p>{event.description}</p></div><span className="event-category">{event.category}</span><time>{event.time}</time></article>;
        })}</div>
        {filteredEvents.length === 0 && <EmptyState icon="search" title="No activity found" description="Try another keyword or event category." action={<button className="button button-secondary" onClick={() => { setQuery(""); setCategory("All activity"); }}>Clear filters</button>} />}
        <div className="table-summary">Showing {filteredEvents.length} of {events.length} sample events</div>
      </section>
    </>
  );
}

type Integration = { id: string; name: string; description: string; category: string; icon: "globe" | "database" | "activity" | "lock"; connected: boolean };
const initialIntegrations: Integration[] = [
  { id: "cloudflare", name: "Cloudflare", description: "Bring edge security events and firewall activity into your workspace.", category: "Network security", icon: "globe", connected: false },
  { id: "aws", name: "Amazon Web Services", description: "Monitor cloud infrastructure signals and account events.", category: "Cloud", icon: "database", connected: false },
  { id: "github", name: "GitHub", description: "Review repository alerts and security events alongside your threat feed.", category: "Developer tools", icon: "activity", connected: false },
  { id: "slack", name: "Slack", description: "Send workspace notifications to a chosen team channel.", category: "Notifications", icon: "activity", connected: false },
];

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useStoredState<Integration[]>("securesense-integrations", initialIntegrations);
  const [notice, setNotice] = useState("");

  function toggleIntegration(id: string) {
    const integration = integrations.find((item) => item.id === id);
    if (!integration) return;
    const connected = !integration.connected;
    setIntegrations(integrations.map((item) => item.id === id ? { ...item, connected } : item));
    setNotice(connected
      ? `${integration.name} marked as connected in this browser. Add credentials in a live integration service to receive events.`
      : `${integration.name} disconnected from this browser preview.`);
  }

  return (
    <>
      <PageHeading eyebrow="SETUP" title="Integrations" description="Choose the security tools you want to connect to your workspace." />
      <Notice>Preview controls only: connection states are saved locally. No credentials are collected and no external service is contacted.</Notice>
      {notice && <Notice tone="success">{notice}</Notice>}
      <section className="integration-summary panel">
        <span className="integration-summary-icon"><Icon name="lock" size={20} /></span>
        <div><strong>{integrations.filter((integration) => integration.connected).length} connected</strong><p>Connect tools to bring your security signals into one place.</p></div>
        <span className="sample-badge">LOCAL PREVIEW</span>
      </section>
      <section className="integration-grid" aria-label="Available integrations">
        {integrations.map((integration) => (
          <article className="integration-card" key={integration.id}>
            <div className="integration-card-top"><span className="integration-icon"><Icon name={integration.icon} size={20} /></span><span className="integration-category">{integration.category}</span></div>
            <h2>{integration.name}</h2><p>{integration.description}</p>
            <div className="integration-card-bottom"><span className={`integration-state${integration.connected ? " connected" : ""}`}><i />{integration.connected ? "Connected in preview" : "Not connected"}</span><button className={`button ${integration.connected ? "button-secondary" : "button-primary"}`} onClick={() => toggleIntegration(integration.id)}>{integration.connected ? "Disconnect" : "Connect"}</button></div>
          </article>
        ))}
      </section>
    </>
  );
}

type Settings = {
  workspace: string;
  fullName: string;
  email: string;
  emailAlerts: boolean;
  weeklySummary: boolean;
  productUpdates: boolean;
};
const defaultSettings: Settings = { workspace: "Acme Corporation", fullName: "Jordan Davis", email: "jordan@example.com", emailAlerts: true, weeklySummary: true, productUpdates: false };

export function SettingsPage() {
  const [settings, setSettings] = useStoredState<Settings>("securesense-settings", defaultSettings);
  const [notice, setNotice] = useState("");

  function update<K extends keyof Settings>(field: K, value: Settings[K]) {
    setSettings({ ...settings, [field]: value });
    setNotice("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings.workspace.trim() || !settings.fullName.trim() || !settings.email.trim()) {
      setNotice("Workspace, name, and email are required.");
      return;
    }
    setNotice("Your settings are saved in this browser.");
  }

  return (
    <>
      <PageHeading eyebrow="PREFERENCES" title="Settings" description="Manage workspace details and notification preferences." />
      <Notice>Settings are stored in this browser only. Account and notification services are not connected.</Notice>
      <form className="settings-form" onSubmit={save}>
        <section className="panel settings-section">
          <div className="settings-section-heading"><span className="settings-section-icon"><Icon name="user" size={18} /></span><div><h2>Workspace profile</h2><p>These details are used in this dashboard preview.</p></div></div>
          <div className="settings-fields">
            <label className="form-field"><span>Workspace name</span><input value={settings.workspace} onChange={(event) => update("workspace", event.target.value)} required maxLength={80} /></label>
            <div className="settings-field-pair"><label className="form-field"><span>Your name</span><input value={settings.fullName} onChange={(event) => update("fullName", event.target.value)} required maxLength={80} /></label><label className="form-field"><span>Email address</span><input type="email" value={settings.email} onChange={(event) => update("email", event.target.value)} required maxLength={120} /></label></div>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="settings-section-heading"><span className="settings-section-icon violet"><Icon name="bell" size={18} /></span><div><h2>Notifications</h2><p>Choose which notifications to show as workspace preferences.</p></div></div>
          <div className="preference-list">
            <label className="preference-row"><span><strong>Security alerts</strong><small>High-priority threat and account alerts</small></span><input type="checkbox" role="switch" checked={settings.emailAlerts} onChange={(event) => update("emailAlerts", event.target.checked)} /></label>
            <label className="preference-row"><span><strong>Weekly security summary</strong><small>A weekly overview of workspace activity</small></span><input type="checkbox" role="switch" checked={settings.weeklySummary} onChange={(event) => update("weeklySummary", event.target.checked)} /></label>
            <label className="preference-row"><span><strong>Product updates</strong><small>Occasional news about SecureSense AI</small></span><input type="checkbox" role="switch" checked={settings.productUpdates} onChange={(event) => update("productUpdates", event.target.checked)} /></label>
          </div>
        </section>
        <div className="settings-submit">{notice && <span className={notice.startsWith("Your") ? "save-success" : "save-error"} role="status">{notice}</span>}<button className="button button-primary" type="submit"><Icon name="check" size={15} />Save preferences</button></div>
      </form>
    </>
  );
}
