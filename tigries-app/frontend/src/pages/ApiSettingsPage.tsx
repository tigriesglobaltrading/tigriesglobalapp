import { Copy, KeyRound, Plus, Trash2, Webhook } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type ApiKeyRow = {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  scopes: string[];
  status: "active" | "revoked";
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type WebhookRow = {
  id: string;
  company_id: string;
  name: string;
  endpoint_url: string;
  events: string[];
  secret_preview: string;
  status: "active" | "paused";
  created_at: string;
  last_delivery_at: string | null;
};

const eventOptions = ["invoice.created", "quote.accepted", "project.completed", "stock.low"];
const scopeOptions = ["read", "write", "admin"];

export function ApiSettingsPage() {
  const { session } = useAuth();
  const companyId = session?.user.id ?? "";
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [keyName, setKeyName] = useState("Production API");
  const [keyScopes, setKeyScopes] = useState(["read"]);
  const [webhookName, setWebhookName] = useState("Invoice webhook");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState(["invoice.created"]);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [keysResponse, webhooksResponse] = await Promise.all([
      supabase
        .from("integration_api_keys")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase
        .from("integration_webhooks")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
    ]);

    if (keysResponse.error || webhooksResponse.error) {
      setError(keysResponse.error?.message ?? webhooksResponse.error?.message ?? "Unable to load integrations.");
    } else {
      setApiKeys((keysResponse.data ?? []) as ApiKeyRow[]);
      setWebhooks((webhooksResponse.data ?? []) as WebhookRow[]);
    }

    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    void loadIntegrations();
  }, [companyId, loadIntegrations]);

  const activeKeys = useMemo(
    () => apiKeys.filter((key) => key.status === "active").length,
    [apiKeys]
  );

  async function createApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const rawKey = createPlainSecret("btp");
    const keyPrefix = rawKey.slice(0, 12);
    const keyHash = await sha256(rawKey);
    const { error: insertError } = await supabase.from("integration_api_keys").insert({
      company_id: companyId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: keyName,
      scopes: keyScopes,
      status: "active",
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCreatedSecret(rawKey);
    setMessage("API key created. Copy it now; it will not be shown again.");
    await loadIntegrations();
  }

  async function revokeApiKey(key: ApiKeyRow) {
    const { error: revokeError } = await supabase
      .from("integration_api_keys")
      .update({
        revoked_at: new Date().toISOString(),
        status: "revoked",
      })
      .eq("id", key.id)
      .eq("company_id", companyId);

    if (revokeError) {
      setError(revokeError.message);
      return;
    }

    await loadIntegrations();
  }

  async function createWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const secret = createPlainSecret("whsec");
    const { error: insertError } = await supabase.from("integration_webhooks").insert({
      company_id: companyId,
      endpoint_url: webhookUrl,
      events: webhookEvents,
      name: webhookName,
      secret_preview: `${secret.slice(0, 10)}...`,
      status: "active",
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setWebhookUrl("");
    setCreatedSecret(secret);
    setMessage("Webhook created. Copy the signing secret now.");
    await loadIntegrations();
  }

  async function deleteWebhook(webhook: WebhookRow) {
    const { error: deleteError } = await supabase
      .from("integration_webhooks")
      .delete()
      .eq("id", webhook.id)
      .eq("company_id", companyId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadIntegrations();
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings / APIs</p>
          <h1>APIs</h1>
          <p>Manage integration keys and outbound webhooks.</p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      {isLoading ? <p className="muted-text">Loading integrations...</p> : null}

      {createdSecret ? (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardHeader>
            <CardTitle className="text-base">Secret created</CardTitle>
            <CardDescription>Copy it now. Only the hash or preview is stored.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <code className="rounded-md border bg-white px-3 py-2 text-xs">{createdSecret}</code>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void navigator.clipboard.writeText(createdSecret)}
            >
              <Copy aria-hidden="true" />
              Copy
            </Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setCreatedSecret(null)}>
              Hide
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" />
              Active keys
            </CardTitle>
            <CardDescription>{activeKeys} active credentials</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4 text-primary" />
              Webhooks
            </CardTitle>
            <CardDescription>{webhooks.length} endpoints configured</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Security</CardTitle>
            <CardDescription>Secrets are shown once and stored as hashes/previews.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create API key</CardTitle>
            <CardDescription>Generate a credential for future backend integrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={createApiKey}>
              <div className="grid gap-2">
                <Label htmlFor="key-name">Name</Label>
                <Input id="key-name" value={keyName} onChange={(event) => setKeyName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Scopes</Label>
                <OptionPills options={scopeOptions} selected={keyScopes} onChange={setKeyScopes} />
              </div>
              <Button type="submit">
                <Plus aria-hidden="true" />
                Create key
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>Revoke credentials that should no longer work.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {apiKeys.map((key) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3" key={key.id}>
                <div>
                  <strong className="block text-sm font-medium">{key.name}</strong>
                  <span className="text-xs text-muted-foreground">{key.key_prefix}... · {key.scopes.join(", ")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={key.status === "active" ? "secondary" : "outline"}>{key.status}</Badge>
                  {key.status === "active" ? (
                    <Button size="sm" variant="outline" type="button" onClick={() => void revokeApiKey(key)}>
                      Revoke
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {apiKeys.length === 0 ? <p className="muted-text">No API keys yet.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create webhook</CardTitle>
            <CardDescription>Send events to another system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={createWebhook}>
              <div className="grid gap-2">
                <Label htmlFor="webhook-name">Name</Label>
                <Input id="webhook-name" value={webhookName} onChange={(event) => setWebhookName(event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="webhook-url">Endpoint URL</Label>
                <Input
                  id="webhook-url"
                  required
                  type="url"
                  value={webhookUrl}
                  onChange={(event) => setWebhookUrl(event.target.value)}
                  placeholder="https://example.com/webhooks/chantier360"
                />
              </div>
              <div className="grid gap-2">
                <Label>Events</Label>
                <OptionPills options={eventOptions} selected={webhookEvents} onChange={setWebhookEvents} />
              </div>
              <Button type="submit">
                <Plus aria-hidden="true" />
                Create webhook
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>Configured outbound event endpoints.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {webhooks.map((webhook) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3" key={webhook.id}>
                <div>
                  <strong className="block text-sm font-medium">{webhook.name}</strong>
                  <span className="text-xs text-muted-foreground">{webhook.endpoint_url}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline">{event}</Badge>
                    ))}
                  </div>
                </div>
                <Button size="icon" variant="ghost" type="button" onClick={() => void deleteWebhook(webhook)}>
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            ))}
            {webhooks.length === 0 ? <p className="muted-text">No webhooks yet.</p> : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function OptionPills({
  onChange,
  options,
  selected,
}: {
  onChange: (next: string[]) => void;
  options: string[];
  selected: string[];
}) {
  function toggle(option: string) {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    onChange(next.length ? next : [option]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option}
          size="sm"
          type="button"
          variant={selected.includes(option) ? "default" : "outline"}
          onClick={() => toggle(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

function createPlainSecret(prefix: string) {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${token}`;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
