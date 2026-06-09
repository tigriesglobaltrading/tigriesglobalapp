import { supabase } from "./supabase";

export type ModuleKey =
  | "projects"
  | "quotes"
  | "team"
  | "planning"
  | "stock"
  | "tasks"
  | "reports";

export type WorkspaceRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  owner: string;
  date: string;
  amount: string;
  data: Record<string, string>;
};

type SaveInput = {
  companyId: string;
  moduleKey: ModuleKey;
  recordId?: string;
  form: Record<string, string>;
};

export async function listWorkspaceRecords(
  moduleKey: ModuleKey,
  companyId: string
) {
  if (moduleKey === "reports") {
    return listReportRecords(companyId);
  }

  const { data, error } = await supabase
    .from(tableForModule(moduleKey))
    .select("*")
    .eq("company_id", companyId)
    .order(orderColumnForModule(moduleKey), { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => rowToRecord(moduleKey, row));
}

export async function saveWorkspaceRecord(input: SaveInput) {
  if (input.moduleKey === "reports") {
    return;
  }

  if (input.moduleKey === "stock") {
    await saveStockItem(input);
    return;
  }

  const payload = formToPayload(input.moduleKey, input.form, input.companyId);

  const response = input.recordId
    ? await supabase
        .from(tableForModule(input.moduleKey))
        .update(payload as never)
        .eq("id", input.recordId)
        .eq("company_id", input.companyId)
    : await supabase.from(tableForModule(input.moduleKey)).insert(payload as never);

  if (response.error) {
    throw response.error;
  }
}

export async function deleteWorkspaceRecord(
  moduleKey: ModuleKey,
  recordId: string,
  companyId: string
) {
  if (moduleKey === "reports") {
    return;
  }

  const { error } = await supabase
    .from(tableForModule(moduleKey))
    .delete()
    .eq("id", recordId)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }
}

async function saveStockItem({ companyId, form, recordId }: SaveInput) {
  const quantity = numberFromString(form.amount);
  const payload = {
    company_id: companyId,
    name: form.title || "Untitled material",
    category: form.category || "",
    minimum_quantity: numberFromString(form.minimum),
    supplier_name: form.subtitle || "",
    unit: form.unit || unitFromQuantity(form.amount),
    unit_price: numberFromString(form.unit_price),
    location: form.owner || "",
  };

  if (recordId) {
    const { error } = await supabase
      .from("stock_items")
      .update(payload)
      .eq("id", recordId)
      .eq("company_id", companyId);

    if (error) {
      throw error;
    }

    await createStockMovement(companyId, recordId, "adjustment", quantity);
    return;
  }

  const { data, error } = await supabase
    .from("stock_items")
    .insert({ ...payload, quantity: 0 })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  await createStockMovement(companyId, data.id as string, "adjustment", quantity);
}

async function createStockMovement(
  companyId: string,
  stockItemId: string,
  movementType: string,
  quantity: number
) {
  const { error } = await supabase.from("stock_movements").insert({
    company_id: companyId,
    stock_item_id: stockItemId,
    movement_type: movementType,
    quantity,
    notes: "Quantity updated from Stock module.",
  });

  if (error) {
    throw error;
  }
}

async function listReportRecords(companyId: string) {
  const [invoices, projects, equipment, stock, tasks, employees] =
    await Promise.all([
      supabase.from("invoices").select("status, issue_date, line_items, tax_rate, discount, deposit"),
      supabase.from("projects").select("status").eq("company_id", companyId),
      supabase.from("inventory_tools").select("status"),
      supabase.from("stock_items").select("name, status, quantity, minimum_quantity").eq("company_id", companyId),
      supabase.from("tasks").select("status").eq("company_id", companyId),
      supabase.from("employees").select("id, status").eq("company_id", companyId),
    ]);

  const errors = [invoices, projects, equipment, stock, tasks, employees]
    .map((response) => response.error)
    .filter(Boolean);

  if (errors[0]) {
    throw errors[0];
  }

  const unpaidInvoices = (invoices.data ?? []).filter((invoice) =>
    ["sent", "overdue", "draft"].includes(String(invoice.status))
  );
  const lowStock = (stock.data ?? []).filter(
    (item) => item.status === "low_stock" || item.status === "out_of_stock"
  );
  const monthlyRevenue = (invoices.data ?? [])
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);

  return [
    reportRecord("Monthly revenue", "Paid invoices", "Ready", "Accounting", currency(monthlyRevenue)),
    reportRecord("Unpaid invoices", "Sales ledger", "Ready", "Accounting", String(unpaidInvoices.length)),
    reportRecord("Projects by status", "Operations", "Ready", "Management", statusSummary(projects.data ?? [])),
    reportRecord("Equipment by status", "Reusable assets", "Ready", "Operations", statusSummary(equipment.data ?? [])),
    reportRecord("Low stock items", "Consumables", lowStock.length ? "Ready" : "Scheduled", "Warehouse", String(lowStock.length)),
    reportRecord("Tasks by status", "Execution", "Ready", "Operations", statusSummary(tasks.data ?? [])),
    reportRecord("Team count", "Employees", "Ready", "HR", String((employees.data ?? []).length)),
    reportRecord("Active projects count", "Projects", "Ready", "Management", String((projects.data ?? []).filter((project) => project.status === "active").length)),
  ];
}

