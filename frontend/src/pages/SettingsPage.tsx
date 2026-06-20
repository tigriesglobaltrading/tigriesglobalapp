import {
  Building2,
  CreditCard,
  FileText,
  Palette,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type CompanySettings = {
  id?: string;
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
  website: string;
  iban: string;
  bic: string;
  bank_name: string;
  payment_terms: string;
  invoice_notes: string;
  logo_data_url: string;
  default_currency: string;
  default_tax_rate: number;
  default_due_days: number;
  invoice_prefix: string;
  invoice_next_number: number;
  quote_prefix: string;
  quote_next_number: number;
  email_from_name: string;
  email_reply_to: string;
  timezone: string;
  language: string;
  date_format: string;
  brand_color: string;
  terms_and_conditions: string;
  security_mfa_required: boolean;
  accounting_export_format: string;
  updated_by: string;
};

const emptySettings: CompanySettings = {
  company_name: "btp360",
  vat_number: "",
  registration_number: "",
  address_line1: "",
  address_line2: "",
  postal_code: "",
  city: "",
  country: "Belgium",
  email: "",
  phone: "",
  website: "",
  iban: "",
  bic: "",
  bank_name: "",
  payment_terms: "Payment due within 30 days.",
  invoice_notes: "",
  logo_data_url: "",
  default_currency: "EUR",
  default_tax_rate: 21,
  default_due_days: 30,
  invoice_prefix: "INV",
  invoice_next_number: 1,
  quote_prefix: "QT",
  quote_next_number: 1,
  email_from_name: "btp360",
  email_reply_to: "",
  timezone: "Europe/Brussels",
  language: "English",
  date_format: "DD/MM/YYYY",
  brand_color: "#1D4ED8",
  terms_and_conditions: "",
  security_mfa_required: false,
  accounting_export_format: "CSV",
  updated_by: "",
};

const requiredKeys: Array<keyof CompanySettings> = [
  "company_name",
  "vat_number",
  "address_line1",
  "postal_code",
  "city",
  "country",
  "email",
  "phone",
  "iban",
  "payment_terms",
];

export function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(emptySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  const completion = useMemo(() => {
    const filled = requiredKeys.filter((key) => Boolean(String(settings[key]).trim()));
    return Math.round((filled.length / requiredKeys.length) * 100);
  }, [settings]);

  async function loadSettings() {
    setIsLoading(true);
    setError(null);

    const { data, error: settingsError } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      setError(settingsError.message);
    } else if (data) {
      setSettings({ ...emptySettings, ...(data as CompanySettings) });
    }

    setIsLoading(false);
  }

  function updateField<Key extends keyof CompanySettings>(
    key: Key,
    value: CompanySettings[Key]
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    if (file.size > 700_000) {
      setError("Logo is too large. Please upload an image under 700 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateField("logo_data_url", String(reader.result));
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const payload = {
      ...settings,
      updated_by: "Workspace owner",
    };
    const response = settings.id
      ? await supabase
          .from("company_settings")
          .update(payload)
          .eq("id", settings.id)
          .select()
          .single()
      : await supabase.from("company_settings").insert(payload).select().single();

    setIsSaving(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setSettings({ ...emptySettings, ...(response.data as CompanySettings) });
    setMessage("Company settings saved.");
  }

  return (
    <section className="page-stack settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Company settings</h1>
          <p>
            Manage identity, legal details, billing defaults, document branding,
            accounting exports, and security preferences.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="primary-action" disabled={isSaving} form="settings-form" type="submit">
            <Save aria-hidden="true" size={18} />
            {isSaving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      {isLoading ? <p className="muted-text">Loading settings...</p> : null}

      <div className="settings-summary-grid">
        <SummaryCard icon={Building2} label="Company profile" value={`${completion}% complete`} />
        <SummaryCard icon={FileText} label="Next invoice" value={nextNumber(settings.invoice_prefix, settings.invoice_next_number)} />
        <SummaryCard icon={CreditCard} label="Banking" value={settings.iban ? "Configured" : "Missing IBAN"} tone={settings.iban ? "success" : "warning"} />
        <SummaryCard icon={ShieldCheck} label="Security" value={settings.security_mfa_required ? "MFA required" : "Standard access"} />
      </div>

      <form className="settings-form-grid settings-advanced-grid" id="settings-form" onSubmit={handleSubmit}>
        <section className="panel settings-logo-panel">
          <div className="panel-heading">
            <div>
              <h2>Branding</h2>
              <p>Logo, brand color, and invoice identity preview.</p>
            </div>
          </div>
          <div className="logo-uploader">
            <div className="logo-preview">
              {settings.logo_data_url ? (
                <img alt="Company logo preview" src={settings.logo_data_url} />
              ) : (
                <span>{settings.company_name || "btp360"}</span>
              )}
            </div>
            <div className="settings-inline-actions">
              <label className="secondary-action logo-upload-button">
                <Upload aria-hidden="true" size={17} />
                Upload logo
                <input accept="image/*" onChange={handleLogoUpload} type="file" />
              </label>
              <button
                className="secondary-action"
                onClick={() => updateField("logo_data_url", "")}
                type="button"
              >
                Remove
              </button>
            </div>
            <label className="settings-color-field">
              Brand color
              <span>
                <input
                  aria-label="Brand color"
                  type="color"
                  value={settings.brand_color}
                  onChange={(event) => updateField("brand_color", event.target.value)}
                />
                <input
                  value={settings.brand_color}
                  onChange={(event) => updateField("brand_color", event.target.value)}
                />
              </span>
            </label>
          </div>
        </section>

        <section className="panel settings-preview-panel">
          <div className="panel-heading">
            <div>
              <h2>Invoice preview</h2>
              <p>How your company block appears on generated documents.</p>
            </div>
          </div>
          <div className="settings-document-preview">
            <div>
              {settings.logo_data_url ? <img alt="" src={settings.logo_data_url} /> : <Palette aria-hidden="true" size={26} />}
              <strong>{settings.company_name}</strong>
              <span>{settings.vat_number || "VAT number missing"}</span>
            </div>
            <p>{settings.address_line1 || "Address line 1"}</p>
            <p>{[settings.postal_code, settings.city, settings.country].filter(Boolean).join(" ") || "Postal code City Country"}</p>
            <p>{settings.email || "billing@company.com"} · {settings.phone || "+32 ..."}</p>
            <small>{settings.payment_terms}</small>
          </div>
        </section>

        <section className="panel settings-wide-panel">
          <div className="panel-heading">
            <div>
              <h2>Company identity</h2>
              <p>Legal identity, VAT, contact details, and registered address.</p>
            </div>
          </div>

          <div className="record-form">
            <TextField required label="Company name" value={settings.company_name} onChange={(value) => updateField("company_name", value)} />
            <TextField label="VAT number" value={settings.vat_number} onChange={(value) => updateField("vat_number", value)} />
            <TextField label="Registration number" value={settings.registration_number} onChange={(value) => updateField("registration_number", value)} />
            <TextField type="email" label="Billing email" value={settings.email} onChange={(value) => updateField("email", value)} />
            <TextField label="Phone" value={settings.phone} onChange={(value) => updateField("phone", value)} />
            <TextField label="Website" value={settings.website} onChange={(value) => updateField("website", value)} />
            <TextField label="Address line 1" value={settings.address_line1} onChange={(value) => updateField("address_line1", value)} />
            <TextField label="Address line 2" value={settings.address_line2} onChange={(value) => updateField("address_line2", value)} />
            <TextField label="Postal code" value={settings.postal_code} onChange={(value) => updateField("postal_code", value)} />
            <TextField label="City" value={settings.city} onChange={(value) => updateField("city", value)} />
            <TextField label="Country" value={settings.country} onChange={(value) => updateField("country", value)} />
          </div>
        </section>

        <section className="panel settings-wide-panel">
          <div className="panel-heading">
            <div>
              <h2>Invoice and quote defaults</h2>
              <p>Numbering, taxes, due dates, currency, and export preferences.</p>
            </div>
          </div>

          <div className="record-form">
            <TextField label="Invoice prefix" value={settings.invoice_prefix} onChange={(value) => updateField("invoice_prefix", value)} />
            <NumberField label="Next invoice number" value={settings.invoice_next_number} onChange={(value) => updateField("invoice_next_number", value)} />
            <TextField label="Quote prefix" value={settings.quote_prefix} onChange={(value) => updateField("quote_prefix", value)} />
            <NumberField label="Next quote number" value={settings.quote_next_number} onChange={(value) => updateField("quote_next_number", value)} />
            <SelectField label="Currency" value={settings.default_currency} options={["EUR", "USD", "GBP"]} onChange={(value) => updateField("default_currency", value)} />
            <NumberField label="Default tax rate (%)" value={settings.default_tax_rate} onChange={(value) => updateField("default_tax_rate", value)} />
            <NumberField label="Default due days" value={settings.default_due_days} onChange={(value) => updateField("default_due_days", value)} />
            <SelectField label="Accounting export" value={settings.accounting_export_format} options={["CSV", "XLSX", "PDF"]} onChange={(value) => updateField("accounting_export_format", value)} />
          </div>
        </section>

        <section className="panel settings-wide-panel">
          <div className="panel-heading">
            <div>
              <h2>Banking and payment</h2>
              <p>Bank account details and payment instructions used on invoices.</p>
            </div>
          </div>

          <div className="record-form">
            <TextField label="IBAN" value={settings.iban} onChange={(value) => updateField("iban", value)} />
            <TextField label="BIC" value={settings.bic} onChange={(value) => updateField("bic", value)} />
            <TextField label="Bank name" value={settings.bank_name} onChange={(value) => updateField("bank_name", value)} />
            <label className="form-wide">
              Payment terms
              <textarea value={settings.payment_terms} onChange={(event) => updateField("payment_terms", event.target.value)} />
            </label>
            <label className="form-wide">
              Invoice footer notes
              <textarea value={settings.invoice_notes} onChange={(event) => updateField("invoice_notes", event.target.value)} />
            </label>
            <label className="form-wide">
              Terms and conditions
              <textarea value={settings.terms_and_conditions} onChange={(event) => updateField("terms_and_conditions", event.target.value)} />
            </label>
          </div>
        </section>

        <section className="panel settings-wide-panel">
          <div className="panel-heading">
            <div>
              <h2>Email, localization and security</h2>
              <p>Defaults for outgoing communication and workspace preferences.</p>
            </div>
          </div>

          <div className="record-form">
            <TextField label="Email sender name" value={settings.email_from_name} onChange={(value) => updateField("email_from_name", value)} />
            <TextField type="email" label="Reply-to email" value={settings.email_reply_to} onChange={(value) => updateField("email_reply_to", value)} />
            <SelectField label="Timezone" value={settings.timezone} options={["Europe/Brussels", "Europe/Paris", "Europe/London", "UTC"]} onChange={(value) => updateField("timezone", value)} />
            <SelectField label="Language" value={settings.language} options={["English", "French", "Dutch"]} onChange={(value) => updateField("language", value)} />
            <SelectField label="Date format" value={settings.date_format} options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]} onChange={(value) => updateField("date_format", value)} />
            <label className="settings-toggle-field">
              <input
                checked={settings.security_mfa_required}
                onChange={(event) => updateField("security_mfa_required", event.target.checked)}
                type="checkbox"
              />
              <span>
                <strong>Require MFA for admins</strong>
                <small>Preparation setting for stricter account access.</small>
              </span>
            </label>
          </div>
        </section>
      </form>
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: typeof Building2;
  label: string;
  tone?: "success" | "warning";
  value: string;
}) {
  return (
    <article className={`mini-stat${tone ? ` mini-stat-${tone}` : ""}`}>
      <Icon aria-hidden="true" size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function TextField({
  label,
  onChange,
  required,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label>
      {label}
      <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label>
      {label}
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function nextNumber(prefix: string, value: number) {
  return `${prefix}-${new Date().getFullYear()}-${String(value).padStart(3, "0")}`;
}
