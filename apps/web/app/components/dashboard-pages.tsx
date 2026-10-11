"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ActivityEvent, sampleActivity, sampleThreats, Threat, ThreatStatus } from "../lib/dashboard-data";
import { useStoredState } from "../lib/local-storage";
import { EmptyState, Icon, Notice, PageHeading } from "./dashboard-ui";
import { LatestAnalysisWidget, ModelInsightsWidget } from "./model-insights";

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

function DashboardChart() {
  return (
    <div className="chart-wrap" role="img" aria-label="Threats detected and blocked over the last seven days.">
      <div className="chart-y-labels" aria-hidden="true"><span>400</span><span>300</span><span>200</span><span>100</span><span>0</span></div>
      <svg className="threat-chart" viewBox="0 0 680 204" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="detected-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7967ed" stopOpacity=".19" /><stop offset="100%" stopColor="#7967ed" stopOpacity="0" /></linearGradient>
          <linearGradient id="blocked-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#36b88a" stopOpacity=".12" /><stop offset="100%" stopColor="#36b88a" stopOpacity="0" /></linearGradient>
        </defs>
        <path d="M0 35H680M0 77H680M0 119H680M0 161H680M0 203H680" stroke="#edf0f5" strokeDasharray="4 5" />
        <path d="M0 94 C38 89 58 50 98 61 S154 109 194 92 S251 51 291 66 S348 119 388 98 S446 62 486 73 S544 123 583 105 S640 65 680 78 L680 204 L0 204Z" fill="url(#detected-fill)" />
        <path d="M0 112 C38 108 58 76 98 83 S154 122 194 108 S251 75 291 86 S348 133 388 115 S446 83 486 92 S544 137 583 120 S640 88 680 96 L680 204 L0 204Z" fill="url(#blocked-fill)" />
        <path d="M0 94 C38 89 58 50 98 61 S154 109 194 92 S251 51 291 66 S348 119 388 98 S446 62 486 73 S544 123 583 105 S640 65 680 78" fill="none" stroke="#7967ed" strokeWidth="2.7" strokeLinecap="round" />
        <path d="M0 112 C38 108 58 76 98 83 S154 122 194 108 S251 75 291 86 S348 133 388 115 S446 83 486 92 S544 137 583 120 S640 88 680 96" fill="none" stroke="#36b88a" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <div className="chart-x-labels" aria-hidden="true"><span>Mon, 12</span><span>Tue, 13</span><span>Wed, 14</span><span>Thu, 15</span><span>Fri, 16</span><span>Sat, 17</span><span>Sun, 18</span></div>
    </div>
  );
}

