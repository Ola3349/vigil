"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function parseBrowser(ua) {
  if (!ua) return "Unknown";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Unknown";
  const os = /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown";
  return `${browser} on ${os}`;
}

export default function Dashboard() {
  const [links, setLinks] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const router = useRouter();

  const load = useCallback(async () => {
    // RLS limits both queries to the logged-in user's own rows
    const [linksRes, visitsRes] = await Promise.all([
      supabase
        .from("urls")
        .select("id, short_code, destination_url, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("visits")
        .select(`
          id, created_at, latitude, longitude, accuracy,
          ip, user_agent, timezone,
          urls ( short_code, destination_url )
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (linksRes.error) setError(linksRes.error.message);
    else setLinks(linksRes.data || []);

    if (visitsRes.error) setError(visitsRes.error.message);
    else setRows(visitsRes.data || []);

    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      load();
    })();
  }, [router, load]);

  async function handleDelete(link) {
    const ok = window.confirm(
      `Delete /${link.short_code}? This also deletes its recorded visits. This can't be undone.`
    );
    if (!ok) return;

    setDeletingId(link.id);
    const { error } = await supabase.from("urls").delete().eq("id", link.id);
    setDeletingId(null);

    if (error) {
      setError(error.message);
      return;
    }
    // Cascade means the matching visits are gone too — refresh both lists
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
    setRows((prev) => prev.filter((r) => r.urls?.short_code !== link.short_code));
  }

  if (loading) {
    return <div className="container"><p>Loading dashboard…</p></div>;
  }

  return (
    <div className="container">
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h1>Your Links</h1>
        {links.length === 0 ? (
          <p style={{ marginTop: 16 }}>You haven&apos;t created any links yet.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Short URL</th>
                  <th>Destination</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <a href={`/${l.short_code}`} target="_blank" rel="noreferrer">
                        /{l.short_code}
                      </a>
                    </td>
                    <td className="truncate" title={l.destination_url}>
                      {l.destination_url}
                    </td>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleDelete(l)}
                        disabled={deletingId === l.id}
                      >
                        {deletingId === l.id ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Visit Dashboard</h2>
        {rows.length === 0 ? (
          <p style={{ marginTop: 16 }}>No visits recorded yet.</p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Short URL</th>
                  <th>Destination</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Accuracy (m)</th>
                  <th>IP</th>
                  <th>Browser / Device</th>
                  <th>Timezone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>/{r.urls?.short_code}</td>
                    <td className="truncate" title={r.urls?.destination_url}>
                      {r.urls?.destination_url}
                    </td>
                    <td>{r.latitude != null ? r.latitude.toFixed(6) : "—"}</td>
                    <td>{r.longitude != null ? r.longitude.toFixed(6) : "—"}</td>
                    <td>{r.accuracy != null ? Math.round(r.accuracy) : "—"}</td>
                    <td>{r.ip || "—"}</td>
                    <td>{parseBrowser(r.user_agent)}</td>
                    <td>{r.timezone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
