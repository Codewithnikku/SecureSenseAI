export type ThreatSeverity = "Critical" | "High" | "Medium" | "Low";
export type ThreatStatus = "Blocked" | "Quarantined" | "Investigating" | "Resolved";

export type Threat = {
  id: string;
  name: string;
  source: string;
  type: string;
  detected: string;
  severity: ThreatSeverity;
  status: ThreatStatus;
};

export const sampleThreats: Threat[] = [
  { id: "TH-1048", name: "SQL injection attempt", source: "185.220.101.42", type: "Injection", detected: "2 min ago", severity: "High", status: "Blocked" },
  { id: "TH-1047", name: "Suspicious login activity", source: "103.45.12.89", type: "Brute force", detected: "14 min ago", severity: "Medium", status: "Blocked" },
  { id: "TH-1046", name: "Malicious payload detected", source: "91.240.118.12", type: "Malware", detected: "38 min ago", severity: "Critical", status: "Quarantined" },
  { id: "TH-1045", name: "Unusual outbound traffic", source: "172.16.24.8", type: "Network", detected: "1 hr ago", severity: "Medium", status: "Investigating" },
  { id: "TH-1044", name: "Cross-site scripting probe", source: "45.155.205.11", type: "Injection", detected: "2 hrs ago", severity: "High", status: "Blocked" },
  { id: "TH-1043", name: "Exposed admin endpoint", source: "192.168.1.42", type: "Misconfiguration", detected: "4 hrs ago", severity: "Low", status: "Resolved" },
  { id: "TH-1042", name: "Credential stuffing attempt", source: "89.248.165.16", type: "Brute force", detected: "Yesterday", severity: "High", status: "Blocked" },
  { id: "TH-1041", name: "Suspicious file upload", source: "194.26.135.21", type: "Malware", detected: "Yesterday", severity: "Critical", status: "Quarantined" },
];

export type ActivityEvent = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: "Threat" | "Scan" | "System" | "Integration";
};

export const sampleActivity: ActivityEvent[] = [
  { id: "EV-01", title: "Firewall rules updated", description: "System configuration", time: "10:42 AM", category: "System" },
  { id: "EV-02", title: "Full system scan completed", description: "3,642 items checked", time: "09:18 AM", category: "Scan" },
  { id: "EV-03", title: "New device connected", description: "Network monitoring", time: "08:56 AM", category: "System" },
  { id: "EV-04", title: "SQL injection attempt blocked", description: "185.220.101.42 · High severity", time: "08:31 AM", category: "Threat" },
  { id: "EV-05", title: "Threat database updated", description: "Signatures are up to date", time: "08:00 AM", category: "System" },
  { id: "EV-06", title: "Cloudflare integration connected", description: "Connection configured", time: "Yesterday, 4:24 PM", category: "Integration" },
  { id: "EV-07", title: "Scheduled scan completed", description: "3,516 items checked", time: "Yesterday, 2:00 PM", category: "Scan" },
  { id: "EV-08", title: "Malicious file quarantined", description: "91.240.118.12 · Critical severity", time: "Yesterday, 11:42 AM", category: "Threat" },
];

