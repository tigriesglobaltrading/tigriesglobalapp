import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function LoginPage() {
  const { isLoading, session, signIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";

  useEffect(() => {
    if (!isLoading && session) {
      navigate(redirectTo, { replace: true });
    }
  }, [isLoading, navigate, redirectTo, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-media" aria-hidden="true">
          <div
            className="auth-media-image"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgb(29 78 216 / 80%), rgb(2 6 23 / 20%)), url("/images/login.jpg")',
            }}
          />
          <div className="auth-media-overlay" />
          <div className="auth-media-card">
            <div className="auth-media-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>Centralized operations</strong>
              <span>Dashboard, data, and secure access.</span>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-heading">
            <span>Dashboard</span>
            <h1>Sign in</h1>
            <p>
              Enter your credentials to access your management workspace.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email
              <span className="auth-input">
                <Mail aria-hidden="true" size={18} />
                <input
                  autoComplete="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={email}
                />
              </span>
            </label>
            <label>
              Password
              <span className="auth-input">
                <LockKeyhole aria-hidden="true" size={18} />
                <input
                  autoComplete="current-password"
                  minLength={6}
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  type="password"
                  value={password}
                />
              </span>
            </label>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <button disabled={isSubmitting} type="submit">
              <span>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </span>
              <ArrowRight aria-hidden="true" size={18} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unable to continue with these credentials.";
  }

  if (error.message.toLowerCase().includes("invalid login credentials")) {
    return "Incorrect email or password, or the account is not confirmed yet.";
  }

  return error.message;
}