export function OverviewPage() {
  const [range, setRange] = useState("Last 7 days");
  const [notice, setNotice] = useState("");
  const summaryRows = [
    ["Metric", "Value", "Change"],
    ["Threats detected", "1,284", "+12.8%"],
    ["Threats blocked", "1,276", "+8.2%"],
    ["Scans completed", "3,642", "+18.4%"],
    ["Average response time", "0.42 seconds", "-0.18 seconds"],
  ];

  return (
    <>
      <PageHeading
        eyebrow="MONDAY, MAY 19, 2025"
        title={<>Good morning, Jordan <span className="heading-spark" aria-hidden="true">✦</span></>}
        description="Here&apos;s what&apos;s happening with your security today."
        actions={
          <>
            <label className="button button-secondary range-control"><Icon name="clock" size={16} /><select value={range} onChange={(event) => setRange(event.target.value)} aria-label="Select dashboard date range"><option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option></select></label>
            <a className="button button-secondary heading-analysis-link" href="/analysis"><Icon name="radar" size={15} />Analyze URL</a>
            <ActionButton variant="primary" onClick={() => { downloadCsv("securesense-overview.csv", summaryRows); setNotice("Your overview report has been downloaded."); }}><Icon name="download" size={16} />Export report</ActionButton>
          </>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <section className="overview-grid" aria-label="Security overview">
        <article className="risk-card">
          <div className="risk-content">
            <span className="risk-kicker"><span className="status-pulse" /> SECURITY POSTURE</span>
            <h2>Your systems are<br className="desktop-break" /> looking good.</h2>
            <p>This is sample workspace data. Connect an integration to monitor your environment.</p>
            <a className="risk-link" href="/integrations">Connect a security tool <Icon name="arrow" size={15} /></a>
          </div>
          <div className="risk-score" aria-label="Sample security score 94 out of 100">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="8" /><circle cx="60" cy="60" r="48" fill="none" stroke="#84e0bc" strokeWidth="8" strokeLinecap="round" strokeDasharray="283 302" transform="rotate(-90 60 60)" /></svg>
            <div className="score-copy"><strong>94</strong><span>out of 100</span></div><span className="score-label">Sample score</span>
          </div>
          <div className="risk-decoration risk-decoration-one" /><div className="risk-decoration risk-decoration-two" />
        </article>
        <article className="protection-card">
          <div className="card-heading"><div><span className="card-icon protection-icon"><Icon name="lock" size={17} /></span><h2>Protection status</h2></div></div>
          <p className="protection-summary">Sample status only. Set up an integration for live signals.</p>
          <div className="protection-list">
            <div><span className="protection-item-icon"><Icon name="globe" size={15} /></span><span>Network firewall</span><span className="enabled-pill"><i />Sample</span></div>
            <div><span className="protection-item-icon"><Icon name="scan" size={15} /></span><span>Real-time scanning</span><span className="enabled-pill"><i />Sample</span></div>
            <div><span className="protection-item-icon"><Icon name="database" size={15} /></span><span>Threat database</span><span className="updated-label">Demo data</span></div>
          </div>
        </article>
      </section>
      <section className="metric-grid" aria-label="Security metrics">
        {[
          ["Threats detected", "1,284", "+12.8%", "shield", "violet"],
          ["Threats blocked", "1,276", "+8.2%", "check", "green"],
          ["Scans completed", "3,642", "+18.4%", "scan", "blue"],
          ["Avg. response time", "0.42s", "-0.18s", "zap", "amber"],
        ].map(([label, value, change, icon, tone]) => (
          <article className="metric-card" key={label}>
            <div className="metric-top"><span className={`metric-icon ${tone}`}><Icon name={icon as "shield" | "check" | "scan" | "zap"} size={18} /></span><span className="metric-change is-positive"><Icon name="trend" size={13} />{change}</span></div>
            <p className="metric-label">{label}</p><div className="metric-bottom"><strong>{value}</strong><span>sample metrics</span></div>
          </article>
        ))}
      </section>
      <section className="insights-grid dashboard-insights-grid">
        <ModelInsightsWidget />
        <LatestAnalysisWidget />
      </section>
      <section className="content-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><h2>Threat activity</h2><p>Sample threats detected across your network</p></div><span className="range-readout">{range}</span></div>
          <div className="chart-legend"><span><i className="legend-dot detected-dot" />Detected <strong>1,284</strong></span><span><i className="legend-dot blocked-dot" />Blocked <strong>1,276</strong></span></div>
          <DashboardChart />
        </article>
        <article className="panel activity-panel">
          <div className="panel-heading"><div><h2>Recent activity</h2><p>Latest events in your workspace</p></div><a className="text-link" href="/activity">View all <Icon name="arrow" size={14} /></a></div>
          <div className="activity-list">
            {sampleActivity.slice(0, 3).map((event, index) => (
              <div className="activity-row" key={event.id}><span className={`activity-icon ${["blue", "green", "violet"][index]}`}><Icon name={event.category === "Scan" ? "scan" : event.category === "System" ? "settings" : "shield"} size={16} /></span><span className="activity-copy"><strong>{event.title}</strong><small>{event.description}</small></span><time>{event.time}</time></div>
            ))}
          </div>
          <div className="activity-footer"><span className="live-dot" />Sample activity feed</div>
        </article>
      </section>
      <section className="panel threats-panel">
        <div className="panel-heading threats-heading"><div><h2>Recent threats</h2><p>Sample security events for this workspace</p></div><a className="text-link" href="/threats">View all threats <Icon name="arrow" size={14} /></a></div>
        <div className="threat-table-wrap">
          <table className="threat-table">
            <thead><tr><th>THREAT</th><th>TYPE</th><th>DETECTED</th><th>SEVERITY</th><th>STATUS</th></tr></thead>
            <tbody>{sampleThreats.slice(0, 3).map((threat) => (
              <tr key={threat.id}><td><span className={`threat-icon ${threat.severity === "Medium" ? "amber" : "red"}`}><Icon name={threat.type === "Brute force" ? "user" : threat.severity === "Critical" ? "alert" : "database"} size={16} /></span><span className="threat-name-cell"><strong>{threat.name}</strong><small>{threat.source}</small></span></td><td><span className="type-label">{threat.type}</span></td><td className="time-cell">{threat.detected}</td><td><span className={`severity-badge ${threat.severity.toLowerCase()}`}><i />{threat.severity}</span></td><td><span className="status-label"><Icon name="check" size={14} />{threat.status}</span></td></tr>
            ))}</tbody>
          </table>
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

type ScanRecord = { id: string; name: string; scope: string; started: string; duration: string; status: "Completed" | "Running" };
const initialScans: ScanRecord[] = [
  { id: "SC-2038", name: "Full system scan", scope: "Workspace", started: "Today, 09:18 AM", duration: "2m 34s", status: "Completed" },
  { id: "SC-2037", name: "Scheduled scan", scope: "Workspace", started: "Yesterday, 02:00 PM", duration: "1m 52s", status: "Completed" },
  { id: "SC-2036", name: "Quick scan", scope: "Critical assets", started: "May 17, 11:42 AM", duration: "48s", status: "Completed" },
  { id: "SC-2035", name: "Full system scan", scope: "Workspace", started: "May 16, 09:16 AM", duration: "2m 41s", status: "Completed" },
];

export function ScanHistoryPage() {
  const [scans, setScans] = useStoredState<ScanRecord[]>("securesense-scan-history", initialScans);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");

  function startScan() {
    if (running) return;
    const scan: ScanRecord = { id: `SC-${Date.now().toString().slice(-5)}`, name: "Quick scan", scope: "Workspace", started: "Just now", duration: "In progress", status: "Running" };
    setScans([scan, ...scans]);
    setRunning(true);
    setNotice("Demo scan started. No files or live systems are being scanned.");
    window.setTimeout(() => {
      setScans((current) => current.map((item) => item.id === scan.id ? { ...item, duration: "1m 12s", status: "Completed" } : item));
      setRunning(false);
      setNotice("Demo scan complete. Connect a scanning engine to analyze real assets.");
    }, 2200);
  }

  return (
    <>
      <PageHeading eyebrow="SCANS" title="Scan history" description="Review previous scans or run a sample scan workflow." actions={<ActionButton variant="primary" onClick={startScan} disabled={running}><Icon name={running ? "clock" : "scan"} size={16} />{running ? "Scan in progress…" : "Run a scan"}</ActionButton>} />
      <Notice>Preview mode: scans update this browser only. Connect a scanning engine before using this for real assets.</Notice>
      {notice && <Notice tone="success">{notice}</Notice>}
      <section className="metric-grid threat-summary-grid" aria-label="Scan summary">
        <article className="metric-card"><p className="metric-label">Scans in history</p><div className="metric-bottom"><strong>{scans.length}</strong><span>this workspace</span></div></article>
        <article className="metric-card"><p className="metric-label">Completed</p><div className="metric-bottom"><strong>{scans.filter((scan) => scan.status === "Completed").length}</strong><span>successful runs</span></div></article>
        <article className="metric-card"><p className="metric-label">Currently running</p><div className="metric-bottom"><strong>{scans.filter((scan) => scan.status === "Running").length}</strong><span>in this browser</span></div></article>
        <article className="metric-card"><p className="metric-label">Last scan</p><div className="metric-bottom"><strong className="metric-small-value">{scans[0]?.started ?? "—"}</strong><span>{scans[0]?.name ?? "No scans yet"}</span></div></article>
      </section>
      <section className="panel data-panel">
        <div className="panel-heading page-panel-heading"><div><h2>All scans</h2><p>Most recent scans appear first</p></div><span className="sample-badge">LOCAL PREVIEW</span></div>
        <div className="threat-table-wrap">
          <table className="threat-table scan-table"><thead><tr><th>SCAN</th><th>SCOPE</th><th>STARTED</th><th>DURATION</th><th>STATUS</th></tr></thead>
            <tbody>{scans.map((scan) => <tr key={scan.id}><td><span className="threat-icon scan-row-icon"><Icon name="scan" size={16} /></span><span className="threat-name-cell"><strong>{scan.name}</strong><small>{scan.id}</small></span></td><td>{scan.scope}</td><td className="time-cell">{scan.started}</td><td>{scan.duration}</td><td><span className={`table-status ${scan.status.toLowerCase()}`}>{scan.status === "Running" && <span className="spinner" />}{scan.status}</span></td></tr>)}</tbody>
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
