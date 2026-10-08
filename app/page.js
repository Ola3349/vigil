"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const IMG_BASE = "https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/statu-image.png";
const IMG_MASK = "https://strvid.nyc3.cdn.digitaloceanspaces.com/motionsite/statu-image-mask.png";

const CODE_LENGTH = 6;
const CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateCode() {
  const bytes = new Uint32Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[bytes[i] % CHARSET.length];
  }
  return code;
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function TriangleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4 21 19H3L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="14.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [myLinks, setMyLinks] = useState([]);

  const heroRef = useRef(null);
  const maskRef = useRef(null);
  const haloRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (session) fetchMyLinks();
  }, [session]);

  /* ---------- spotlight mask-reveal engine (60fps lerp) ---------- */
  useEffect(() => {
    const hero = heroRef.current;
    const maskLayer = maskRef.current;
    const halo = haloRef.current;
    if (!hero || !maskLayer || !halo) return;

    let targetX = window.innerWidth * 0.65;
    let targetY = window.innerHeight * 0.5;
    let currentX = targetX;
    let currentY = targetY;
    let isHovered = false;
    let raf = 0;
    const spotlightRadius = 140;

    function updateMask() {
      const maskStyle = `radial-gradient(circle ${spotlightRadius}px at ${currentX}px ${currentY}px, black 0%, rgba(0,0,0,0.85) 45%, rgba(0,0,0,0.3) 70%, transparent 100%)`;
      maskLayer.style.maskImage = maskStyle;
      maskLayer.style.webkitMaskImage = maskStyle;

      halo.style.left = `${currentX}px`;
      halo.style.top = `${currentY}px`;
      halo.style.width = `${spotlightRadius * 2}px`;
      halo.style.height = `${spotlightRadius * 2}px`;
    }

    function animate() {
      const ease = isHovered ? 0.15 : 0.04;
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;

      if (!isHovered) {
        const time = Date.now() * 0.0012;
        targetX = window.innerWidth * 0.65 + Math.cos(time) * 50;
        targetY = window.innerHeight * 0.5 + Math.sin(time * 1.3) * 35;
      }

      updateMask();
      raf = requestAnimationFrame(animate);
    }

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      isHovered = true;
    };
    const onLeave = () => {
      isHovered = false;
    };
    const onTouch = (e) => {
      if (e.touches.length > 0) {
        targetX = e.touches[0].clientX;
        targetY = e.touches[0].clientY;
        isHovered = true;
      }
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    hero.addEventListener("touchmove", onTouch, { passive: true });

    updateMask();
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      hero.removeEventListener("touchmove", onTouch);
    };
  }, []);

  /* ---------- floating particles canvas ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c2d = canvas.getContext("2d");

    let w = 0;
    let h = 0;
    let raf = 0;
    const N = 48;
    const parts = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    function init() {
      parts.length = 0;
      for (let i = 0; i < N; i++) {
        parts.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: 0.8 + Math.random() * 1.8,
          a: 0.15 + Math.random() * 0.5,
        });
      }
    }
    function loop() {
      c2d.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        if (p.y > h + 5) p.y = -5;
        c2d.beginPath();
        c2d.shadowBlur = 12;
        c2d.shadowColor = "rgba(0, 255, 157, 0.8)";
        c2d.fillStyle = `rgba(0, 255, 157, ${p.a})`;
        c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c2d.fill();
      }
      raf = requestAnimationFrame(loop);
    }

    resize();
    init();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", () => {
      resize();
      init();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ---------- shorten logic ---------- */
  async function fetchMyLinks() {
    const { data } = await supabase
      .from("urls")
      .select("short_code, destination_url, created_at")
      .order("created_at", { ascending: false });
    if (data) setMyLinks(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setShortUrl("");
    setCopied(false);

    let url = destinationUrl.trim();
    if (!url) return setError("Please enter a URL.");
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    try {
      new URL(url);
    } catch {
      return setError("That does not look like a valid URL.");
    }

    setCreating(true);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { error: insertError } = await supabase
        .from("urls")
        .insert({
          user_id: session.user.id,
          short_code: code,
          destination_url: url,
        });

      if (!insertError) {
        setShortUrl(`${window.location.origin}/${code}`);
        setDestinationUrl("");
        fetchMyLinks();
        setCreating(false);
        return;
      }
      if (insertError.code !== "23505") {
        setError(insertError.message);
        setCreating(false);
        return;
      }
    }
    setError("Could not generate a unique code. Please try again.");
    setCreating(false);
  }

  function copy() {
    navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return <div className="page-shell"><p className="loading-text">Loading…</p></div>;
  }

  return (
    <section className="hero" ref={heroRef}>
      {/* background statue stage */}
      <div className="hero-stage">
        <img src={IMG_BASE} alt="" className="hero-img" draggable="false" />
        <img src={IMG_MASK} alt="" className="hero-img mask-layer" ref={maskRef} draggable="false" />
        <div className="spotlight-halo" ref={haloRef}></div>
      </div>

      {/* cyber grid + particles */}
      <div className="cyber-grid"></div>
      <canvas id="particles" ref={canvasRef}></canvas>

      {/* foreground content */}
      <div className="hero-content">
        <div className="hero-copy">
          <span className="badge-pill">
            <span className="pulse-dot"></span> Cyber-HEIMDELL Intelligence
          </span>

          <h1 className="hero-title">HEIMDELL</h1>
          <p className="hero-sub">Empowering Innovation with Power &amp; Wisdom</p>

          <div className="glass-panel" id="shorten">
            {session ? (
              <>
                <p className="panel-sub">Forge a new gated link — visitors must pass verification first.</p>
                <form onSubmit={handleSubmit} className="shorten-form">
                  <input
                    type="text"
                    className="input-neon"
                    placeholder="https://destination-url.com/very/long/path"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" disabled={creating}>
                    {creating ? "Forging…" : "Shorten"}
                  </button>
                </form>

                {error && <p className="form-error">{error}</p>}

                {shortUrl && (
                  <div className="result">
                    <strong>Your short URL:</strong>
                    <div className="result-row">
                      <a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a>
                      <button onClick={copy} className="btn-copy">{copied ? "Copied!" : "Copy"}</button>
                    </div>
                  </div>
                )}

                {myLinks.length > 0 && (
                  <div className="mini-links">
                    <h3>Recent links</h3>
                    {myLinks.slice(0, 5).map((l) => (
                      <div className="mini-row" key={l.short_code}>
                        <a href={`/${l.short_code}`} target="_blank" rel="noreferrer">
                          /{l.short_code}
                        </a>
                        <span className="dest" title={l.destination_url}>{l.destination_url}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="panel-sub">
                  Create location-gated short links and track every visitor.
                </p>
                <div className="cta-row">
                  <Link href="/login" className="btn-arrow">
                    Login to continue <span className="orb"><ArrowIcon /></span>
                  </Link>
                  <Link href="/signup" className="btn-connect">
                    <TriangleIcon /> Create account
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* footer bar */}
      <div className="hero-footer">
        <div className="socials">
          <a href="#" className="icon-orb" aria-label="Facebook">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
          <a href="#" className="icon-orb" aria-label="Instagram">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </a>
          <a href="#" className="icon-orb" aria-label="Twitter">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
            </svg>
          </a>
        </div>

        <div className="mouse-wheel" aria-hidden="true">
          <div className="wheel-dot"></div>
        </div>

        <span className="status-badge">
          <span className="pulse-dot"></span> MASK ACTIVE
        </span>
      </div>
    </section>
  );
}