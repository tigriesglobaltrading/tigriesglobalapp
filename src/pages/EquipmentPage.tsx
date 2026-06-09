import {
  ClipboardCheck,
  Edit3,
  PackagePlus,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Depot = {
  id: string;
  name: string;
  city: string;
};

type ToolStatus = "available" | "in_use" | "maintenance";
type ToolCondition = "New" | "Good" | "Used" | "Needs service";
type EquipmentTab =
  | "all"
  | "tools"
  | "machines"
  | "vehicles"
  | "maintenance"
  | "tracking";

type InventoryTool = {
  id: string;
  brand: string;
  name: string;
  reference: string;
  category: string;
  status: ToolStatus;
  depot_id: string | null;
  condition: ToolCondition;
  last_service_date: string | null;
  notes: string;
  depots: Depot | null;
};

type InventoryToolRow = Omit<InventoryTool, "depots"> & {
  depots: Depot | Depot[] | null;
};

type ToolForm = {
  brand: string;
  name: string;
  reference: string;
  category: string;
  status: ToolStatus;
  depot_id: string;
  condition: ToolCondition;
  last_service_date: string;
  notes: string;
};

const emptyForm: ToolForm = {
  brand: "",
  name: "",
  reference: "",
  category: "",
  status: "available",
  depot_id: "",
  condition: "Good",
  last_service_date: "",
  notes: "",
};

const statusLabels: Record<ToolStatus, string> = {
  available: "Available",
  in_use: "In use",
  maintenance: "Maintenance",
};

const equipmentTabs: Array<{ label: string; value: EquipmentTab }> = [
  { label: "All", value: "all" },
  { label: "Tools", value: "tools" },
  { label: "Machines", value: "machines" },
  { label: "Vehicles", value: "vehicles" },
  { label: "Maintenance", value: "maintenance" },
  { label: "Tracking", value: "tracking" },
];

export function EquipmentPage() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [tools, setTools] = useState<InventoryTool[]>([]);
  const [form, setForm] = useState<ToolForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<EquipmentTab>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | ToolStatus>("all");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadInventory();
  }, []);

  async function loadInventory() {
    setIsLoading(true);
    setError(null);

    const [depotsResponse, toolsResponse] = await Promise.all([
      supabase.from("depots").select("id, name, city").order("name"),
      supabase
        .from("inventory_tools")
        .select(
          "id, brand, name, reference, category, status, depot_id, condition, last_service_date, notes, depots(id, name, city)"
        )
        .order("brand")
        .order("name"),
    ]);

    if (depotsResponse.error || toolsResponse.error) {
      setError(
        depotsResponse.error?.message ??
          toolsResponse.error?.message ??
          "Unable to load equipment."
      );
    } else {
      setDepots(depotsResponse.data ?? []);
      setTools(
        ((toolsResponse.data ?? []) as InventoryToolRow[]).map((tool) => ({
          ...tool,
          depots: Array.isArray(tool.depots) ? tool.depots[0] ?? null : tool.depots,
        }))
      );
    }

    setIsLoading(false);
  }

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tools.filter((tool) => {
      const matchesTab =
        activeTab === "all" ||
        activeTab === "tools" ||
        (activeTab === "maintenance" && tool.status === "maintenance") ||
        (activeTab === "machines" &&
          tool.category.toLowerCase().includes("machine")) ||
        (activeTab === "vehicles" &&
          tool.category.toLowerCase().includes("vehicle")) ||
        (activeTab === "tracking" && tool.depot_id);
      const matchesStatus =
        statusFilter === "all" || tool.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [tool.brand, tool.name, tool.reference, tool.category, tool.depots?.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery));

      return matchesTab && matchesStatus && matchesQuery;
    });
  }, [activeTab, query, statusFilter, tools]);

  const counts = useMemo(
    () => ({
      total: tools.length,
      available: tools.filter((tool) => tool.status === "available").length,
      inUse: tools.filter((tool) => tool.status === "in_use").length,
      maintenance: tools.filter((tool) => tool.status === "maintenance").length,
    }),
    [tools]
  );

  function updateForm<Value extends keyof ToolForm>(
    key: Value,
    value: ToolForm[Value]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function startEdit(tool: InventoryTool) {
    setEditingId(tool.id);
    setForm({
      brand: tool.brand,
      name: tool.name,
      reference: tool.reference,
      category: tool.category,
      status: tool.status,
      depot_id: tool.depot_id ?? "",
      condition: tool.condition,
      last_service_date: tool.last_service_date ?? "",
      notes: tool.notes,
    });
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const payload = {
      ...form,
      depot_id: form.depot_id || null,
      last_service_date: form.last_service_date || null,
    };

    const response = editingId
      ? await supabase.from("inventory_tools").update(payload).eq("id", editingId)
      : await supabase.from("inventory_tools").insert(payload);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    await loadInventory();
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Equipment</p>
          <h1>Equipment registry</h1>
          <p>
            Manage reusable company assets, availability, assignments,
            maintenance, condition, history, and location.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="primary-action" onClick={startCreate} type="button">
            <Plus aria-hidden="true" size={18} />
            New asset
          </button>
        </div>
      </header>

      <div className="metrics-grid">
        <article className="mini-stat">
          <ClipboardCheck aria-hidden="true" size={20} />
          <span>Total assets</span>
          <strong>{counts.total}</strong>
        </article>
        <article className="mini-stat mini-stat-success">
          <PackagePlus aria-hidden="true" size={20} />
          <span>Available assets</span>
          <strong>{counts.available}</strong>
        </article>
        <article className="mini-stat mini-stat-warning">
          <Edit3 aria-hidden="true" size={20} />
          <span>Assigned</span>
          <strong>{counts.inUse}</strong>
        </article>
        <article className="mini-stat mini-stat-danger">
          <X aria-hidden="true" size={20} />
          <span>Maintenance</span>
          <strong>{counts.maintenance}</strong>
        </article>
      </div>

      {isFormOpen ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{editingId ? "Edit asset" : "Add asset"}</h2>
              <p>References stay unique across the full equipment registry.</p>
            </div>
            <button
              className="icon-button"
              onClick={() => setIsFormOpen(false)}
              title="Close"
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>

          <form className="record-form" onSubmit={handleSubmit}>
            <label>
              Brand
              <input
                required
                value={form.brand}
                onChange={(event) => updateForm("brand", event.target.value)}
                placeholder="Makita"
              />
            </label>
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="18V drill driver, compact excavator, van..."
              />
            </label>
            <label>
              Reference
              <input
                required
                value={form.reference}
                onChange={(event) => updateForm("reference", event.target.value)}
                placeholder="MAK-DDF484-001"
              />
            </label>
            <label>
              Category
              <input
                required
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                placeholder="Tools, Machines, Vehicles, Safety equipment..."
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as ToolStatus)
                }
              >
                <option value="available">Available</option>
                <option value="in_use">In use</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
            <label>
              Depot
              <select
                value={form.depot_id}
                onChange={(event) => updateForm("depot_id", event.target.value)}
              >
                <option value="">Unassigned</option>
                {depots.map((depot) => (
                  <option key={depot.id} value={depot.id}>
                    {depot.name} - {depot.city}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Condition
              <select
                value={form.condition}
                onChange={(event) =>
                  updateForm("condition", event.target.value as ToolCondition)
                }
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Used">Used</option>
                <option value="Needs service">Needs service</option>
              </select>
            </label>
            <label>
              Last service
              <input
                value={form.last_service_date}
                onChange={(event) =>
                  updateForm("last_service_date", event.target.value)
                }
                type="date"
              />
            </label>
            <label className="form-wide">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Batteries, assignment, inspection..."
              />
            </label>
            <div className="form-actions form-wide">
              <button className="primary-action" type="submit">
                <Save aria-hidden="true" size={18} />
                Save
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="segmented-control equipment-tabs">
          {equipmentTabs.map((tab) => (
            <button
              className={activeTab === tab.value ? "active" : ""}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="table-toolbar">
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search brand, ref, depot..."
            />
          </div>
          <div className="segmented-control">
            {(["all", "available", "in_use", "maintenance"] as const).map(
              (status) => (
                <button
                  className={statusFilter === status ? "active" : ""}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  {status === "all" ? "All" : statusLabels[status]}
                </button>
              )
            )}
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="muted-text">Loading...</p> : null}

        <div className="records-table inventory-table">
          <div className="records-head">
            <span>Asset</span>
            <span>Reference</span>
            <span>Depot</span>
            <span>Status</span>
            <span>Condition</span>
            <span />
          </div>
          {filteredTools.map((tool) => (
            <article className="records-row" key={tool.id}>
              <div>
                <strong>
                  {tool.brand} - {tool.name}
                </strong>
                <small>{tool.category}</small>
              </div>
              <span>{tool.reference}</span>
              <span>
                {tool.depots ? `${tool.depots.name}, ${tool.depots.city}` : "Unassigned"}
              </span>
              <span className={`status-badge status-${tool.status}`}>
                {statusLabels[tool.status]}
              </span>
              <span>{tool.condition}</span>
              <button
                className="icon-button"
                onClick={() => startEdit(tool)}
                title="Edit"
                type="button"
              >
                <Edit3 aria-hidden="true" size={17} />
              </button>
            </article>
          ))}
          {!isLoading && filteredTools.length === 0 ? (
            <p className="muted-text empty-records">
              No equipment matches this view.
            </p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
