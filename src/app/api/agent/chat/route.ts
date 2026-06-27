import { z } from "zod";
import { NextResponse } from "next/server";
import { runAgentInstruction } from "@/lib/corsair";
import { recordWorkflowEvent } from "@/lib/db";

const payloadSchema = z.object({
  prompt: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const response = await runAgentInstruction(parsed.data.prompt);

  await recordWorkflowEvent("agent", "chat", {
    prompt: parsed.data.prompt,
    summary: response.summary,
    actions: response.actions,
  });

  return NextResponse.json(response);
}
