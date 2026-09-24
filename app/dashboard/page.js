"use client";

import { useEffect, useState } from "react";
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // RLS limits this to visits on the logged-in user's own links
      const { data, error } = await supabase
        .from("visits")
        .select(`
          id, created_at, latitude, longitude, accuracy,
          ip, user_agent, timezone,
          urls ( short_code, destination_url )
        `)
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      else setRows(data || []);
      setLoading(false);
    })();
  }, [router]);

  if (loading) {
    return <div className="container"><p>Loading dashboard…</p></div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Visit Dashboard</h1>
        {error && <p className="error">{error}</p>}
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
