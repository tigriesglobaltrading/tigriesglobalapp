import { Building2, Edit3, Plus, Save, Search, Star, Users, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pagination } from "../components/Pagination";
import { usePagination } from "../lib/pagination";
import { supabase } from "../lib/supabase";

type ClientStatus = "active" | "prospect" | "inactive";
type ClientPriority = "high" | "normal" | "low";

type Client = {
  id: string;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  status: ClientStatus;
  priority: ClientPriority;
  current_project: string;
  notes: string;
};

type ClientForm = Omit<Client, "id">;

const emptyForm: ClientForm = {
  company: "",
  contact_name: "",
  email: "",
  phone: "",
  city: "",
  status: "active",
  priority: "normal",
  current_project: "",
  notes: "",
};

const statusLabels: Record<ClientStatus, string> = {
  active: "Active",
  prospect: "Prospect",
  inactive: "Inactive",
};

const priorityLabels: Record<ClientPriority, string> = {
  high: "High",
  normal: "Normal",
  low: "Low",
};

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClientStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadClients();
  }, []);

  async function loadClients() {
    setIsLoading(true);
    setError(null);

    const { data, error: clientsError } = await supabase
      .from("clients")
      .select(
        "id, company, contact_name, email, phone, city, status, priority, current_project, notes"
      )
      .order("company");

    if (clientsError) {
      setError(clientsError.message);
    } else {
      setClients((data ?? []) as Client[]);
    }

    setIsLoading(false);
  }

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesStatus =
        statusFilter === "all" || client.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          client.company,
          client.contact_name,
          client.email,
          client.phone,
          client.city,
          client.current_project,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [clients, query, statusFilter]);

  const pag = usePagination(filteredClients, 25, `${query}${statusFilter}`);

  const counts = useMemo(
    () => ({
      total: clients.length,
      active: clients.filter((client) => client.status === "active").length,
      prospects: clients.filter((client) => client.status === "prospect").length,
      priority: clients.filter((client) => client.priority === "high").length,
    }),
    [clients]
  );

  function updateForm<Value extends keyof ClientForm>(
    key: Value,
    value: ClientForm[Value]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function startEdit(client: Client) {
    setEditingId(client.id);
    setForm({
      company: client.company,
      contact_name: client.contact_name,
      email: client.email,
      phone: client.phone,
      city: client.city,
      status: client.status,
      priority: client.priority,
      current_project: client.current_project,
      notes: client.notes,
    });
    setIsFormOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = editingId
      ? await supabase.from("clients").update(form).eq("id", editingId)
      : await supabase.from("clients").insert(form);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    await loadClients();
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Clients</p>
          <h1>Client portfolio</h1>
          <p>
            Centralize contacts, priorities, commercial status, and active
            projects.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="primary-action" onClick={startCreate} type="button">
            <Plus aria-hidden="true" size={18} />
            New client
          </button>
        </div>
      </header>

      <div className="metrics-grid">
        <article className="mini-stat">
          <Users aria-hidden="true" size={20} />
          <span>Total clients</span>
          <strong>{counts.total}</strong>
        </article>
        <article className="mini-stat mini-stat-success">
          <Building2 aria-hidden="true" size={20} />
          <span>Active</span>
          <strong>{counts.active}</strong>
        </article>
        <article className="mini-stat mini-stat-warning">
          <Search aria-hidden="true" size={20} />
          <span>Prospects</span>
          <strong>{counts.prospects}</strong>
        </article>
        <article className="mini-stat mini-stat-danger">
          <Star aria-hidden="true" size={20} />
          <span>High priority</span>
          <strong>{counts.priority}</strong>
        </article>
      </div>

      {isFormOpen ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{editingId ? "Edit client" : "Add client"}</h2>
              <p>Keep the contact, project, and priority level up to date.</p>
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
              Company
              <input
                required
                value={form.company}
                onChange={(event) => updateForm("company", event.target.value)}
                placeholder="Atlas Renovation"
              />
            </label>
            <label>
              Contact
              <input
                value={form.contact_name}
                onChange={(event) =>
                  updateForm("contact_name", event.target.value)
                }
                placeholder="Karim Haddad"
              />
            </label>
            <label>
              Email
              <input
                value={form.email}
                onChange={(event) => updateForm("email", event.target.value)}
                placeholder="contact@client.be"
                type="email"
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) => updateForm("phone", event.target.value)}
                placeholder="+32 ..."
              />
            </label>
            <label>
              City
              <input
                value={form.city}
                onChange={(event) => updateForm("city", event.target.value)}
                placeholder="Brussels"
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  updateForm("status", event.target.value as ClientStatus)
                }
              >
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) =>
                  updateForm("priority", event.target.value as ClientPriority)
                }
              >
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              Current project
              <input
                value={form.current_project}
                onChange={(event) =>
                  updateForm("current_project", event.target.value)
                }
                placeholder="Louise building renovation"
              />
            </label>
            <label className="form-wide">
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
                placeholder="Preferences, follow-ups, commercial context..."
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
        <div className="table-toolbar">
          <div className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company, contact, project..."
            />
          </div>
          <div className="segmented-control">
            {(["all", "active", "prospect", "inactive"] as const).map(
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

        <div className="records-table clients-table">
          <div className="records-head">
            <span>Client</span>
            <span>Contact</span>
            <span>Project</span>
            <span>Status</span>
            <span>Priority</span>
            <span />
          </div>
          {pag.pageItems.map((client) => (
            <article className="records-row" key={client.id}>
              <div>
                <strong>{client.company}</strong>
                <small>{client.city || "City missing"}</small>
              </div>
              <div>
                <span>{client.contact_name || "Contact missing"}</span>
                <small>{client.email || client.phone || "Contact details missing"}</small>
              </div>
              <span>{client.current_project || "No active project"}</span>
              <span className={`status-badge client-${client.status}`}>
                {statusLabels[client.status]}
              </span>
              <span className={`priority-badge priority-${client.priority}`}>
                {priorityLabels[client.priority]}
              </span>
              <button
                className="icon-button"
                onClick={() => startEdit(client)}
                title="Edit"
                type="button"
              >
                <Edit3 aria-hidden="true" size={17} />
              </button>
            </article>
          ))}
        </div>
        <Pagination
          changePageSize={pag.changePageSize}
          goToPage={pag.goToPage}
          page={pag.page}
          pageSize={pag.pageSize}
          totalItems={pag.totalItems}
          totalPages={pag.totalPages}
        />
      </section>
    </section>
  );
}
