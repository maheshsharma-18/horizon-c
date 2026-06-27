import { NextResponse } from "next/server";
import { recordWorkflowEvent } from "@/lib/db";

export async function POST(request: Request) {
  const event = await request.json();
  const eventType = typeof event?.type === "string" ? event.type : "unknown";

  await recordWorkflowEvent("webhook", eventType, {
    payload: event,
  });

  return NextResponse.json({ ok: true });
}
