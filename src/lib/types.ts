export type Priority = "low" | "medium" | "high";

export type EmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  bodyPreview: string;
  receivedAt: string;
  labels: string[];
  priority?: Priority;
};

export type EmailDraftInput = {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
};

export type CalendarInviteInput = {
  title: string;
  description?: string;
  attendeeEmails: string[];
  startISO: string;
  endISO: string;
  location?: string;
};

export type WorkflowEvent = {
  id: number;
  source: "email" | "calendar" | "agent" | "webhook";
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
};
