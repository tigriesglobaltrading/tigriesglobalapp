import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  Download,
  Filter,
  HardHat,
  MoreHorizontal,
  ReceiptText,
  Search,
  Truck,
} from "lucide-react";
import type { CSSProperties } from "react";
import { MetricCard } from "../components/MetricCard";

const metrics = [
  { icon: ReceiptText, label: "Revenue", value: "€248.6k", trend: "+41% from last month", tone: "blue" as const },
  { icon: AlertTriangle, label: "Unpaid invoices", value: "€38.2k", trend: "-8% from last month", tone: "rose" as const },
  { icon: HardHat, label: "Active projects", value: "42", trend: "+12% from last month", tone: "cyan" as const },
  { icon: Truck, label: "Available equipment", value: "118", trend: "+9% from last month", tone: "green" as const },
];

const planning = [
  ["07:30", "Riverside Apartments", "Concrete crew", "In progress"],
  ["09:00", "North Gate Offices", "Electrical team", "Scheduled"],
  ["13:30", "Atlas Logistics Hall", "Equipment delivery", "Confirmed"],
  ["16:00", "Depot Zaventem", "Maintenance review", "Pending"],
];

const activity = [
  "Quote Q-1047 approved for Maison Delcourt",
  "Excavator EX-204 assigned to Riverside Apartments",
  "Invoice INV-2218 payment reminder sent",
  "Low stock alert created for M8 concrete anchors",
];

const projectRows = [
  ["Riverside Apartments", "Atlas Renovation", "In Progress", "68%", "€420k", "Concrete crew", "High"],
  ["North Gate Offices", "NovaBuild SRL", "Pending", "24%", "€180k", "Electrical team", "Medium"],
  ["Logistics Hall", "GreenSite Logistics", "In Progress", "18%", "€610k", "Steel crew", "High"],
  ["Commercial Ground Floor", "Maison Delcourt", "Completed", "100%", "€96k", "Interior team", "Low"],
  ["Parking Structure", "Urbania Group", "Cancelled", "8%", "€740k", "Estimating", "Medium"],
];

const statusClassNames: Record<string, string> = {
  Completed: "status-completed",
  Pending: "status-pending",
  "In Progress": "status-progress",
  Cancelled: "status-cancelled",
};

