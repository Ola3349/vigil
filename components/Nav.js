"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { sfx } from "../lib/sound";

// Top-level pages that SHOULD show the nav
const KNOWN_ROUTES = ["login", "signup", "dashboard", "reset-password"];

function Emblem() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5 21 19H3L12 3.5Z" stroke="#00ff9d" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="14.2" r="2.1" fill="#00ff9d" />
    </svg>
  );
}

export default function Nav() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Short-link verification pages look like /aB3xK9 — one segment,
  // not a known route. Hide the nav there completely.
  const segments = pathname.split("/").filter(Boolean);
  const isRedirectPage =
    segments.length === 1 && !KNOWN_ROUTES.includes(segments[0]);

  useEffect(() => {
    if (isRedirectPage) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    // global sound hooks
    const over = (e) => {
      if (e.target.closest && e.target.closest("a, button")) sfx.hover();
    };
    const click = (e) => {
      if (e.target.closest && e.target.closest("a, button")) sfx.click();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("click", click);

    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("click", click);
    };
  }, [isRedirectPage]);

  // close the dropdown when clicking anywhere else
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (!e.target.closest(".menu-dropdown") && !e.target.closest(".menu-toggle")) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  if (isRedirectPage) return null;

  async function logout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleSound() {
    setSoundOn(sfx.toggle());
  }

  const exploreHref = session ? "#shorten" : "/login";

  return (
    <>
      <header className="site-nav">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-emblem"><Emblem /></span>
            <span className="brand-name">HEIMDELL</span>
          </Link>

          <div className="nav-actions">
            <button
              className="icon-orb"
              onClick={toggleSound}
              aria-label={soundOn ? "Mute sound" : "Enable sound"}
            >
              {soundOn ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              )}
            </button>

            <Link href={exploreHref} className="btn-primary cta-explore">Explore Portal</Link>

            <button
              className="icon-orb menu-toggle"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* dropdown menu */}
      <div className={`menu-dropdown${menuOpen ? " open" : ""}`}>
        {!loading && session ? (
          <>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="dd-link">Dashboard</Link>
            <button onClick={logout} className="dd-link">Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="dd-link">Login</Link>
            <Link href="/signup" onClick={() => setMenuOpen(false)} className="dd-link">Sign up</Link>
          </>
        )}
      </div>
    </>
  );
}