function rowToRecord(moduleKey: ModuleKey, row: Record<string, unknown>): WorkspaceRecord {
  if (moduleKey === "team") {
    return {
      id: String(row.id),
      title: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      subtitle: String(row.position ?? row.role ?? "Team member"),
      status: labelize(String(row.status ?? "active")),
      owner: String(row.skills ?? ""),
      date: String(row.updated_at ?? row.created_at ?? ""),
      amount: `${currency(Number(row.hourly_rate ?? 0))}/h`,
      data: rowData(row),
    };
  }

  if (moduleKey === "projects") {
    return {
      id: String(row.id),
      title: String(row.name ?? ""),
      subtitle: String(row.city ?? row.address ?? "No location"),
      status: labelize(String(row.status ?? "preparation")),
      owner: String(row.description ?? ""),
      date: String(row.end_date ?? row.start_date ?? ""),
      amount: currency(Number(row.estimated_budget ?? 0)),
      data: rowData(row),
    };
  }

  if (moduleKey === "stock") {
    return {
      id: String(row.id),
      title: String(row.name ?? ""),
      subtitle: String(row.supplier_name ?? "No supplier"),
      status: labelize(String(row.status ?? "available")),
      owner: String(row.location ?? ""),
      date: String(row.updated_at ?? row.created_at ?? ""),
      amount: `${row.quantity ?? 0} ${row.unit ?? ""}`.trim(),
      data: rowData(row),
    };
  }

  if (moduleKey === "tasks") {
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      subtitle: String(row.description ?? "No project linked"),
      status: labelize(String(row.status ?? "todo")),
      owner: String(row.priority ?? "medium"),
      date: String(row.due_date ?? ""),
      amount: labelize(String(row.priority ?? "medium")),
      data: rowData(row),
    };
  }

  if (moduleKey === "planning") {
    return {
      id: String(row.id),
      title: String(row.title ?? ""),
      subtitle: labelize(String(row.type ?? "work")),
      status: labelize(String(row.status ?? "planned")),
      owner: String(row.notes ?? ""),
      date: String(row.start_datetime ?? ""),
      amount: dateTimeRange(String(row.start_datetime ?? ""), String(row.end_datetime ?? "")),
      data: rowData(row),
    };
  }

  return {
    id: String(row.id),
    title: String(row.quote_number ?? ""),
    subtitle: String(row.notes ?? "No client linked"),
    status: labelize(String(row.status ?? "draft")),
    owner: String(row.terms ?? ""),
    date: String(row.valid_until ?? row.issue_date ?? ""),
    amount: currency(Number(row.total ?? 0)),
    data: rowData(row),
  };
}

