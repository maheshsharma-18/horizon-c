import { NextResponse } from "next/server";
import { searchEmails } from "@/lib/corsair";
import { recordWorkflowEvent } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ error: "Query 'q' is required." }, { status: 400 });
  }

  const emails = await searchEmails(q);
  await recordWorkflowEvent("email", "search", { q, count: emails.length });

  return NextResponse.json({ emails });
}
