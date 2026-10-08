import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

<<<<<<< HEAD
=======
// This route reads live data and must never be cached or statically optimized.
export const dynamic = "force-dynamic";

// Server-only client: the service-role key bypasses RLS. Never import this in client code.
>>>>>>> f0eb7569a0114de0fc4bc6f648229e1bdf22d69d
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