function formToPayload(
  moduleKey: ModuleKey,
  form: Record<string, string>,
  companyId: string
) {
  if (moduleKey === "team") {
    const [firstName, ...lastNameParts] = (form.title || "").trim().split(" ");
    return {
      company_id: companyId,
      first_name: firstName || "Unnamed",
      last_name: lastNameParts.join(" ") || "-",
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      position: form.subtitle || null,
      role: normalizeRole(form.role || "employee"),
      hourly_rate: numberFromString(form.amount),
      status: normalizeStatus(form.status),
      skills: form.skills || form.owner || null,
    };
  }

  if (moduleKey === "projects") {
    return {
      company_id: companyId,
      name: form.title || "Untitled project",
      description: form.owner || form.notes || null,
      address: form.address || null,
      city: form.subtitle || null,
      status: normalizeStatus(form.status),
      end_date: form.date || null,
      estimated_budget: numberFromString(form.amount),
      notes: form.notes || null,
    };
  }

  if (moduleKey === "tasks") {
    return {
      company_id: companyId,
      title: form.title || "Untitled task",
      description: form.subtitle || form.notes || null,
      status: normalizeStatus(form.status),
      priority: normalizePriority(form.amount || "medium"),
      due_date: form.date || null,
      completed_at: normalizeStatus(form.status) === "completed" ? new Date().toISOString() : null,
    };
  }

  if (moduleKey === "planning") {
    const start = form.date ? `${form.date}T08:00:00` : new Date().toISOString();
    const end = form.date ? `${form.date}T17:00:00` : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return {
      company_id: companyId,
      title: form.title || "Untitled event",
      start_datetime: start,
      end_datetime: end,
      type: normalizeStatus(form.type || "work"),
      status: normalizeStatus(form.status),
      notes: [form.owner, form.amount, form.notes].filter(Boolean).join(" | ") || null,
    };
  }

  return {
    company_id: companyId,
    quote_number: form.title || `QT-${Date.now()}`,
    status: normalizeStatus(form.status),
    issue_date: new Date().toISOString().slice(0, 10),
    valid_until: form.date || null,
    subtotal: numberFromString(form.amount),
    tax_rate: 21,
    tax_amount: numberFromString(form.amount) * 0.21,
    total: numberFromString(form.amount) * 1.21,
    notes: form.subtitle || null,
    terms: form.notes || form.owner || null,
  };
}

function tableForModule(moduleKey: ModuleKey) {
  const tables: Record<Exclude<ModuleKey, "reports">, string> = {
    planning: "schedules",
    projects: "projects",
    quotes: "quotes",
    stock: "stock_items",
    tasks: "tasks",
    team: "employees",
  };

  return tables[moduleKey as Exclude<ModuleKey, "reports">];
}

function orderColumnForModule(moduleKey: ModuleKey) {
  if (moduleKey === "projects") return "created_at";
  if (moduleKey === "planning") return "start_datetime";
  if (moduleKey === "tasks") return "created_at";
  if (moduleKey === "quotes") return "created_at";
  return "updated_at";
}

function rowData(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value == null ? "" : String(value)])
  );
}

function normalizeStatus(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizePriority(value: string) {
  const normalized = normalizeStatus(value);
  if (normalized === "normal") return "medium";
  return normalized;
}

function normalizeRole(value: string) {
  const normalized = normalizeStatus(value);
  return ["admin", "manager", "employee", "accountant", "warehouse_manager"].includes(normalized)
    ? normalized
    : "employee";
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function numberFromString(value = "") {
  const numeric = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function unitFromQuantity(value = "") {
  const unit = value.replace(/[\d.,\s-]/g, "").trim();
  return unit || "unit";
}

function currency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function dateTimeRange(start: string, end: string) {
  if (!start || !end) return "-";
  return `${new Date(start).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} - ${new Date(end).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`;
}

function invoiceTotal(invoice: { line_items?: unknown; tax_rate?: unknown; discount?: unknown; deposit?: unknown }) {
  if (!Array.isArray(invoice.line_items)) {
    return 0;
  }

  const subtotal = invoice.line_items.reduce((sum, item) => {
    if (!item || typeof item !== "object") {
      return sum;
    }

    const line = item as { quantity?: number; unitPrice?: number; unit_price?: number };
    return sum + Number(line.quantity ?? 0) * Number(line.unitPrice ?? line.unit_price ?? 0);
  }, 0);
  const taxable = Math.max(subtotal - Number(invoice.discount ?? 0), 0);
  return Math.max(taxable + taxable * (Number(invoice.tax_rate ?? 0) / 100) - Number(invoice.deposit ?? 0), 0);
}

function statusSummary(rows: Array<{ status?: unknown }>) {
  const counts = rows.reduce<Record<string, number>>((summary, row) => {
    const status = labelize(String(row.status ?? "unknown"));
    summary[status] = (summary[status] ?? 0) + 1;
    return summary;
  }, {});

  return Object.entries(counts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(", ") || "-";
}

function reportRecord(
  title: string,
  subtitle: string,
  status: string,
  owner: string,
  amount: string
): WorkspaceRecord {
  return {
    id: `report-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    subtitle,
    status,
    owner,
    amount,
    date: new Date().toISOString(),
    data: {},
  };
}
