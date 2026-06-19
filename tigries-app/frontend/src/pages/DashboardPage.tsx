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

// ── Static demo data ─────────────────────────────────────────────

const metrics = [
  { icon: ReceiptText, label: "Monthly revenue",     value: "€248.6k", trend: "+41% vs last month",  tone: "blue"  as const },
  { icon: HardHat,    label: "Active projects",      value: "42",      trend: "+12% vs last month",  tone: "cyan"  as const },
  { icon: AlertTriangle, label: "Unpaid invoices",   value: "€38.2k",  trend: "-8% vs last month",   tone: "rose"  as const },
  { icon: Truck,      label: "Available equipment",  value: "118",     trend: "+9% vs last month",   tone: "green" as const },
];

const todaySchedule = [
  { time: "07:30", site: "Riverside Apartments",  team: "Concrete crew",      status: "In progress", cls: "status-progress"  },
  { time: "09:00", site: "North Gate Offices",    team: "Electrical team",    status: "Scheduled",   cls: "status-pending"   },
  { time: "13:30", site: "Atlas Logistics Hall",  team: "Equipment delivery", status: "Confirmed",   cls: "status-available" },
  { time: "16:00", site: "Depot Zaventem",        team: "Maintenance review", status: "Pending",     cls: "status-pending"   },
];

const alerts = [
  { level: "high",   text: "Invoice INV-2218 is overdue by 9 days",        action: "Review"   },
  { level: "high",   text: "Crane CR-019 maintenance due tomorrow",         action: "Schedule" },
  { level: "medium", text: "Concrete anchors below minimum stock level",    action: "Reorder"  },
  { level: "medium", text: "Parking Structure tender expires in 3 days",    action: "Renew"    },
];

const activity = [
  { ago: "2h ago",  text: "Quote Q-1047 approved for Maison Delcourt"                   },
  { ago: "4h ago",  text: "Excavator EX-204 assigned to Riverside Apartments"           },
  { ago: "6h ago",  text: "Invoice INV-2218 payment reminder sent"                      },
  { ago: "1d ago",  text: "Low stock alert created for M8 concrete anchors"             },
];

const projectRows = [
  { name: "Riverside Apartments",   client: "Atlas Renovation",      status: "In Progress", cls: "status-progress",  progress: "68%",  budget: "€420k", team: "Concrete crew",  priority: "High"   },
  { name: "North Gate Offices",     client: "NovaBuild SRL",         status: "Pending",     cls: "status-pending",   progress: "24%",  budget: "€180k", team: "Electrical team",priority: "Medium" },
  { name: "Logistics Hall",         client: "GreenSite Logistics",   status: "In Progress", cls: "status-progress",  progress: "18%",  budget: "€610k", team: "Steel crew",     priority: "High"   },
  { name: "Commercial Ground Floor",client: "Maison Delcourt",       status: "Completed",   cls: "status-completed", progress: "100%", budget: "€96k",  team: "Interior team",  priority: "Low"    },
  { name: "Parking Structure",      client: "Urbania Group",         status: "Cancelled",   cls: "status-cancelled", progress: "8%",   budget: "€740k", team: "Estimating",     priority: "Medium" },
];

// ── Helpers ──────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatToday() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  }).format(new Date());
}

// ── Component ────────────────────────────────────────────────────