export function DashboardPage() {
  return (
    <section className="page-stack">
      <section className="dashboard-banner">
        <div>
          <p className="eyebrow">Construction operations</p>
          <h1>Upgrade project control with Chantier360 Pro</h1>
          <p>
            Unlock advanced profitability reports, automated reminders, QR
            equipment tracking, and multi-site planning controls.
          </p>
        </div>
        <div className="banner-actions">
          <button className="banner-cta" type="button">
            Upgrade Now
          </button>
        </div>
      </section>

      <div className="metrics-grid overview-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="analytics-grid">
        <section className="panel analytics-card">
          <div className="panel-heading">
            <div>
              <h2>Overview</h2>
              <p>Monthly revenue, margin, and unpaid exposure.</p>
            </div>
            <span className="status-badge status-available">Healthy</span>
          </div>
          <div className="chart-bars" aria-label="Revenue chart">
            {[52, 66, 48, 72, 81, 64, 88, 76].map((height, index) => (
              <span key={index} style={{ "--bar-height": `${height}%` } as CSSProperties} />
            ))}
          </div>
          <div className="analytics-summary">
            <span>
              <strong>31.8%</strong>
              Gross margin
            </span>
            <span>
              <strong>€38.2k</strong>
              Unpaid
            </span>
            <span>
              <strong>14 days</strong>
              Avg. collection
            </span>
          </div>
        </section>

        <section className="panel analytics-card">
          <div className="panel-heading">
            <div>
              <h2>Project performance</h2>
              <p>Progress trend across active construction sites.</p>
            </div>
            <button className="icon-button" title="More options" type="button">
              <MoreHorizontal aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="line-chart" aria-label="Project performance chart">
            <svg viewBox="0 0 560 190" role="img">
              <defs>
                <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M20 150 C80 112 108 128 156 92 C214 49 250 85 302 64 C368 36 408 78 456 52 C494 32 526 46 540 36 L540 180 L20 180 Z"
                fill="url(#lineFill)"
              />
              <path
                d="M20 150 C80 112 108 128 156 92 C214 49 250 85 302 64 C368 36 408 78 456 52 C494 32 526 46 540 36"
                fill="none"
                stroke="#1d4ed8"
                strokeLinecap="round"
                strokeWidth="4"
              />
              {[20, 156, 302, 456, 540].map((cx, index) => (
                <circle
                  cx={cx}
                  cy={[150, 92, 64, 52, 36][index]}
                  fill="#FFFFFF"
                  key={cx}
                  r="6"
                  stroke="#1d4ed8"
                  strokeWidth="3"
                />
              ))}
            </svg>
          </div>
        </section>

        <section className="panel analytics-card">
          <div className="panel-heading">
            <div>
              <h2>Today&apos;s site activity</h2>
              <p>Teams, deliveries, and maintenance windows.</p>
            </div>
            <span className="status-badge status-in_use">Live</span>
          </div>
          <div className="timeline-list compact-list">
            {planning.map(([time, site, team, status]) => (
              <article className="timeline-item" key={`${time}-${site}`}>
                <span>{time}</span>
                <div>
                  <strong>{site}</strong>
                  <small>{team}</small>
                </div>
                <em>{status}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="panel analytics-card">
          <div className="panel-heading">
            <div>
              <h2>Alerts and recent activity</h2>
              <p>Invoices, stock, maintenance, and project blockers.</p>
            </div>
            <AlertTriangle aria-hidden="true" className="panel-icon-warning" size={20} />
          </div>
          <div className="alert-list">
            <span>Invoice INV-2218 is overdue by 9 days</span>
            <span>Concrete anchors are below minimum stock</span>
            <span>Crane CR-019 maintenance due tomorrow</span>
            <span>Parking Structure tender expires in 3 days</span>
          </div>
          <div className="activity-list">
            {activity.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel operations-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Project operations</h2>
            <p>Filtered view of active sites, budgets, teams, and priority.</p>
          </div>
          <button className="secondary-action" type="button">
            <ArrowUpRight aria-hidden="true" size={17} />
            View all
          </button>
        </div>

        <div className="table-toolbar">
          <div className="segmented-control">
            {["All", "Completed", "In Progress", "Pending 2", "Cancelled"].map((tab) => (
              <button className={tab === "All" ? "active" : ""} key={tab} type="button">
                {tab}
              </button>
            ))}
          </div>
          <div className="table-actions">
            <label className="search-box">
              <Search aria-hidden="true" size={18} />
              <input placeholder="Search projects..." />
            </label>
            <button className="secondary-action" type="button">
              <Filter aria-hidden="true" size={17} />
              Filters
            </button>
            <button className="secondary-action" type="button">
              <Download aria-hidden="true" size={17} />
              Export
            </button>
          </div>
        </div>

        <div className="operations-table">
          <div className="operations-head">
            <label aria-label="Select all"><input type="checkbox" /></label>
            <span>Project ↕</span>
            <span>Client ↕</span>
            <span>Status ↕</span>
            <span>Progress ↕</span>
            <span>Budget ↕</span>
            <span>Team ↕</span>
            <span>Priority ↕</span>
            <span />
          </div>
          {projectRows.map(([project, client, status, progress, budget, team, priority]) => (
            <article className="operations-row" key={project}>
              <label aria-label={`Select ${project}`}><input type="checkbox" /></label>
              <strong>{project}</strong>
              <span>{client}</span>
              <span className={`status-badge ${statusClassNames[status]}`}>
                {status}
              </span>
              <span className="progress-cell">
                <i style={{ "--progress": progress } as CSSProperties} />
                {progress}
              </span>
              <span>{budget}</span>
              <span>{team}</span>
              <span
                className={
                  priority === "High"
                    ? "priority-badge priority-high"
                    : priority === "Medium"
                      ? "priority-badge priority-normal"
                      : "priority-badge priority-low"
                }
              >
                {priority}
              </span>
              <button className="row-menu" title="More actions" type="button">
                <MoreHorizontal aria-hidden="true" size={18} />
              </button>
            </article>
          ))}
        </div>

        <div className="table-pagination">
          <span>
            <Clock3 aria-hidden="true" size={15} />
            Showing 1-5 of 42 projects
          </span>
          <div>
            <button type="button">⏮</button>
            <button type="button">◀</button>
            <button className="active" type="button">1</button>
            <button type="button">2</button>
            <button type="button">▶</button>
            <button type="button">⏭</button>
          </div>
        </div>
      </section>
    </section>
  );
}
