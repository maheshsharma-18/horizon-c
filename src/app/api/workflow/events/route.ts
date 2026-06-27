import { NextResponse } from "next/server";
import { listWorkflowEvents } from "@/lib/db";

export async function GET() {
  const events = await listWorkflowEvents();
  return NextResponse.json({ events });
}
