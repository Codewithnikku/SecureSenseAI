"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

export type IconName =
  | "activity"
  | "alert"
  | "arrow"
  | "bell"
  | "check"
  | "chevron"
  | "clock"
  | "database"
  | "download"
  | "file"
  | "globe"
  | "grid"
  | "lock"
  | "radar"
  | "scan"
  | "search"
  | "settings"
  | "shield"
  | "spark"
  | "trend"
  | "user"
  | "zap";

const iconPaths: Record<IconName, string> = {
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  alert: "M12 9v4m0 4h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z",
  arrow: "M7 17 17 7M7 7h10v10",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4",
  check: "m5 12 4 4L19 6",
  chevron: "m9 18 6-6-6-6",
  clock: "M12 8v4l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  database: "M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3Zm-9-3v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3m-18 6c0 1.66 4.03 3 9 3s9-1.34 9-3",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h8",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-10-10h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4m-4 4v2",
  radar: "M12 12 20 4M12 12a8 8 0 1 0 8 8M12 12V2m0 10h10m-4.93-7.07a10 10 0 1 0 2.83 2.83",
  scan: "M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2m-10 0H5a2 2 0 0 1-2-2v-2M3 12h18",
  search: "m21 21-4.34-4.34M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3m10-10h-3M5 12H2m17.07-7.07-2.12 2.12M7.05 16.95l-2.12 2.12m14.14 0-2.12-2.12M7.05 7.05 4.93 4.93",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  spark: "m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z",
  trend: "m22 7-8.5 8.5-5-5L2 17m14-10h6v6",
  user: "M20 21a8 8 0 0 0-16 0m8-10a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  zap: "m13 2-3 9h7l-6 11 2-9H6l7-11Z",
};

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

const pageNames: Record<string, string> = {
  "/": "Overview",
  "/threats": "Threats",
  "/scan-history": "Scan history",
  "/reports": "Reports",
  "/insights": "Model insights",
  "/analysis": "Analyze URL",
  "/activity": "Live activity",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const currentPage = pageNames[pathname] ?? "Overview";
  const navigationItems = [
    { label: "Dashboard", href: "/", icon: "grid" },
    { label: "Threats", href: "/threats", icon: "shield" },
    { label: "Scan history", href: "/scan-history", icon: "scan" },
    { label: "Visibility", href: "/insights", icon: "trend" },
    { label: "Network", href: "/activity", icon: "globe" },
    { label: "Assets", href: "/integrations", icon: "database" },
  ] as const;

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (query) router.push(`/threats?query=${encodeURIComponent(query)}`);
  }

  return (
    <div className="app-shell">
      <div className="main-column">
        <header className="topbar">
          <div className="header-brand">
            <button
              className="mobile-menu-button icon-button"
              aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className={`menu-glyph${mobileMenuOpen ? " is-open" : ""}`} />
            </button>
            <Link className="mobile-brand-link" href="/" aria-label="SecureSense AI home">
              <span className="brand-mark"><Icon name="shield" size={19} /></span>
              <span className="brand-name">SecureSense<span>AI</span></span>
            </Link>
          </div>
          <nav className="top-nav" aria-label="Main navigation">
            {navigationItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  className={`top-nav-link${active ? " is-active" : ""}`}
                  href={item.href}
                  key={item.href}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon name={item.icon} size={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="topbar-actions">
            <form className="search-box" onSubmit={submitSearch}>
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder="Search here..."
                aria-label="Search threats and assets"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Icon name="bell" size={19} /><span className="notification-dot" />
              </button>
              {notificationsOpen && (
                <div className="notification-popover">
                  <strong>Notifications</strong>
                  <p>Your sample workspace is ready. Connect an integration to receive live alerts.</p>
                  <Link href="/integrations" onClick={() => setNotificationsOpen(false)}>Set up an integration <Icon name="arrow" size={13} /></Link>
                </div>
              )}
            </div>
              <Link className="header-profile" href="/settings">
                <span className="profile-avatar">JD</span>
                <span className="profile-copy"><strong>Jordan Davis</strong><small>Workspace admin</small></span>
              </Link>
            </div>
        </header>
        {mobileMenuOpen && (
            <div className="mobile-nav-panel" aria-label="More dashboard pages">
              {[...navigationItems, { label: "Analyze URL", href: "/analysis", icon: "radar" as const }, { label: "Reports", href: "/reports", icon: "file" as const }, { label: "Settings", href: "/settings", icon: "settings" as const }].map((item) => (
                <Link className={`top-nav-link${pathname === item.href ? " is-active" : ""}`} href={item.href} key={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Icon name={item.icon} size={16} /><span>{item.label}</span>
                </Link>
              ))}
          </div>
        )}
        <main className="dashboard">
          <div className="parallax-orb parallax-orb-one" aria-hidden="true" />
          <div className="parallax-orb parallax-orb-two" aria-hidden="true" />
          {children}
          <footer className="dashboard-footer">
            <span>SecureSense AI <span className="footer-separator">·</span> {currentPage} <span className="footer-separator">·</span> Sample workspace data</span>
            <span><span className="live-dot" />Dashboard ready</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow = "SECURITY WORKSPACE",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="heading-subtitle">{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </section>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" }) {
  return <div className={`page-notice ${tone}`} role="status">{children}</div>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
