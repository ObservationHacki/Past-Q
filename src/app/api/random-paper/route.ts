import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("papers").select("id").limit(500);

  if (error || !data || data.length === 0) {
    return NextResponse.json({ paperId: null }, { status: error ? 500 : 200 });
  }

  const pick = data[Math.floor(Math.random() * data.length)];
  return NextResponse.json({ paperId: pick.id });
}
