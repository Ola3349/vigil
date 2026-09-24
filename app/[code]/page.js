"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function RedirectPage() {
  const { code } = useParams();
  // resolving | ready | locating | blocked | redirecting | notfound | unsupported
  const [status, setStatus] = useState("resolving");
  const [link, setLink] = useState(null); // { url_id, destination_url }
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  const requestLocation = useCallback((urlId, destUrl) => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
          // invoke() does NOT throw on HTTP errors: it returns { error }
          const { error } = await supabase.functions.invoke("log-visit", {
            body: {
              url_id: urlId,
              latitude,
              longitude,
              accuracy,
              timezone,
              user_agent: navigator.userAgent,
            },
          });
          if (error) console.error("log-visit failed:", error);
        } catch (e) {
          // Logging failed: still redirect so the visitor isn't stuck
          console.error("Failed to log visit:", e);
        }

        setStatus("redirecting");
        window.location.replace(destUrl);
      },
      (err) => {
        console.warn("Geolocation error:", err.code, err.message);
        setStatus("blocked");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (!code || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/resolve?code=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to resolve this link.");
        setLink(json);
        setStatus("ready");
        // Automatically trigger the browser's location prompt
        requestLocation(json.url_id, json.destination_url);
      } catch (e) {
        setErrorMsg(e.message);
        setStatus("notfound");
      }
    })();
  }, [code, requestLocation]);

  if (status === "notfound") {
    return (
      <div className="center-screen">
        <div className="block-box">
          <h2>Link not found</h2>
          <p style={{ marginTop: 8 }}>{errorMsg || "This short link does not exist."}</p>
        </div>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="center-screen">
        <div className="block-box">
          <h2>Location not supported</h2>
          <p style={{ marginTop: 8 }}>
            Your browser does not support location access, so this link cannot
            be opened. Please try a modern browser like Chrome.
          </p>
        </div>
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="center-screen">
        <div className="block-box">
          <h2>📍 Location access required</h2>
          <p style={{ marginTop: 8 }}>
            This link can only be opened after you allow location access.
          </p>
          <p className="hint" style={{ textAlign: "left" }}>
            If you clicked &quot;Block&quot;, click the padlock / site-settings icon in
            your browser&apos;s address bar, set <strong>Location</strong> to
            &quot;Allow&quot;, then tap the button below.
          </p>
          <button
            className="btn"
            style={{ marginTop: 16 }}
            onClick={() => requestLocation(link.url_id, link.destination_url)}
          >
            Allow location to continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 18 }}>
          {status === "redirecting"
            ? "Redirecting you now…"
            : "Waiting for location access…"}
        </p>
        <p className="hint">
          {status === "redirecting"
            ? "Thank you!"
            : "Respond to the location prompt to continue. The link owner will receive your location, IP address and device details."}
        </p>
      </div>
    </div>
  );
}
