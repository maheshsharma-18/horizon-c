import { z } from "zod";
import { NextResponse } from "next/server";
import { draftEmail } from "@/lib/corsair";
import { recordWorkflowEvent } from "@/lib/db";

const payloadSchema = z.object({
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

  const response = await draftEmail(parsed.data);
  await recordWorkflowEvent("email", "draft", {
    to: parsed.data.to,
    subject: parsed.data.subject,
    draftId: response.draftId,
  });

  return NextResponse.json(response);
}
