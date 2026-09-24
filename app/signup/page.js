"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    // Debug logging (safe to remove later): shows which project and what came back
    console.log("Supabase host:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("signUp result:", {
      userId: data?.user?.id,
      identities: data?.user?.identities?.length,
      hasSession: !!data?.session,
      error: error?.message,
    });

    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) router.push("/");
    else setNotice("Account created. Check your email to confirm it, then log in.");
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Sign up</h1>
        <form onSubmit={handleSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password (min 6 characters)" value={password}
            onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {notice && <p className="hint">{notice}</p>}
        <p className="hint">Have an account? <Link href="/login">Log in</Link></p>
      </div>
    </div>
  );
}