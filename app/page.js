"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

// No look-alike characters (0/O, 1/l/I). Always 6 chars, matching the DB constraint.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Returns a clean http(s) URL, or null if the input isn't one.
function normalizeUrl(input) {
  const raw = input.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [user, setUser] = useState(undefined); // undefined = still checking
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setShortUrl("");
    setCopied(false);

    const destination = normalizeUrl(url);
    if (!destination) return setError("Enter a valid web address, like https://example.com.");

    setLoading(true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      // user_id is filled in by the database (default auth.uid())
      const { error } = await supabase
        .from("urls")
        .insert({ short_code: code, destination_url: destination });

      if (!error) {
        setShortUrl(`${window.location.origin}/${code}`);
        setLoading(false);
        return;
      }
      if (error.code !== "23505") { // 23505 = code already taken; anything else is real
        setLoading(false);
        return setError(error.message);
      }
    }
    setLoading(false);
    setError("Could not generate a unique code. Try again.");
  }

  async function copy() {
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
  }

  if (user === undefined) {
    return <div className="container"><p>Loading…</p></div>;
  }

  if (user === null) {
    return (
      <div className="container">
        <div className="card">
          <h1>Location Shortener</h1>
          <p className="hint">
            <Link href="/login">Log in</Link> or <Link href="/signup">sign up</Link> to create short links.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Create a short link</h1>
        <p className="hint">Visitors must share their location before they are redirected.</p>
        <form onSubmit={handleSubmit} className="shorten-form">
          <input
            type="text"
            placeholder="https://example.com/long-page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Creating…" : "Shorten"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {shortUrl && (
          <div className="result">
            <div>Your short link:</div>
            <div className="result-row">
              <a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
              <button className="btn btn-secondary" onClick={copy}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
