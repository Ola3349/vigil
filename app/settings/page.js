"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Settings() {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setEmail(data.session.user.email || "");
      setChecking(false);
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      return setError("New password must be at least 6 characters.");
    }
    if (newPassword !== confirm) {
      return setError("New passwords do not match.");
    }

    setLoading(true);

    // Supabase can't verify the old password directly, so we
    // re-authenticate with it first — if this fails, it's wrong.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: oldPassword,
    });
    if (signInError) {
      setLoading(false);
      return setError("Current password is incorrect.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);
    if (updateError) return setError(updateError.message);

    setSuccess(true);
    setOldPassword("");
    setNewPassword("");
    setConfirm("");
  }

  if (checking) {
    return <div className="page-shell"><p className="loading-text">Loading settings…</p></div>;
  }

  return (
    <div className="page-shell">
      <div className="panel panel-auth">
        <h1 className="panel-title">Settings</h1>
        <p className="panel-sub">
          Change the password for <strong>{email}</strong>.
        </p>
        <form onSubmit={handleSave} className="stack">
          <input
            type="password"
            className="input-neon"
            placeholder="Current (old) password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="input-neon"
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            type="password"
            className="input-neon"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {success && (
          <p className="success-text">
            Password updated
          </p>
        )}
      </div>
    </div>
  );
}