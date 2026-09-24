import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Accept only numbers inside a sane range; anything else becomes null.
const num = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null;
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max) : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.url_id) return json({ error: "url_id is required" }, 400);

    // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Make sure the link exists (prevents junk rows)
    const { data: urlRow, error: lookupError } = await supabaseAdmin
      .from("urls")
      .select("id")
      .eq("id", body.url_id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!urlRow) return json({ error: "Unknown url_id" }, 404);

    // The browser can't see its own public IP, so read it from request headers
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    const { error } = await supabaseAdmin.from("visits").insert({
      url_id: body.url_id,
      latitude: num(body.latitude, -90, 90),
      longitude: num(body.longitude, -180, 180),
      accuracy: num(body.accuracy, 0, 10_000_000),
      ip,
      user_agent: req.headers.get("user-agent") || str(body.user_agent, 500),
      timezone: str(body.timezone, 64),
    });
    if (error) throw error;

    return json({ success: true });
  } catch (e) {
    console.error("log-visit error:", e); // visible in Dashboard -> Edge Functions -> Logs
    return json({ error: "Failed to log visit" }, 500);
  }
});
