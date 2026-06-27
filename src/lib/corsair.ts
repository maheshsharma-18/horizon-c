import { z } from "zod";
import type {
  CalendarInviteInput,
  EmailDraftInput,
  EmailMessage,
  Priority,
} from "@/lib/types";

const corsairUrl = process.env.CORSAIR_API_URL ?? "";
const corsairApiKey = process.env.CORSAIR_API_KEY ?? "";

const emailSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.array(z.string()),
  subject: z.string(),
  bodyPreview: z.string(),
  receivedAt: z.string(),
  labels: z.array(z.string()),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

function inferPriority(text: string): Priority {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("urgent") ||
    normalized.includes("asap") ||
    normalized.includes("critical")
  ) {
    return "high";
  }

  if (normalized.includes("follow up") || normalized.includes("review")) {
    return "medium";
  }

  return "low";
}

async function corsairFetch<T>(
  path: string,
  init: RequestInit,
  fallback: () => T,
): Promise<T> {
  if (!corsairUrl || !corsairApiKey) {
    return fallback();
  }

  try {
    const response = await fetch(`${corsairUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + corsairApiKey,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return fallback();
    }

    return (await response.json()) as T;
  } catch {
    return fallback();
  }
}

export async function searchEmails(query: string): Promise<EmailMessage[]> {
  const data = await corsairFetch<{ emails: EmailMessage[] }>(
    `/gmail/search?q=${encodeURIComponent(query)}`,
    { method: "GET" },
    () => ({
      emails: [
        {
          id: "mock-1",
          threadId: "thread-1",
          from: "teammate@example.com",
          to: ["you@example.com"],
          subject: "Urgent: review product launch memo",
          bodyPreview: "Need your review before 5 PM.",
          receivedAt: new Date().toISOString(),
          labels: ["INBOX", "IMPORTANT"],
          priority: "high",
        },
      ],
    }),
  );

  return data.emails
    .map((entry) => {
      const parsed = emailSchema.safeParse({
        ...entry,
        priority: entry.priority ?? inferPriority(`${entry.subject} ${entry.bodyPreview}`),
      });

      return parsed.success ? parsed.data : null;
    })
    .filter((entry): entry is EmailMessage => entry !== null);
}

export async function draftEmail(input: EmailDraftInput): Promise<{ draftId: string }> {
  return corsairFetch<{ draftId: string }>(
    "/gmail/drafts",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    () => ({ draftId: `draft-${Date.now()}` }),
  );
}

export async function sendEmail(
  input: EmailDraftInput & { draftId?: string },
): Promise<{ messageId: string }> {
  return corsairFetch<{ messageId: string }>(
    "/gmail/send",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    () => ({ messageId: `msg-${Date.now()}` }),
  );
}

export async function createCalendarInvite(
  input: CalendarInviteInput,
): Promise<{ eventId: string; htmlLink?: string }> {
  return corsairFetch<{ eventId: string; htmlLink?: string }>(
    "/calendar/events",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    () => ({ eventId: `event-${Date.now()}` }),
  );
}

export async function runAgentInstruction(
  prompt: string,
): Promise<{ summary: string; actions: string[] }> {
  return corsairFetch<{ summary: string; actions: string[] }>(
    "/mcp/chat",
    {
      method: "POST",
      body: JSON.stringify({ prompt }),
    },
    () => ({
      summary:
        "Mock mode: configure CORSAIR_API_URL and CORSAIR_API_KEY to execute Gmail/Calendar actions.",
      actions: ["Parsed instruction", "Prepared send-email action", "Prepared calendar-invite action"],
    }),
  );
}
