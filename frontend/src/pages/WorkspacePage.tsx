import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Edit3,
  FileText,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth-context";
import {
  deleteWorkspaceRecord,
  listWorkspaceRecords,
  saveWorkspaceRecord,
  type ModuleKey,
  type WorkspaceRecord,
} from "../lib/workspace-modules";

type FieldType = "text" | "number" | "date" | "select" | "textarea";

type FieldConfig = {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  placeholder?: string;
  wide?: boolean;
  required?: boolean;
};

type ModuleConfig = {
  key: ModuleKey;
  title: string;
  eyebrow: string;
  description: string;
  createLabel: string;
  emptyLabel: string;
  icon: typeof ClipboardList;
  fields: FieldConfig[];
  seed: WorkspaceRecord[];
  filters: string[];
  columns: [string, string, string, string, string];
  stats: Array<{
    label: string;
    tone?: "success" | "warning" | "danger";
    value: (records: WorkspaceRecord[]) => string;
  }>;
};

type WorkspacePageProps = {
  title: string;
  description: string;
};

const moduleConfigs: Record<string, ModuleConfig> = {
  projects: {
    key: "projects",
    title: "Projects",
    eyebrow: "Operations / Projects",
    description:
      "Connect clients, budgets, progress, teams, equipment, stock, tasks, and profitability in one project workspace.",
    createLabel: "New project",
    emptyLabel: "project",
    icon: ClipboardList,
    filters: ["All", "Preparation", "Active", "Paused", "Completed", "Cancelled"],
    columns: ["Project", "Client", "Budget", "Status", "Deadline"],
    fields: [
      { key: "title", label: "Project name", required: true, placeholder: "Avenue Louise renovation" },
      { key: "subtitle", label: "Client", required: true, placeholder: "Atlas Renovation" },
      { key: "owner", label: "Project manager", placeholder: "Nora Lambert" },
      { key: "amount", label: "Budget", placeholder: "€84,000" },
      { key: "status", label: "Status", type: "select", options: ["Preparation", "Active", "Paused", "Completed", "Cancelled"] },
      { key: "date", label: "Deadline", type: "date" },
      { key: "address", label: "Site address", wide: true, placeholder: "48 Avenue Louise, Brussels" },
      { key: "notes", label: "Scope notes", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("projects", "Louise office renovation", "Nexa Group", "Active", "Nora Lambert", "2026-07-12", "€84,000"),
      createSeed("projects", "Uccle townhouse extension", "Vermeulen Family", "Preparation", "Adam Moreau", "2026-08-03", "€126,500"),
      createSeed("projects", "Waterloo retail fit-out", "Kobe Retail", "Paused", "Lea Denis", "2026-06-28", "€39,900"),
    ],
    stats: [
      { label: "Active projects", value: (records) => String(records.filter((record) => record.status === "Active").length) },
      { label: "Preparation", value: (records) => String(records.filter((record) => record.status === "Preparation").length), tone: "warning" },
      { label: "Completed", value: (records) => String(records.filter((record) => record.status === "Completed").length), tone: "success" },
      { label: "Total budget", value: (records) => sumEuro(records.map((record) => record.amount)) },
    ],
  },
  quotes: {
    key: "quotes",
    title: "Quotes",
    eyebrow: "Sales / Quotes",
    description:
      "Prepare client quotes with line items, labor, materials, tax, discounts, validity dates, and conversion readiness.",
    createLabel: "New quote",
    emptyLabel: "quote",
    icon: FileText,
    filters: ["All", "Draft", "Sent", "Accepted", "Rejected"],
    columns: ["Quote", "Client", "Total", "Status", "Valid until"],
    fields: [
      { key: "title", label: "Quote number", required: true, placeholder: "QT-2026-014" },
      { key: "subtitle", label: "Client", required: true },
      { key: "owner", label: "Project", placeholder: "Louise office renovation" },
      { key: "amount", label: "Total", placeholder: "€12,400" },
      { key: "status", label: "Status", type: "select", options: ["Draft", "Sent", "Accepted", "Rejected"] },
      { key: "date", label: "Validity date", type: "date" },
      { key: "notes", label: "Commercial notes", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("quotes", "QT-2026-014", "Nexa Group", "Sent", "Louise office renovation", "2026-06-25", "€18,750"),
      createSeed("quotes", "QT-2026-015", "Kobe Retail", "Draft", "Waterloo retail fit-out", "2026-07-02", "€9,800"),
      createSeed("quotes", "QT-2026-016", "Vermeulen Family", "Accepted", "Uccle townhouse extension", "2026-06-18", "€31,200"),
    ],
    stats: [
      { label: "Open quotes", value: (records) => String(records.filter((record) => record.status !== "Accepted" && record.status !== "Rejected").length) },
      { label: "Accepted", value: (records) => String(records.filter((record) => record.status === "Accepted").length), tone: "success" },
      { label: "Drafts", value: (records) => String(records.filter((record) => record.status === "Draft").length), tone: "warning" },
      { label: "Pipeline value", value: (records) => sumEuro(records.map((record) => record.amount)) },
    ],
  },
  team: {
    key: "team",
    title: "Team",
    eyebrow: "Company / Team",
    description:
      "Manage employees, roles, skills, hourly rates, availability, absences, documents, assigned projects, hours, and permissions.",
    createLabel: "New team member",
    emptyLabel: "team member",
    icon: Users,
    filters: ["All", "Active", "Inactive", "On Leave", "Sick"],
    columns: ["Employee", "Role", "Rate", "Status", "Next availability"],
    fields: [
      { key: "title", label: "Employee name", required: true },
      { key: "subtitle", label: "Role", required: true, placeholder: "Site manager" },
      { key: "owner", label: "Assigned project", placeholder: "Louise office renovation" },
      { key: "amount", label: "Hourly rate", placeholder: "€58/h" },
      { key: "status", label: "Status", type: "select", options: ["Active", "Inactive", "On Leave", "Sick"] },
      { key: "date", label: "Next availability", type: "date" },
      { key: "skills", label: "Skills", wide: true, placeholder: "Concrete, finishing, electrical" },
      { key: "notes", label: "Internal notes", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("team", "Nora Lambert", "Project manager", "Active", "Louise office renovation", "2026-06-14", "€68/h"),
      createSeed("team", "Adam Moreau", "Site supervisor", "Active", "Unassigned", "2026-06-10", "€54/h"),
      createSeed("team", "Sofia Peeters", "Electrician", "Sick", "Medical leave", "2026-06-21", "€48/h"),
    ],
    stats: [
      { label: "Team members", value: (records) => String(records.length) },
      { label: "Active", value: (records) => String(records.filter((record) => record.status === "Active").length), tone: "success" },
      { label: "On leave", value: (records) => String(records.filter((record) => record.status === "On Leave").length), tone: "warning" },
      { label: "Sick", value: (records) => String(records.filter((record) => record.status === "Sick").length), tone: "danger" },
    ],
  },
  planning: {
    key: "planning",
    title: "Planning",
    eyebrow: "Operations / Planning",
    description:
      "Schedule employees, equipment, vehicles, machines, deliveries, meetings, absences, and project assignments.",
    createLabel: "New event",
    emptyLabel: "planning event",
    icon: CalendarDays,
    filters: ["All", "Planned", "Confirmed", "In Progress", "Completed", "Cancelled"],
    columns: ["Event", "Resource", "Project", "Status", "Date"],
    fields: [
      { key: "title", label: "Event", required: true, placeholder: "Concrete delivery" },
      { key: "subtitle", label: "Resource", required: true, placeholder: "Team A / Crane / Van" },
      { key: "owner", label: "Project", placeholder: "Louise office renovation" },
      { key: "amount", label: "Time window", placeholder: "08:00 - 12:00" },
      { key: "type", label: "Type", type: "select", options: ["Work", "Delivery", "Meeting", "Maintenance", "Absence", "Reservation"] },
      { key: "status", label: "Status", type: "select", options: ["Planned", "Confirmed", "In Progress", "Completed", "Cancelled"] },
      { key: "date", label: "Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("planning", "Concrete delivery", "Truck BE-214", "Planned", "Louise office renovation", "2026-06-10", "08:00 - 10:00"),
      createSeed("planning", "Electrical rough-in", "Sofia Peeters", "Confirmed", "Uccle townhouse extension", "2026-06-11", "09:00 - 17:00"),
      createSeed("planning", "Client site meeting", "Nora Lambert", "Planned", "Waterloo retail fit-out", "2026-06-12", "14:30"),
    ],
    stats: [
      { label: "Planned", value: (records) => String(records.filter((record) => record.status === "Planned").length) },
      { label: "Confirmed", value: (records) => String(records.filter((record) => record.status === "Confirmed").length), tone: "warning" },
      { label: "Completed", value: (records) => String(records.filter((record) => record.status === "Completed").length), tone: "success" },
      { label: "Events", value: (records) => String(records.length) },
    ],
  },
  stock: {
    key: "stock",
    title: "Stock",
    eyebrow: "Warehouse / Stock",
    description:
      "Manage consumable materials, quantities, units, minimum levels, suppliers, movements, project consumption, and low-stock alerts.",
    createLabel: "New stock item",
    emptyLabel: "stock item",
    icon: Package,
    filters: ["All", "Available", "Low Stock", "Out Of Stock"],
    columns: ["Material", "Supplier", "Quantity", "Status", "Last movement"],
    fields: [
      { key: "title", label: "Material", required: true, placeholder: "Cement CEM II 25kg" },
      { key: "subtitle", label: "Supplier", required: true, placeholder: "BuildMat Brussels" },
      { key: "owner", label: "Depot", placeholder: "Brussels Depot" },
      { key: "amount", label: "Quantity", placeholder: "124 bags" },
      { key: "unit", label: "Unit", placeholder: "bags" },
      { key: "date", label: "Last movement", type: "date" },
      { key: "minimum", label: "Minimum stock", placeholder: "40 bags" },
      { key: "notes", label: "Notes", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("stock", "Cement CEM II 25kg", "BuildMat Brussels", "Available", "Brussels Depot", "2026-06-08", "124 bags"),
      createSeed("stock", "White silicone 310ml", "ProSeal", "Low Stock", "North Depot", "2026-06-07", "18 tubes"),
      createSeed("stock", "Electrical cable 3G2.5", "ElectroPlus", "Available", "Brussels Depot", "2026-06-06", "300 m"),
    ],
    stats: [
      { label: "Materials", value: (records) => String(records.length) },
      { label: "Low stock", value: (records) => String(records.filter((record) => record.status === "Low Stock").length), tone: "danger" },
      { label: "Out of stock", value: (records) => String(records.filter((record) => record.status === "Out Of Stock").length), tone: "warning" },
      { label: "Available", value: (records) => String(records.filter((record) => record.status === "Available").length), tone: "success" },
    ],
  },
  tasks: {
    key: "tasks",
    title: "Tasks",
    eyebrow: "Execution / Tasks",
    description:
      "Track project and internal tasks with status, priority, assignee, project link, deadline, comments, attachments, and validation.",
    createLabel: "New task",
    emptyLabel: "task",
    icon: ClipboardList,
    filters: ["All", "Todo", "In Progress", "Blocked", "Completed", "Validated"],
    columns: ["Task", "Project", "Priority", "Status", "Deadline"],
    fields: [
      { key: "title", label: "Task title", required: true },
      { key: "subtitle", label: "Project", required: true },
      { key: "owner", label: "Assigned to", placeholder: "Adam Moreau" },
      { key: "amount", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"] },
      { key: "status", label: "Status", type: "select", options: ["Todo", "In Progress", "Blocked", "Completed", "Validated"] },
      { key: "date", label: "Deadline", type: "date" },
      { key: "notes", label: "Description", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("tasks", "Validate structural openings", "Louise office renovation", "In Progress", "Nora Lambert", "2026-06-13", "High"),
      createSeed("tasks", "Order plasterboards", "Uccle townhouse extension", "Todo", "Adam Moreau", "2026-06-10", "Medium"),
      createSeed("tasks", "Fix missing photos", "Waterloo retail fit-out", "Blocked", "Lea Denis", "2026-06-09", "Urgent"),
    ],
    stats: [
      { label: "Open tasks", value: (records) => String(records.filter((record) => record.status !== "Completed" && record.status !== "Validated").length) },
      { label: "Blocked", value: (records) => String(records.filter((record) => record.status === "Blocked").length), tone: "danger" },
      { label: "In progress", value: (records) => String(records.filter((record) => record.status === "In Progress").length), tone: "warning" },
      { label: "Completed", value: (records) => String(records.filter((record) => record.status === "Completed").length), tone: "success" },
    ],
  },
  reports: {
    key: "reports",
    title: "Reports",
    eyebrow: "Analytics / Reports",
    description:
      "Generate analytics for profitability, revenue, unpaid invoices, labor costs, equipment usage, stock consumption, maintenance alerts, and employee hours.",
    createLabel: "New report",
    emptyLabel: "report",
    icon: BarChart3,
    filters: ["All", "Ready", "Scheduled", "Draft", "Failed"],
    columns: ["Report", "Scope", "Owner", "Status", "Period end"],
    fields: [
      { key: "title", label: "Report name", required: true },
      { key: "subtitle", label: "Scope", required: true, placeholder: "Project profitability" },
      { key: "owner", label: "Owner", placeholder: "Accountant" },
      { key: "amount", label: "Export", type: "select", options: ["PDF", "CSV", "XLSX"] },
      { key: "status", label: "Status", type: "select", options: ["Ready", "Scheduled", "Draft", "Failed"] },
      { key: "date", label: "Period end", type: "date" },
      { key: "notes", label: "Included metrics", type: "textarea", wide: true },
    ],
    seed: [
      createSeed("reports", "Project profitability", "All active projects", "Ready", "Management", "2026-06-08", "PDF"),
      createSeed("reports", "Unpaid invoices", "Sales ledger", "Scheduled", "Accounting", "2026-06-30", "CSV"),
      createSeed("reports", "Equipment utilization", "Reusable assets", "Draft", "Operations", "2026-06-15", "XLSX"),
    ],
    stats: [
      { label: "Reports", value: (records) => String(records.length) },
      { label: "Ready", value: (records) => String(records.filter((record) => record.status === "Ready").length), tone: "success" },
      { label: "Scheduled", value: (records) => String(records.filter((record) => record.status === "Scheduled").length), tone: "warning" },
      { label: "Failed", value: (records) => String(records.filter((record) => record.status === "Failed").length), tone: "danger" },
    ],
  },
};

function createSeed(
  module: string,
  title: string,
  subtitle: string,
  status: string,
  owner: string,
  date: string,
  amount: string
): WorkspaceRecord {
  return {
    id: `${module}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    subtitle,
    status,
    owner,
    date,
    amount,
    data: {},
  };
}

export function WorkspacePage({ description, title }: WorkspacePageProps) {
  const { session } = useAuth();
  const config = moduleConfigs[title.toLowerCase()] ?? {
    ...moduleConfigs.projects,
    key: "projects" as ModuleKey,
    title,
    description,
  };
  const companyId = session?.user.id ?? "";
  const isReportsModule = config.key === "reports";
  const [records, setRecords] = useState<WorkspaceRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editingRecord, setEditingRecord] = useState<WorkspaceRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() =>
    createInitialForm(config)
  );

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextRecords = await listWorkspaceRecords(config.key, companyId);
      if (nextRecords.length === 0 && !isReportsModule) {
        await Promise.all(
          config.seed.map((record) =>
            saveWorkspaceRecord({
              companyId,
              form: recordToForm(record),
              moduleKey: config.key,
            })
          )
        );
        setRecords(await listWorkspaceRecords(config.key, companyId));
      } else {
        setRecords(nextRecords);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load records.");
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, config.key, config.seed, isReportsModule]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    void loadRecords();
  }, [companyId, loadRecords]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStatus =
        statusFilter === "All" || record.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          record.title,
          record.subtitle,
          record.status,
          record.owner,
          record.amount,
          record.date,
          ...Object.values(record.data),
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [query, records, statusFilter]);

  function startCreate() {
    if (isReportsModule) {
      return;
    }

    setEditingRecord(null);
    setForm(createInitialForm(config));
    setIsFormOpen(true);
  }

  function startEdit(record: WorkspaceRecord) {
    if (isReportsModule) {
      return;
    }

    setEditingRecord(record);
    setForm({
      ...record.data,
      title: record.title,
      subtitle: record.subtitle,
      owner: record.owner,
      amount: record.amount,
      status: record.status,
      date: record.date.slice(0, 10),
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRecord(null);
    setForm(createInitialForm(config));
  }

  function updateField(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await saveWorkspaceRecord({
        companyId,
        form,
        moduleKey: config.key,
        recordId: editingRecord?.id,
      });
      closeForm();
      await loadRecords();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save record.");
    }
  }

  async function deleteRecord(record: WorkspaceRecord) {
    if (isReportsModule) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${record.title}? This cannot be undone.`
    );

    if (confirmed) {
      setError(null);

      try {
        await deleteWorkspaceRecord(config.key, record.id, companyId);
        await loadRecords();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Unable to delete record.");
      }
    }
  }

  const Icon = config.icon;

  return (
    <section className="page-stack workspace-mvp">
      <header className="page-header">
        <div>
          <p className="eyebrow">{config.eyebrow}</p>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="page-header-actions">
          {isReportsModule ? null : (
            <button className="primary-action" onClick={startCreate} type="button">
              <Plus aria-hidden="true" size={18} />
              {config.createLabel}
            </button>
          )}
        </div>
      </header>

      <div className="metrics-grid">
        {config.stats.map((stat) => (
          <article
            className={`mini-stat${stat.tone ? ` mini-stat-${stat.tone}` : ""}`}
            key={stat.label}
          >
            <Icon aria-hidden="true" size={20} />
            <span>{stat.label}</span>
            <strong>{stat.value(records)}</strong>
          </article>
        ))}
      </div>

      {isFormOpen ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {editingRecord ? `Edit ${config.emptyLabel}` : config.createLabel}
              </h2>
              <p>Update the record and keep the workspace data consistent.</p>
            </div>
            <button
              className="icon-button"
              onClick={closeForm}
              title="Close"
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <form className="record-form" onSubmit={saveRecord}>
            {config.fields.map((field) => (
              <label className={field.wide ? "form-wide" : ""} key={field.key}>
                {field.label}
                {renderField(field, form[field.key] ?? "", updateField)}
              </label>
            ))}
            <div className="form-actions form-wide">
              <button className="primary-action" type="submit">
                <Save aria-hidden="true" size={18} />
                {editingRecord ? "Save changes" : "Create"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="table-toolbar">
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${config.title.toLowerCase()}...`}
              value={query}
            />
          </div>
          <div className="segmented-control">
            {config.filters.map((filter) => (
              <button
                className={statusFilter === filter ? "active" : ""}
                key={filter}
                onClick={() => setStatusFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="muted-text">Loading...</p> : null}

        <div className="records-table workspace-table">
          <div className="records-head">
            {config.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
            <span />
          </div>

          {filteredRecords.map((record) => (
            <article className="records-row" key={record.id}>
              <div>
                <strong>{record.title}</strong>
                <small>{record.owner || "No owner assigned"}</small>
              </div>
              <span>{record.subtitle}</span>
              <span>{record.amount}</span>
              <span className={`status-badge ${statusClass(record.status)}`}>
                {record.status}
              </span>
              <span>{formatDate(record.date)}</span>
              <div className="row-actions">
                {isReportsModule ? null : (
                  <>
                    <button
                      className="icon-button"
                      onClick={() => startEdit(record)}
                      title="Edit"
                      type="button"
                    >
                      <Edit3 aria-hidden="true" size={17} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => void deleteRecord(record)}
                      title="Delete"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        {filteredRecords.length === 0 ? (
          <div className="workspace-empty-state">
            <Icon aria-hidden="true" size={26} />
            <h2>No {config.emptyLabel}s found</h2>
            <p>Adjust filters or create a new record to continue.</p>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function createInitialForm(config: ModuleConfig) {
  return config.fields.reduce<Record<string, string>>((values, field) => {
    values[field.key] = field.options?.[0] ?? "";
    return values;
  }, {});
}

function recordToForm(record: WorkspaceRecord) {
  return {
    title: record.title,
    subtitle: record.subtitle,
    owner: record.owner,
    amount: record.amount,
    status: record.status,
    date: record.date,
    ...record.data,
  };
}

function renderField(
  field: FieldConfig,
  value: string,
  updateField: (key: string, value: string) => void
) {
  if (field.type === "textarea") {
    return (
      <textarea
        onChange={(event) => updateField(field.key, event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        value={value}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        onChange={(event) => updateField(field.key, event.target.value)}
        required={field.required}
        value={value}
      >
        {field.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      onChange={(event) => updateField(field.key, event.target.value)}
      placeholder={field.placeholder}
      required={field.required}
      type={field.type ?? "text"}
      value={value}
    />
  );
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (
    ["completed", "accepted", "available", "in stock", "done", "ready"].includes(
      normalized
    )
  ) {
    return "status-completed";
  }

  if (
    ["blocked", "cancelled", "rejected", "failed", "out of stock", "inactive"].includes(
      normalized
    )
  ) {
    return "status-cancelled";
  }

  if (
    ["draft", "planning", "scheduled", "ordered", "todo"].includes(normalized)
  ) {
    return "status-draft";
  }

  return "status-progress";
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function sumEuro(values: string[]) {
  const total = values.reduce((sum, value) => {
    const numeric = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);

  return new Intl.NumberFormat("en", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(total);
}
