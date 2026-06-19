import { Bell, LockKeyhole, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type AccountPreferences = {
  id?: string;
  company_id: string;
  user_id: string;
  full_name: string;
  role: string;
  language: string;
  timezone: string;
  email_notifications: boolean;
  security_alerts: boolean;
  product_updates: boolean;
};

const defaultPreferences: AccountPreferences = {
  company_id: "",
  user_id: "",
  full_name: "",
  role: "admin",
  language: "English",
  timezone: "Europe/Brussels",
  email_notifications: true,
  security_alerts: true,
  product_updates: false,
};

export function AccountSettingsPage() {
  const { session } = useAuth();
  const user = session?.user;
  const [preferences, setPreferences] =
    useState<AccountPreferences>(defaultPreferences);
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreferences = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("account_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (loadError) {
      setError(loadError.message);
    } else {
      setPreferences({
        ...defaultPreferences,
        company_id: userId,
        user_id: userId,
        full_name: String(user?.user_metadata?.full_name ?? ""),
        ...(data as Partial<AccountPreferences> | null),
      });
    }

    setIsLoading(false);
  }, [user?.user_metadata?.full_name]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setEmail(user.email ?? "");
    void loadPreferences(user.id);
  }, [loadPreferences, user]);

  const completion = useMemo(() => {
    const fields = [preferences.full_name, email, preferences.role, preferences.language];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [email, preferences]);

  function updatePreference<Key extends keyof AccountPreferences>(
    key: Key,
    value: AccountPreferences[Key]
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    const authPayload: Parameters<typeof supabase.auth.updateUser>[0] = {
      data: {
        full_name: preferences.full_name,
        language: preferences.language,
        timezone: preferences.timezone,
      },
    };

    if (email && email !== user.email) {
      authPayload.email = email;
    }

    if (password.trim()) {
      authPayload.password = password.trim();
    }

    const authResponse = await supabase.auth.updateUser(authPayload);

    if (authResponse.error) {
      setIsSaving(false);
      setError(authResponse.error.message);
      return;
    }

    const payload = {
      ...preferences,
      company_id: user.id,
      user_id: user.id,
    };

    const response = preferences.id
      ? await supabase
          .from("account_preferences")
          .update(payload)
          .eq("id", preferences.id)
          .select()
          .single()
      : await supabase.from("account_preferences").insert(payload).select().single();

    setIsSaving(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    setPassword("");
    setPreferences(response.data as AccountPreferences);
    setMessage(email !== user.email ? "Saved. Check your inbox to confirm the new email." : "Account settings saved.");
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings / Account</p>
          <h1>Account settings</h1>
          <p>Profile, login security, and notification preferences.</p>
        </div>
        <div className="page-header-actions">
          <Button disabled={isSaving} form="account-settings-form" type="submit">
            <Save aria-hidden="true" />
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      {isLoading ? <p className="muted-text">Loading account...</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-primary" />
              Profile
            </CardTitle>
            <CardDescription>{completion}% complete</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{preferences.role}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-primary" />
              Login email
            </CardTitle>
            <CardDescription>{email || "No email loaded"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={user?.email_confirmed_at ? "secondary" : "outline"}>
              {user?.email_confirmed_at ? "Confirmed" : "Pending"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Security
            </CardTitle>
            <CardDescription>Password updates use Supabase Auth.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Protected</Badge>
          </CardContent>
        </Card>
      </div>

      <form id="account-settings-form" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>Saved in Supabase Auth and account preferences.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input
                  id="full-name"
                  value={preferences.full_name}
                  onChange={(event) => updatePreference("full_name", event.target.value)}
                  placeholder="Workspace owner"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={preferences.role}
                  onChange={(event) => updatePreference("role", event.target.value)}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="accountant">Accountant</option>
                  <option value="warehouse_manager">Warehouse manager</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  minLength={6}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Leave empty to keep current password"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Used for workspace defaults.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={preferences.language}
                  onChange={(event) => updatePreference("language", event.target.value)}
                >
                  <option>English</option>
                  <option>French</option>
                  <option>Dutch</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={preferences.timezone}
                  onChange={(event) => updatePreference("timezone", event.target.value)}
                >
                  <option>Europe/Brussels</option>
                  <option>Europe/Paris</option>
                  <option>Europe/London</option>
                  <option>UTC</option>
                </select>
              </div>
              <PreferenceToggle
                checked={preferences.email_notifications}
                icon={Bell}
                label="Email notifications"
                onChange={(checked) => updatePreference("email_notifications", checked)}
              />
              <PreferenceToggle
                checked={preferences.security_alerts}
                icon={LockKeyhole}
                label="Security alerts"
                onChange={(checked) => updatePreference("security_alerts", checked)}
              />
              <PreferenceToggle
                checked={preferences.product_updates}
                icon={Bell}
                label="Product updates"
                onChange={(checked) => updatePreference("product_updates", checked)}
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </section>
  );
}

function PreferenceToggle({
  checked,
  icon: Icon,
  label,
  onChange,
}: {
  checked: boolean;
  icon: typeof Bell;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </span>
      <input
        checked={checked}
        className="h-4 w-4 accent-primary"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}
