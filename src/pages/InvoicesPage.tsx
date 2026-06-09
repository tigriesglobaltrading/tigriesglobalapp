import {
  ArrowLeft,
  ChevronDown,
  Download,
  Edit3,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

type InvoiceLine = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

type CompanySettings = {
  company_name: string;
  vat_number: string;
  registration_number: string;
  address_line1: string;
  address_line2: string;
  postal_code: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  iban: string;
  bic: string;
  bank_name: string;
  payment_terms: string;
  invoice_notes: string;
  logo_data_url: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  project_name: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  currency: string;
  tax_rate: number;
  discount: number;
  deposit: number;
  line_items: InvoiceLine[];
  notes: string;
};

type InvoiceForm = Omit<Invoice, "id">;

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

const emptyInvoice: InvoiceForm = {
  invoice_number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  client_name: "",
  client_email: "",
  client_address: "",
  project_name: "",
  issue_date: today,
  due_date: nextMonth,
  status: "draft",
  currency: "EUR",
  tax_rate: 21,
  discount: 0,
  deposit: 0,
  line_items: [{ description: "", quantity: 1, unit: "unit", unitPrice: 0 }],
  notes: "",
};

const fallbackSettings: CompanySettings = {
  company_name: "btp360",
  vat_number: "",
  registration_number: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "",
  email: "",
  phone: "",
  iban: "",
  bic: "",
  bank_name: "",
  payment_terms: "Payment due within 30 days.",
  invoice_notes: "",
  logo_data_url: "",
};

const statusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "In Progress",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const statusClassNames: Record<InvoiceStatus, string> = {
  draft: "status-draft",
  sent: "status-progress",
  paid: "status-completed",
  overdue: "status-cancelled",
  cancelled: "status-cancelled",
};

export function InvoicesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [companySettings, setCompanySettings] =
    useState<CompanySettings>(fallbackSettings);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(
    typeof location.state === "object" &&
      location.state &&
      "toast" in location.state
      ? String(location.state.toast)
      : null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    const [settingsResponse, invoicesResponse] = await Promise.all([
      supabase.from("company_settings").select("*").limit(1).maybeSingle(),
      supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    if (settingsResponse.data) {
      setCompanySettings(settingsResponse.data as CompanySettings);
    }

    if (invoicesResponse.error) {
      setError(invoicesResponse.error.message);
    } else {
      setInvoices((invoicesResponse.data ?? []) as Invoice[]);
    }

    setIsLoading(false);
  }

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        invoice.invoice_number,
        invoice.client_name,
        invoice.project_name,
        invoice.client_email,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [invoices, query]);

  const stats = useMemo(() => {
    const overdue = invoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + calculateTotals(invoice).totalDue, 0);
    const now = Date.now();
    const next30 = now + 30 * 24 * 60 * 60 * 1000;
    const dueSoon = invoices
      .filter((invoice) => {
        const due = new Date(invoice.due_date).getTime();
        return due >= now && due <= next30 && invoice.status !== "paid";
      })
      .reduce((sum, invoice) => sum + calculateTotals(invoice).totalDue, 0);
    const upcomingPayout = invoices
      .filter((invoice) => invoice.status === "paid")
      .slice(0, 3)
      .reduce((sum, invoice) => sum + calculateTotals(invoice).totalDue, 0);

    return {
      overdue,
      dueSoon,
      averagePaymentDays: 34,
      upcomingPayout,
    };
  }, [invoices]);

  const allSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((invoice) => selectedIds.includes(invoice.id));

  function toggleAllRows() {
    setSelectedIds((current) =>
      allSelected
        ? current.filter(
            (id) => !filteredInvoices.some((invoice) => invoice.id === id)
          )
        : Array.from(
            new Set([...current, ...filteredInvoices.map((invoice) => invoice.id)])
          )
    );
  }

  function toggleRow(invoiceId: string) {
    setSelectedIds((current) =>
      current.includes(invoiceId)
        ? current.filter((id) => id !== invoiceId)
        : [...current, invoiceId]
    );
  }

  async function deleteInvoice(invoice: Invoice) {
    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoice_number}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoice.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setOpenMenuId(null);
    setPreviewInvoice(null);
    await loadData();
  }

  async function markAsSent(invoice: Invoice) {
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "sent" })
      .eq("id", invoice.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPreviewInvoice({ ...invoice, status: "sent" });
    await loadData();
  }

  return (
    <section className="page-stack invoices-page">
      <header className="page-header invoice-page-header">
        <div>
          <p className="eyebrow">Sales &amp; Payment / Invoices</p>
          <h1>Invoices</h1>
          <p>
            Last update a min ago
            <RefreshCw aria-hidden="true" size={13} />
          </p>
        </div>
        <div className="page-header-actions">
          <button
            className="primary-action"
            onClick={() => navigate("/invoices/new")}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
            Create Invoice
          </button>
          <button className="secondary-action" type="button">
            <Download aria-hidden="true" size={17} />
            Export as .CSV
          </button>
        </div>
      </header>

      {toast ? <p className="form-success">{toast}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      <section className="invoice-stats panel">
        <Kpi label="Overdue" value={formatMoneyParts(stats.overdue)} />
        <Kpi label="Due within next 30 days" value={formatMoneyParts(stats.dueSoon)} />
        <Kpi label="Average time to get paid" value={{ main: "34", decimal: " days" }} />
        <Kpi label="Upcoming Payout" value={formatMoneyParts(stats.upcomingPayout)} />
      </section>

      <section className="panel invoice-list-panel">
        <div className="invoice-filter-bar">
          <div className="invoice-filter-left">
            <button className="secondary-action" type="button">Filter (2)</button>
            <button className="secondary-action" type="button">Sort Order</button>
            <span className="filter-chip">Total: &gt;$1000 <X aria-hidden="true" size={13} /></span>
            <span className="filter-chip">Date: Last 6 months <X aria-hidden="true" size={13} /></span>
          </div>
          <label className="search-box">
            <Search aria-hidden="true" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />
          </label>
        </div>

        {isLoading ? <p className="muted-text">Loading invoices...</p> : null}

        <div className="invoice-data-table">
          <div className="invoice-data-head">
            <label aria-label="Select all invoices">
              <input checked={allSelected} onChange={toggleAllRows} type="checkbox" />
            </label>
            <span>Invoice Number</span>
            <span>Customer</span>
            <span>Total</span>
            <span>Status</span>
            <span>Amount Due</span>
            <span>Date</span>
            <span />
          </div>

          {filteredInvoices.map((invoice) => {
            const totals = calculateTotals(invoice);
            const isSelected = selectedIds.includes(invoice.id);

            return (
              <article
                className={
                  isSelected
                    ? "invoice-data-row invoice-data-row-selected"
                    : "invoice-data-row"
                }
                key={invoice.id}
                onClick={() => setPreviewInvoice(invoice)}
              >
                <label
                  aria-label={`Select ${invoice.invoice_number}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    checked={isSelected}
                    onChange={() => toggleRow(invoice.id)}
                    type="checkbox"
                  />
                </label>
                <strong>{invoice.invoice_number}</strong>
                <span>{invoice.client_name}</span>
                <span>{formatCurrency(totals.totalDue, invoice.currency)}</span>
                <span className={`status-badge ${statusClassNames[invoice.status]}`}>
                  {statusLabels[invoice.status]}
                </span>
                <span>{formatCurrency(totals.totalDue, invoice.currency)}</span>
                <span>{invoice.issue_date}</span>
                <div className="invoice-row-menu-wrap" onClick={(event) => event.stopPropagation()}>
                  <button
                    className="row-menu"
                    onClick={() =>
                      setOpenMenuId(openMenuId === invoice.id ? null : invoice.id)
                    }
                    title="More actions"
                    type="button"
                  >
                    <MoreHorizontal aria-hidden="true" size={18} />
                  </button>
                  {openMenuId === invoice.id ? (
                    <div className="invoice-action-menu">
                      <button onClick={() => setPreviewInvoice(invoice)} type="button">View</button>
                      <button onClick={() => downloadPdf(invoice, companySettings)} type="button">Download</button>
                      <button onClick={() => navigate(`/invoices/${invoice.id}/edit`)} type="button">Edit</button>
                      <button onClick={() => deleteInvoice(invoice)} type="button">Delete</button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <footer className="invoice-table-footer">
          <span>Showing 1 to {Math.min(filteredInvoices.length, 25)} of 114 results</span>
          <div>
            <button className="secondary-action" type="button">
              25 per page <ChevronDown aria-hidden="true" size={15} />
            </button>
            <button className="secondary-action" type="button">Previous</button>
            <button className="secondary-action" type="button">Next</button>
          </div>
        </footer>
      </section>

      {previewInvoice ? (
        <InvoiceDrawer
          companySettings={companySettings}
          invoice={previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          onDelete={() => deleteInvoice(previewInvoice)}
          onDownload={() => downloadPdf(previewInvoice, companySettings)}
          onEdit={() => navigate(`/invoices/${previewInvoice.id}/edit`)}
          onSend={() => markAsSent(previewInvoice)}
        />
      ) : null}
    </section>
  );
}

export function InvoiceEditorPage() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<InvoiceForm>({
    ...emptyInvoice,
    invoice_number: `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(invoiceId));

  useEffect(() => {
    if (!invoiceId) {
      return;
    }

    async function loadInvoice() {
      const { data, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) {
        setError(invoiceError.message);
      } else {
        const invoice = data as Invoice;
        setForm({
          invoice_number: invoice.invoice_number,
          client_name: invoice.client_name,
          client_email: invoice.client_email,
          client_address: invoice.client_address,
          project_name: invoice.project_name,
          issue_date: invoice.issue_date,
          due_date: invoice.due_date,
          status: invoice.status,
          currency: invoice.currency,
          tax_rate: invoice.tax_rate,
          discount: invoice.discount,
          deposit: invoice.deposit,
          line_items: invoice.line_items,
          notes: invoice.notes,
        });
      }

      setIsLoading(false);
    }

    void loadInvoice();
  }, [invoiceId]);

  function updateForm<Key extends keyof InvoiceForm>(
    key: Key,
    value: InvoiceForm[Key]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateLine(index: number, field: keyof InvoiceLine, value: string) {
    setForm((current) => ({
      ...current,
      line_items: current.line_items.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]:
                field === "quantity" || field === "unitPrice"
                  ? Number(value)
                  : value,
            }
          : line
      ),
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      line_items: [
        ...current.line_items,
        { description: "", quantity: 1, unit: "unit", unitPrice: 0 },
      ],
    }));
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      line_items:
        current.line_items.length === 1
          ? current.line_items
          : current.line_items.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  async function saveInvoice(nextStatus: InvoiceStatus) {
    setError(null);
    const payload = {
      ...form,
      status: nextStatus,
      line_items: form.line_items.filter((line) => line.description.trim()),
    };

    const response = invoiceId
      ? await supabase.from("invoices").update(payload).eq("id", invoiceId)
      : await supabase.from("invoices").insert(payload);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    navigate("/invoices", {
      state: {
        toast: invoiceId ? "Invoice updated." : "Invoice created.",
      },
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveInvoice("sent");
  }

  const totals = calculateTotals(form);

  return (
    <section className="page-stack invoice-editor-page">
      <header className="page-header invoice-page-header">
        <div>
          <button
            className="secondary-action"
            onClick={() => navigate("/invoices")}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            Back to Invoices
          </button>
          <h1>{invoiceId ? "Edit Invoice" : "New Invoice"}</h1>
          <p>Build the invoice, save it as draft, or create and send it.</p>
        </div>
        <div className="page-header-actions">
          <button
            className="secondary-action"
            onClick={() => void saveInvoice("draft")}
            type="button"
          >
            Save as Draft
          </button>
          <button className="primary-action" form="invoice-editor-form" type="submit">
            <Send aria-hidden="true" size={17} />
            Create & Send
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="muted-text">Loading invoice...</p> : null}

      <form className="panel invoice-editor-form" id="invoice-editor-form" onSubmit={handleSubmit}>
        <div className="record-form">
          <label>
            Client
            <input
              required
              value={form.client_name}
              onChange={(event) => updateForm("client_name", event.target.value)}
            />
          </label>
          <label>
            Invoice number
            <input
              required
              value={form.invoice_number}
              onChange={(event) =>
                updateForm("invoice_number", event.target.value)
              }
            />
          </label>
          <label>
            Issue date
            <input
              type="date"
              value={form.issue_date}
              onChange={(event) => updateForm("issue_date", event.target.value)}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              value={form.due_date}
              onChange={(event) => updateForm("due_date", event.target.value)}
            />
          </label>
          <label>
            Client email
            <input
              type="email"
              value={form.client_email}
              onChange={(event) => updateForm("client_email", event.target.value)}
            />
          </label>
          <label>
            Project
            <input
              value={form.project_name}
              onChange={(event) => updateForm("project_name", event.target.value)}
            />
          </label>
          <label className="form-wide">
            Client address
            <textarea
              value={form.client_address}
              onChange={(event) =>
                updateForm("client_address", event.target.value)
              }
            />
          </label>
        </div>

        <div className="invoice-lines">
          <div className="invoice-lines-header">
            <h3>Line items</h3>
            <button className="secondary-action" onClick={addLine} type="button">
              <Plus aria-hidden="true" size={16} />
              Add line
            </button>
          </div>
          {form.line_items.map((line, index) => (
            <div className="invoice-line" key={index}>
              <input
                placeholder="Description"
                value={line.description}
                onChange={(event) =>
                  updateLine(index, "description", event.target.value)
                }
              />
              <input
                min="0"
                step="0.01"
                type="number"
                value={line.quantity}
                onChange={(event) =>
                  updateLine(index, "quantity", event.target.value)
                }
              />
              <input
                placeholder="Unit"
                value={line.unit}
                onChange={(event) => updateLine(index, "unit", event.target.value)}
              />
              <input
                min="0"
                step="0.01"
                type="number"
                value={line.unitPrice}
                onChange={(event) =>
                  updateLine(index, "unitPrice", event.target.value)
                }
              />
              <strong>{formatCurrency(line.quantity * line.unitPrice, form.currency)}</strong>
              <button
                className="icon-button"
                onClick={() => removeLine(index)}
                title="Remove line"
                type="button"
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="invoice-editor-totals">
          <label>
            Tax %
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.tax_rate}
              onChange={(event) => updateForm("tax_rate", Number(event.target.value))}
            />
          </label>
          <label>
            Discount
            <input
              min="0"
              step="0.01"
              type="number"
              value={form.discount}
              onChange={(event) => updateForm("discount", Number(event.target.value))}
            />
          </label>
          <div className="invoice-editor-total-card">
            <span>Subtotal</span>
            <strong>{formatCurrency(totals.subtotal, form.currency)}</strong>
            <span>Taxes</span>
            <strong>{formatCurrency(totals.tax, form.currency)}</strong>
            <span>Total</span>
            <strong>{formatCurrency(totals.totalDue, form.currency)}</strong>
          </div>
        </div>
      </form>
    </section>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: { main: string; decimal: string };
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>
        {value.main}
        <small>{value.decimal}</small>
      </strong>
    </article>
  );
}

function InvoiceDrawer({
  companySettings,
  invoice,
  onClose,
  onDelete,
  onDownload,
  onEdit,
  onSend,
}: {
  companySettings: CompanySettings;
  invoice: Invoice;
  onClose: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onSend: () => void;
}) {
  return (
    <div className="invoice-drawer-backdrop" onClick={onClose}>
      <aside className="invoice-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="invoice-drawer-header">
          <div>
            <span>Invoice preview</span>
            <strong>{invoice.invoice_number}</strong>
          </div>
          <div>
            <button className="primary-action" onClick={onDownload} type="button">
              <Download aria-hidden="true" size={17} />
              Download PDF
            </button>
            <button className="secondary-action" onClick={onEdit} type="button">
              <Edit3 aria-hidden="true" size={17} />
              Edit
            </button>
            <button className="secondary-action" onClick={onSend} type="button">
              <Send aria-hidden="true" size={17} />
              Send
            </button>
            <button className="icon-button" onClick={onClose} title="Close" type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </header>
        <InvoicePreview companySettings={companySettings} invoice={invoice} />
        <button className="secondary-action drawer-delete" onClick={onDelete} type="button">
          <Trash2 aria-hidden="true" size={17} />
          Delete invoice
        </button>
      </aside>
    </div>
  );
}

function InvoicePreview({
  companySettings,
  invoice,
}: {
  companySettings: CompanySettings;
  invoice: Invoice;
}) {
  const totals = calculateTotals(invoice);

  return (
    <section className="invoice-paper">
      <div className="invoice-paper-header">
        <div>
          {companySettings.logo_data_url ? (
            <img alt="Company logo" src={companySettings.logo_data_url} />
          ) : (
            <strong>{companySettings.company_name}</strong>
          )}
          <p>{companySettings.address_line1}</p>
          <p>
            {[companySettings.postal_code, companySettings.city]
              .filter(Boolean)
              .join(" ")}
          </p>
          <p>{companySettings.vat_number}</p>
        </div>
        <div>
          <h2>Invoice</h2>
          <strong>{invoice.invoice_number}</strong>
          <span className={`status-badge ${statusClassNames[invoice.status]}`}>
            {statusLabels[invoice.status]}
          </span>
        </div>
      </div>
      <div className="invoice-paper-meta">
        <div>
          <span>Bill to</span>
          <strong>{invoice.client_name}</strong>
          <p>{invoice.client_address}</p>
          <p>{invoice.client_email}</p>
        </div>
        <div>
          <span>Issue date</span>
          <strong>{invoice.issue_date}</strong>
          <span>Due date</span>
          <strong>{invoice.due_date}</strong>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((line, index) => (
            <tr key={index}>
              <td>{line.description}</td>
              <td>{line.quantity}</td>
              <td>{line.unit}</td>
              <td>{formatCurrency(line.unitPrice, invoice.currency)}</td>
              <td>{formatCurrency(line.quantity * line.unitPrice, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-totals">
        <span>Subtotal</span>
        <strong>{formatCurrency(totals.subtotal, invoice.currency)}</strong>
        <span>Discount</span>
        <strong>-{formatCurrency(invoice.discount, invoice.currency)}</strong>
        <span>Tax</span>
        <strong>{formatCurrency(totals.tax, invoice.currency)}</strong>
        <span>Deposit</span>
        <strong>-{formatCurrency(invoice.deposit, invoice.currency)}</strong>
        <span>Total due</span>
        <strong>{formatCurrency(totals.totalDue, invoice.currency)}</strong>
      </div>
      <div className="invoice-footer">
        <p>{companySettings.payment_terms}</p>
        <p>{invoice.notes || companySettings.invoice_notes}</p>
        <p>
          IBAN {companySettings.iban}
          {companySettings.bic ? ` - BIC ${companySettings.bic}` : ""}
        </p>
      </div>
    </section>
  );
}

function calculateTotals(
  invoice: Pick<Invoice, "line_items" | "tax_rate" | "discount" | "deposit">
) {
  const subtotal = invoice.line_items.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0
  );
  const taxable = Math.max(subtotal - Number(invoice.discount), 0);
  const tax = taxable * (Number(invoice.tax_rate) / 100);
  const totalDue = Math.max(taxable + tax - Number(invoice.deposit), 0);

  return { subtotal, tax, totalDue };
}

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("en-US", {
    currency,
    style: "currency",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatMoneyParts(value: number) {
  const formatted = formatCurrency(value, "USD");
  const [main, decimal = ""] = formatted.split(".");
  return { main, decimal: decimal ? `.${decimal}` : "" };
}

function downloadPdf(invoice: Invoice, companySettings: CompanySettings) {
  const printWindow = window.open("", "_blank", "width=900,height=1200");

  if (!printWindow) {
    return;
  }

  printWindow.document.write(buildInvoiceHtml(invoice, companySettings));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function buildInvoiceHtml(invoice: Invoice, companySettings: CompanySettings) {
  const totals = calculateTotals(invoice);
  const rows = invoice.line_items
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.description)}</td>
          <td>${line.quantity}</td>
          <td>${escapeHtml(line.unit)}</td>
          <td>${formatCurrency(line.unitPrice, invoice.currency)}</td>
          <td>${formatCurrency(line.quantity * line.unitPrice, invoice.currency)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(invoice.invoice_number)}</title>
        <style>
          body { color: #1A1A21; font-family: Inter, Arial, sans-serif; margin: 0; padding: 40px; }
          .header { display: flex; justify-content: space-between; gap: 32px; margin-bottom: 40px; }
          img { max-height: 72px; max-width: 190px; object-fit: contain; }
          h1 { margin: 0 0 8px; }
          p { color: #555; margin: 4px 0; }
          table { border-collapse: collapse; margin-top: 28px; width: 100%; }
          th, td { border-bottom: 1px solid #E8E8EC; padding: 12px; text-align: left; }
          th { color: #8A8A99; font-size: 12px; text-transform: uppercase; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
          .totals { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-left: auto; margin-top: 28px; width: 320px; }
          .total { color: #1d4ed8; font-size: 20px; }
          .footer { margin-top: 44px; }
        </style>
      </head>
      <body>
        <section class="header">
          <div>
            ${
              companySettings.logo_data_url
                ? `<img alt="Company logo" src="${companySettings.logo_data_url}" />`
                : `<h1>${escapeHtml(companySettings.company_name)}</h1>`
            }
            <p>${escapeHtml(companySettings.address_line1)}</p>
            <p>${escapeHtml([companySettings.postal_code, companySettings.city].filter(Boolean).join(" "))}</p>
            <p>${escapeHtml(companySettings.vat_number)}</p>
          </div>
          <div>
            <h1>Invoice</h1>
            <strong>${escapeHtml(invoice.invoice_number)}</strong>
            <p>${escapeHtml(statusLabels[invoice.status])}</p>
          </div>
        </section>
        <section class="meta">
          <div>
            <p>Bill to</p>
            <strong>${escapeHtml(invoice.client_name)}</strong>
            <p>${escapeHtml(invoice.client_address)}</p>
            <p>${escapeHtml(invoice.client_email)}</p>
          </div>
          <div>
            <p>Issue date: <strong>${invoice.issue_date}</strong></p>
            <p>Due date: <strong>${invoice.due_date}</strong></p>
            <p>Project: <strong>${escapeHtml(invoice.project_name)}</strong></p>
          </div>
        </section>
        <table>
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Unit</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <section class="totals">
          <span>Subtotal</span><strong>${formatCurrency(totals.subtotal, invoice.currency)}</strong>
          <span>Discount</span><strong>-${formatCurrency(invoice.discount, invoice.currency)}</strong>
          <span>Tax</span><strong>${formatCurrency(totals.tax, invoice.currency)}</strong>
          <span>Deposit</span><strong>-${formatCurrency(invoice.deposit, invoice.currency)}</strong>
          <span class="total">Total due</span><strong class="total">${formatCurrency(totals.totalDue, invoice.currency)}</strong>
        </section>
        <section class="footer">
          <p>${escapeHtml(companySettings.payment_terms)}</p>
          <p>${escapeHtml(invoice.notes || companySettings.invoice_notes)}</p>
          <p>IBAN ${escapeHtml(companySettings.iban)}${companySettings.bic ? ` - BIC ${escapeHtml(companySettings.bic)}` : ""}</p>
        </section>
      </body>
    </html>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
