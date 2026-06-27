import { z } from "zod";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/corsair";
import { recordWorkflowEvent } from "@/lib/db";

const payloadSchema = z.object({
  draftId: z.string().optional(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const response = await sendEmail(parsed.data);
  await recordWorkflowEvent("email", "send", {
    to: parsed.data.to,
    subject: parsed.data.subject,
    messageId: response.messageId,
  });

  return NextResponse.json(response);
}
