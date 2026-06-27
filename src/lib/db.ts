import { Pool } from "pg";
import type { WorkflowEvent } from "@/lib/types";

declare global {
  var __horizonPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

const pool =
  connectionString == null || connectionString.length === 0
    ? null
    : (global.__horizonPool ??=
        new Pool({
          connectionString,
          ssl:
            process.env.NODE_ENV === "production"
              ? { rejectUnauthorized: false }
              : undefined,
        }));

export async function ensureSchema(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_events (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function recordWorkflowEvent(
  source: WorkflowEvent["source"],
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!pool) {
    return;
  }

  await ensureSchema();

  await pool.query(
    `
      INSERT INTO workflow_events (source, event_type, payload)
      VALUES ($1, $2, $3)
    `,
    [source, eventType, payload],
  );
}

export async function listWorkflowEvents(limit = 30): Promise<WorkflowEvent[]> {
  if (!pool) {
    return [];
  }

  await ensureSchema();

  const result = await pool.query<{
    id: string;
    source: WorkflowEvent["source"];
    event_type: string;
    payload: Record<string, unknown>;
    created_at: Date;
  }>(
    `
      SELECT id, source, event_type, payload, created_at
      FROM workflow_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [Math.max(1, limit)],
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    source: row.source,
    eventType: row.event_type,
    payload: row.payload,
    createdAt: row.created_at.toISOString(),
  }));
}
