"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EmailMessage, WorkflowEvent } from "@/lib/types";

type Props = {
  initialEvents: WorkflowEvent[];
};

type ApiStatus = {
  kind: "idle" | "success" | "error";
  message: string;
};

const defaultStatus: ApiStatus = { kind: "idle", message: "" };

function splitEmails(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function Dashboard({ initialEvents }: Props) {
  const [searchQuery, setSearchQuery] = useState("in:inbox newer_than:7d");
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [events, setEvents] = useState<WorkflowEvent[]>(initialEvents);

  const [compose, setCompose] = useState({
    to: "",
    cc: "",
    subject: "",
    body: "",
  });

  const [meeting, setMeeting] = useState({
    title: "",
    attendeeEmails: "",
    startISO: "",
    endISO: "",
    location: "",
    description: "",
  });

  const [prompt, setPrompt] = useState(
    "Send a calendar invite to kishansth21@gmail.com at 9 AM next Thursday and send an email saying I look forward to the meeting.",
  );

  const [status, setStatus] = useState<ApiStatus>(defaultStatus);
  const [agentActions, setAgentActions] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasDb = useMemo(() => events.length > 0, [events.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void sendNow();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function refreshEvents() {
    const response = await fetch("/api/workflow/events", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { events: WorkflowEvent[] };
    setEvents(data.events);
  }

  async function runEmailSearch() {
    const response = await fetch(`/api/email/search?q=${encodeURIComponent(searchQuery)}`);
    const data = await response.json();

    if (!response.ok) {
      setStatus({ kind: "error", message: data.error ?? "Failed to search emails." });
      return;
    }

    setEmails(data.emails);
    setStatus({ kind: "success", message: `Loaded ${data.emails.length} email(s).` });
    await refreshEvents();
  }

  async function saveDraft() {
    const response = await fetch("/api/email/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: splitEmails(compose.to),
        cc: splitEmails(compose.cc),
        subject: compose.subject,
        body: compose.body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ kind: "error", message: "Failed to draft email." });
      return;
    }

    setStatus({ kind: "success", message: `Draft created: ${data.draftId}` });
    await refreshEvents();
  }

  async function sendNow() {
    const response = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: splitEmails(compose.to),
        cc: splitEmails(compose.cc),
        subject: compose.subject,
        body: compose.body,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ kind: "error", message: "Failed to send email." });
      return;
    }

    setStatus({ kind: "success", message: `Email sent: ${data.messageId}` });
    await refreshEvents();
  }

  async function createInvite() {
    const startISO = meeting.startISO ? new Date(meeting.startISO).toISOString() : "";
    const endISO = meeting.endISO ? new Date(meeting.endISO).toISOString() : "";

    const response = await fetch("/api/calendar/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: meeting.title,
        attendeeEmails: splitEmails(meeting.attendeeEmails),
        startISO,
        endISO,
        location: meeting.location,
        description: meeting.description,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ kind: "error", message: data.error?.formErrors?.[0] ?? "Failed to create invite." });
      return;
    }

    setStatus({ kind: "success", message: `Invite created: ${data.eventId}` });
    await refreshEvents();
  }

  async function runAgentChat() {
    const response = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus({ kind: "error", message: "Agent request failed." });
      return;
    }

    setAgentActions(data.actions ?? []);
    setStatus({ kind: "success", message: data.summary ?? "Agent actions prepared." });
    await refreshEvents();
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6 text-sm">
      <header className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold">Horizon C • Superhuman-style workspace</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">
          Search Gmail, draft/send emails, create Google Calendar invites, and execute agent actions via Corsair.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {hasDb
            ? "Postgres event log enabled."
            : "Postgres not configured (set DATABASE_URL to persist workflow events)."}
        </p>
      </header>

      {status.kind !== "idle" ? (
        <p className={status.kind === "error" ? "text-red-600" : "text-emerald-600"}>{status.message}</p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Gmail search</h2>
          <div className="mt-3 flex gap-2">
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Search query"
            />
            <button onClick={runEmailSearch} className="rounded-md bg-zinc-900 px-3 py-2 text-white">
              Search
            </button>
          </div>
          <ul className="mt-4 space-y-3">
            {emails.map((email) => (
              <li key={email.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="font-medium">{email.subject}</p>
                <p className="text-xs text-zinc-500">{email.from}</p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-300">{email.bodyPreview}</p>
                <p className="mt-1 text-xs">Priority: {email.priority ?? "low"}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Compose</h2>
          <div className="mt-3 space-y-2">
            <input
              value={compose.to}
              onChange={(event) => setCompose((prev) => ({ ...prev, to: event.target.value }))}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="To (comma-separated)"
            />
            <input
              value={compose.cc}
              onChange={(event) => setCompose((prev) => ({ ...prev, cc: event.target.value }))}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="CC (optional)"
            />
            <input
              value={compose.subject}
              onChange={(event) => setCompose((prev) => ({ ...prev, subject: event.target.value }))}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Subject"
            />
            <textarea
              value={compose.body}
              onChange={(event) => setCompose((prev) => ({ ...prev, body: event.target.value }))}
              className="h-28 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Body"
            />
            <div className="flex gap-2">
              <button onClick={saveDraft} className="rounded-md border border-zinc-300 px-3 py-2">
                Save draft
              </button>
              <button onClick={sendNow} className="rounded-md bg-zinc-900 px-3 py-2 text-white">
                Send now
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Calendar invite</h2>
          <div className="mt-3 space-y-2">
            <input
              value={meeting.title}
              onChange={(event) => setMeeting((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Meeting title"
            />
            <input
              value={meeting.attendeeEmails}
              onChange={(event) => setMeeting((prev) => ({ ...prev, attendeeEmails: event.target.value }))}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Attendee emails (comma-separated)"
            />
            <input
              value={meeting.startISO}
              onChange={(event) => setMeeting((prev) => ({ ...prev, startISO: event.target.value }))}
              type="datetime-local"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
            />
            <input
              value={meeting.endISO}
              onChange={(event) => setMeeting((prev) => ({ ...prev, endISO: event.target.value }))}
              type="datetime-local"
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
            />
            <input
              value={meeting.location}
              onChange={(event) => setMeeting((prev) => ({ ...prev, location: event.target.value }))}
              className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Location"
            />
            <textarea
              value={meeting.description}
              onChange={(event) => setMeeting((prev) => ({ ...prev, description: event.target.value }))}
              className="h-24 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
              placeholder="Agenda"
            />
            <button onClick={createInvite} className="rounded-md bg-zinc-900 px-3 py-2 text-white">
              Create invite
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Agent chat (Corsair MCP)</h2>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="mt-3 h-32 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2"
          />
          <button onClick={runAgentChat} className="mt-2 rounded-md bg-zinc-900 px-3 py-2 text-white">
            Execute
          </button>
          <ul className="mt-3 list-disc pl-5 text-zinc-600 dark:text-zinc-300">
            {agentActions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Realtime event feed</h2>
          <button onClick={refreshEvents} className="rounded-md border border-zinc-300 px-3 py-2">
            Refresh
          </button>
        </div>
        <ul className="space-y-2 text-xs">
          {events.map((event) => (
            <li key={event.id} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="font-semibold">
                {event.source.toUpperCase()} · {event.eventType}
              </p>
              <p className="mt-1 text-zinc-500">{new Date(event.createdAt).toLocaleString()}</p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-2 text-[11px] dark:bg-zinc-900">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </li>
          ))}
          {events.length === 0 ? <li className="text-zinc-500">No events recorded yet.</li> : null}
        </ul>
      </section>
    </main>
  );
}
