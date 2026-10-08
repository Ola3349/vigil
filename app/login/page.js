"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return setError(error.message);
    setResetSent(true);
  }

  return (
    <div className="page-shell">
      <div className="panel panel-auth">
        {mode === "login" ? (
          <>
            <h1 className="panel-title">Access Portal</h1>
            <p className="panel-sub">Authenticate to forge and monitor gated links.</p>
            <form onSubmit={handleLogin} className="stack">
              <input type="email" className="input-neon" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" className="input-neon" placeholder="Password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="submit" className="btn-primary btn-block" disabled={loading}>
                {loading ? "Authenticating…" : "Login"}
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
            <p className="form-hint">
              <button type="button" className="link-btn"
                onClick={() => { setMode("forgot"); setError(""); }}>
                Forgot password?
              </button>
            </p>
            <p className="form-hint">No account? <Link href="/signup">Create one</Link></p>
          </>
        ) : resetSent ? (
          <>
            <h1 className="panel-title">Check your inbox</h1>
            <p className="panel-sub">
              If an account exists for <strong>{email}</strong>, a password reset link is on its way.
            </p>
            <button type="button" className="btn-primary btn-block"
              onClick={() => { setMode("login"); setResetSent(false); }}>
              Back to login
            </button>
          </>
        ) : (
          <>
            <h1 className="panel-title">Reset Password</h1>
            <p className="panel-sub">Enter your account email and we&apos;ll send you a reset link.</p>
            <form onSubmit={handleForgot} className="stack">
              <input type="email" className="input-neon" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" className="btn-primary btn-block" disabled={loading}>
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
            <p className="form-hint">
              <button type="button" className="link-btn"
                onClick={() => { setMode("login"); setError(""); }}>
                Back to login
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}