import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-only client: the service-role key bypasses RLS. Never import this in client code.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CODE_REGEX = /^[A-Za-z0-9]{6}$/;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code || !CODE_REGEX.test(code)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("urls")
    .select("id, destination_url")
    .eq("short_code", code)
    .maybeSingle();

  if (error) {
    console.error("resolve lookup failed:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  return NextResponse.json({
    url_id: data.id,
    destination_url: data.destination_url,
  });
}
