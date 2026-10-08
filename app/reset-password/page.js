"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function ResetPassword() {
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => router.push("/dashboard"), 1800);
    return () => clearTimeout(t);
  }, [success, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setSuccess(true);
  }

  if (checking) {
    return <div className="page-shell"><p className="loading-text">Verifying reset link…</p></div>;
  }

  if (!hasSession) {
    return (
      <div className="page-shell">
        <div className="panel panel-auth">
          <h1 className="panel-title">Link expired</h1>
          <p className="panel-sub">
            This password reset link is invalid or has expired. Request a new one from the login page.
          </p>
          <Link href="/login" className="btn-primary btn-block" style={{ textAlign: "center" }}>
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="panel panel-auth">
        {success ? (
          <>
            <h1 className="panel-title">Password updated</h1>
            <p className="panel-sub">Your new password is set. Redirecting you to the dashboard…</p>
          </>
        ) : (
          <>
            <h1 className="panel-title">Set a new password</h1>
            <p className="panel-sub">Choose a strong password for your account.</p>
            <form onSubmit={handleSubmit} className="stack">
              <input type="password" className="input-neon" placeholder="New password (min 6 characters)"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <input type="password" className="input-neon" placeholder="Confirm new password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <button type="submit" className="btn-primary btn-block" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
            {error && <p className="form-error">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}