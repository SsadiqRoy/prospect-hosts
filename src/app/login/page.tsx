"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiMail, FiLock, FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { login } from "../actions";
export default function Login() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const router = useRouter();
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="logo-wrap">
          <img src="/logo.png" alt="SupaSpace" width="144" height="42" />
        </div>
        <span className="eyebrow">HOST WORKSPACE</span>
        <h1>Welcome back</h1>
        <p>Sign in to grow your host network.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              const r = await login(
                String(f.get("email")),
                String(f.get("password")),
              );
              if (r.error) setError(r.error);
              else {
                router.replace("/");
                router.refresh();
              }
            } catch {
              setError("Unable to sign in. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <div className="input-icon">
              <FiMail />
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@example.com"
              />
            </div>
          </label>
          <label>
            Password
            <div className="input-icon">
              <FiLock />
              <input
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
            <FiArrowRight />
          </button>
        </form>
        <p className="muted small">
          Private access. Ask your administrator to add an account.
        </p>
      </section>
    </main>
  );
}