export function DashboardPage() {
  return (
    <section className="page-stack">

      {/* ── Hero banner ── */}
      <div className="dashboard-banner">
        <div className="dash-banner-left">
          <p className="eyebrow">btp360 · Operations</p>
          <h1>{getGreeting()}</h1>
          <p>{formatToday()}</p>
        </div>
        <div className="dash-banner-kpis">
          <div className="dash-banner-kpi">
            <strong>42</strong>
            <span>Active sites</span>
          </div>
          <div className="dash-banner-kpi">
            <strong>4</strong>
            <span>Alerts today</span>
          </div>
          <div className="dash-banner-kpi">
            <strong>€248k</strong>
            <span>This month</span>
          </div>
        </div>
        <div className="banner-actions">
          <button className="banner-cta" type="button">
            <ArrowUpRight aria-hidden="true" size={14} />
            Reports
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="metrics-grid overview-grid">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* ── Analytics row ── */}
      <div className="analytics-grid">

        {/* Revenue chart */}
        <section className="panel analytics-card">
          <div className="panel-heading">
            <div>
              <h2>Revenue overview</h2>
              <p>Monthly revenue, margin, and unpaid exposure.</p>
            </div>
            <span className="dash-health-badge dash-health-ok">Healthy</span>
          </div>
          <div className="chart-bars" aria-label="Monthly revenue chart">
            {[52, 66, 48, 72, 81, 64, 88, 76].map((h, i) => (
              <span key={i} style={{ "--bar-height": `${h}%` } as CSSProperties} />
            ))}
          </div>
          <div className="analytics-summary">
            <span><strong>31.8%</strong>Gross margin</span>
            <span><strong>€38.2k</strong>Unpaid</span>
            <span><strong>14 days</strong>Avg. collection</span>
          </div>
        </section>

        {/* Project performance */}
        <section className="panel analytics-card">
          <div className="panel-heading">
            <div>
              <h2>Project performance</h2>
              <p>Progress trend across active construction sites.</p>
            </div>
            <button className="icon-button" title="More options" type="button">
              <MoreHorizontal aria-hidden="true" size={16} />
            </button>
          </div>
          <div className="line-chart" aria-label="Project performance chart">
            <svg viewBox="0 0 560 190" role="img" aria-label="Line chart showing upward project performance trend">
              <defs>
                <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%"   stopColor="#1d4ed8" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0"    />
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
                strokeWidth="2.5"
              />
              {([[20,150],[156,92],[302,64],[456,52],[540,36]] as [number,number][]).map(([cx,cy],i) => (
                <circle cx={cx} cy={cy} fill="#ffffff" key={i} r="5" stroke="#1d4ed8" strokeWidth="2.5" />
              ))}
            </svg>
          </div>
        </section>
      </div>

      {/* ── Operational row: schedule · alerts · activity ── */}
      <div className="dash-ops-grid">

        {/* Today's schedule */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Today's schedule</h2>
              <p>Active sites and crews on the ground.</p>
            </div>
            <span className="dash-health-badge dash-health-live">Live</span>
          </div>
          <div className="dash-timeline">
            {todaySchedule.map(({ time, site, team, status, cls }) => (
              <article className="dash-timeline-item" key={`${time}-${site}`}>
                <span className="dash-time">{time}</span>
                <div className="dash-timeline-body">
                  <strong>{site}</strong>
                  <small>{team}</small>
                </div>
                <span className={`status-badge ${cls}`}>{status}</span>
              </article>
            ))}
          </div>
        </section>

        {/* Critical alerts */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Critical alerts</h2>
              <p>Items requiring immediate attention.</p>
            </div>
            <AlertTriangle aria-hidden="true" className="panel-icon-warning" size={17} />
          </div>
          <div className="dash-alerts">
            {alerts.map(({ level, text, action }) => (
              <article className={`dash-alert dash-alert-${level}`} key={text}>
                <div className="dash-alert-dot" aria-hidden="true" />
                <p>{text}</p>
                <button type="button">{action}</button>
              </article>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent activity</h2>
              <p>Latest changes across all modules.</p>
            </div>
          </div>
          <div className="dash-activity">
            {activity.map(({ ago, text }) => (
              <article className="dash-activity-item" key={text}>
                <span className="dash-activity-dot" aria-hidden="true" />
                <div>
                  <p>{text}</p>
                  <small>{ago}</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* ── Project operations table ── */}
      <section className="panel operations-table-panel">
        <div className="panel-heading">
          <div>
            <h2>Project operations</h2>
            <p>Active sites, budgets, teams, and priority.</p>
          </div>
          <button className="secondary-action" type="button">
            <ArrowUpRight aria-hidden="true" size={14} />
            View all
          </button>
        </div>

        <div className="table-toolbar">
          <div className="segmented-control">
            {["All", "In Progress", "Pending", "Completed", "Cancelled"].map((tab) => (
              <button className={tab === "All" ? "active" : ""} key={tab} type="button">
                {tab}
              </button>
            ))}
          </div>
          <div className="table-actions">
            <label className="search-box" aria-label="Search projects">
              <Search aria-hidden="true" size={14} />
              <input placeholder="Search projects…" />
            </label>
            <button className="secondary-action" type="button">
              <Filter aria-hidden="true" size={14} />
              Filters
            </button>
            <button className="secondary-action" type="button">
              <Download aria-hidden="true" size={14} />
              Export
            </button>
          </div>
        </div>

        <div className="operations-table">
          <div className="dash-ops-head">
            <span>Project</span>
            <span>Client</span>
            <span>Status</span>
            <span>Progress</span>
            <span>Budget</span>
            <span>Team</span>
            <span>Priority</span>
            <span />
          </div>
          {projectRows.map(({ name, client, status, cls, progress, budget, team, priority }) => (
            <article className="dash-ops-row" key={name}>
              <strong>{name}</strong>
              <span>{client}</span>
              <span className={`status-badge ${cls}`}>{status}</span>
              <span className="progress-cell">
                <i style={{ "--progress": progress } as CSSProperties} />
                {progress}
              </span>
              <span>{budget}</span>
              <span>{team}</span>
              <span className={
                priority === "High"   ? "priority-badge priority-high"   :
                priority === "Medium" ? "priority-badge priority-normal" :
                                        "priority-badge priority-low"
              }>
                {priority}
              </span>
              <button className="row-menu" title="More actions" type="button">
                <MoreHorizontal aria-hidden="true" size={15} />
              </button>
            </article>
          ))}
        </div>

        <div className="table-pagination">
          <span>
            <Clock3 aria-hidden="true" size={13} />
            Showing 1–5 of 42 projects
          </span>
          <div>
            <button type="button">‹</button>
            <button className="active" type="button">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
            <button type="button">›</button>
          </div>
        </div>
      </section>

    </section>
  );
}
