"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

// Top-level pages that SHOULD show the nav
const KNOWN_ROUTES = ["login", "signup", "dashboard"];

export default function Nav() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  // Short-link verification pages look like /aB3xK9 — one segment,
  // not a known route. Hide the nav there completely.
  const segments = pathname.split("/").filter(Boolean);
  const isRedirectPage =
    segments.length === 1 && !KNOWN_ROUTES.includes(segments[0]);

  useEffect(() => {
    if (isRedirectPage) return; // skip auth calls on verification pages

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [isRedirectPage]);

  if (isRedirectPage) return null;

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">🔗 Location Shortener</Link>
      <div className="nav-links">
        {loading ? null : session ? (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <button onClick={logout} className="btn-link">Logout</button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
