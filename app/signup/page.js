"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) {
      router.push("/dashboard");
    } else {
      setNeedsConfirmation(true);
    }
  }

  if (needsConfirmation) {
    return (
      <div className="page-shell">
        <div className="panel panel-auth">
          <h1 className="panel-title">Confirm your email</h1>
          <p className="panel-sub">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then return to log in.
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
        <h1 className="panel-title">Initiate Access</h1>
        <p className="panel-sub">Create your HEIMDELL account.</p>
        <form onSubmit={handleSubmit} className="stack">
          <input type="email" className="input-neon" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" className="input-neon" placeholder="Password (min 6 characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
        <p className="form-hint">Already registered? <Link href="/login">Login</Link></p>
      </div>
    </div>
  );
}