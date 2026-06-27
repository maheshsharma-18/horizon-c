import { z } from "zod";
import { NextResponse } from "next/server";
import { createCalendarInvite } from "@/lib/corsair";
import { recordWorkflowEvent } from "@/lib/db";

const payloadSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
    attendeeEmails: z.array(z.string().email()).min(1),
    startISO: z.string().datetime(),
    endISO: z.string().datetime(),
    location: z.string().optional(),
  })
  .refine((value) => new Date(value.endISO).getTime() > new Date(value.startISO).getTime(), {
    message: "endISO must be after startISO",
    path: ["endISO"],
  });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const response = await createCalendarInvite(parsed.data);
  await recordWorkflowEvent("calendar", "invite", {
    title: parsed.data.title,
    attendeeEmails: parsed.data.attendeeEmails,
    eventId: response.eventId,
  });

  return NextResponse.json(response);
}
