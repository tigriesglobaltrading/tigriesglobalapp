import { Save, Upload } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
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
  iban: string;
  bic: string;
  bank_name: string;
  payment_terms: string;
  invoice_notes: string;
  logo_data_url: string;
};

const emptySettings: CompanySettings = {
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

export function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(emptySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setIsLoading(true);
    const { data, error: settingsError } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      setError(settingsError.message);
    } else if (data) {
      setSettings(data as CompanySettings);
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

    const payload = { ...settings };
    const response = settings.id
      ? await supabase
          .from("company_settings")
          .update(payload)
          .eq("id", settings.id)
          .select()
          .single()
      : await supabase.from("company_settings").insert(payload).select().single();

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setSettings(response.data as CompanySettings);
    setMessage("Company settings saved.");
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Company settings</h1>
          <p>
            Manage the legal, banking, tax, branding, and invoice details used
            by the invoice maker.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      {isLoading ? <p className="muted-text">Loading settings...</p> : null}

      <form className="settings-form-grid" onSubmit={handleSubmit}>
        <section className="panel settings-logo-panel">
          <div className="panel-heading">
            <div>
              <h2>Branding</h2>
              <p>Upload the company logo used on generated invoices.</p>
            </div>
          </div>
          <div className="logo-uploader">
            <div className="logo-preview">
              {settings.logo_data_url ? (
                <img alt="Company logo preview" src={settings.logo_data_url} />
              ) : (
                <span>btp360</span>
              )}
            </div>
            <label className="secondary-action logo-upload-button">
              <Upload aria-hidden="true" size={17} />
              Upload logo
              <input accept="image/*" onChange={handleLogoUpload} type="file" />
            </label>
          </div>
        </section>

        <section className="panel settings-company-panel">
          <div className="panel-heading">
            <div>
              <h2>Company identity</h2>
              <p>Name, VAT number, registration, and address.</p>
            </div>
          </div>

          <div className="record-form">
            <label>
              Company name
              <input
                required
                value={settings.company_name}
                onChange={(event) =>
                  updateField("company_name", event.target.value)
                }
              />
            </label>
            <label>
              VAT number
              <input
                value={settings.vat_number}
                onChange={(event) =>
                  updateField("vat_number", event.target.value)
                }
              />
            </label>
            <label>
              Registration number
              <input
                value={settings.registration_number}
                onChange={(event) =>
                  updateField("registration_number", event.target.value)
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={settings.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </label>
            <label>
              Phone
              <input
                value={settings.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </label>
            <label>
              Address line 1
              <input
                value={settings.address_line1}
                onChange={(event) =>
                  updateField("address_line1", event.target.value)
                }
              />
            </label>
            <label>
              Address line 2
              <input
                value={settings.address_line2}
                onChange={(event) =>
                  updateField("address_line2", event.target.value)
                }
              />
            </label>
            <label>
              Postal code
              <input
                value={settings.postal_code}
                onChange={(event) =>
                  updateField("postal_code", event.target.value)
                }
              />
            </label>
            <label>
              City
              <input
                value={settings.city}
                onChange={(event) => updateField("city", event.target.value)}
              />
            </label>
            <label>
              Country
              <input
                value={settings.country}
                onChange={(event) => updateField("country", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="panel settings-wide-panel">
          <div className="panel-heading">
            <div>
              <h2>Banking and invoice defaults</h2>
              <p>IBAN, payment terms, and default footer notes.</p>
            </div>
          </div>

          <div className="record-form">
            <label>
              IBAN
              <input
                value={settings.iban}
                onChange={(event) => updateField("iban", event.target.value)}
              />
            </label>
            <label>
              BIC
              <input
                value={settings.bic}
                onChange={(event) => updateField("bic", event.target.value)}
              />
            </label>
            <label>
              Bank name
              <input
                value={settings.bank_name}
                onChange={(event) =>
                  updateField("bank_name", event.target.value)
                }
              />
            </label>
            <label>
              Payment terms
              <input
                value={settings.payment_terms}
                onChange={(event) =>
                  updateField("payment_terms", event.target.value)
                }
              />
            </label>
            <label className="form-wide">
              Invoice notes
              <textarea
                value={settings.invoice_notes}
                onChange={(event) =>
                  updateField("invoice_notes", event.target.value)
                }
              />
            </label>
            <div className="form-actions form-wide">
              <button className="primary-action" type="submit">
                <Save aria-hidden="true" size={18} />
                Save settings
              </button>
            </div>
          </div>
        </section>
      </form>
    </section>
  );
}
