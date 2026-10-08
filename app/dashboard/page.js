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
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!session) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("visits")
          .select(`
            id, created_at, latitude, longitude, accuracy,
            ip, user_agent, timezone,
            urls ( short_code, destination_url )
          `)
          .order("created_at", { ascending: false });

        if (!mounted) return;
        if (error) setError(error.message);
        else setRows(data || []);
      } catch (e) {
        // network blocked / offline / extension interference → show it, don't hang
        if (mounted) setError(e?.message || "Failed to load visits.");
      } finally {
        if (mounted) setLoading(false); // EVERY path clears loading
      }
    })();

    // absolute safety net: never spin forever
    const failsafe = setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
      router.push("/login");
    }, 6000);

    return () => {
      mounted = false;
      clearTimeout(failsafe);
    };
  }, [router]);

  if (loading) {
    return <div className="page-shell"><p className="loading-text">Loading dashboard…</p></div>;
  }

  return (
    <div className="page-shell">
      <div className="panel panel-wide">
        <h1 className="panel-title">Visitor Intelligence</h1>
        <p className="panel-sub">All verification events captured across your gated links.</p>
        {error && <p className="form-error">{error}</p>}
        {rows.length === 0 && !error ? (
          <p className="empty-text">No visits recorded yet.</p>
        ) : rows.length > 0 ? (
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
        ) : null}
      </div>
    </div>
  );
}