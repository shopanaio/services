import fastify from "fastify";
import { sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/database.js";

interface CountRow extends Record<string, unknown> {
  channel?: string;
  status: string;
  definitionKey?: string;
  providerCode?: string;
  count: number;
}

interface OldestPendingRow extends Record<string, unknown> {
  ageSeconds: number;
}

export async function startMetricsServer(input: {
  port: number;
  database: Database;
}) {
  const app = fastify({ disableRequestLogging: true, logger: false });

  app.get("/healthz", async () => {
    await input.database.execute(sql`SELECT 1`);
    return { status: "ok", service: "notifications-metrics" };
  });
  app.get("/metrics", async (_request, reply) => {
    const [
      deliveries,
      occurrences,
      attempts,
      oldestPending,
    ] = await Promise.all([
      input.database.execute<CountRow>(sql`
        SELECT
          channel::text AS channel,
          status::text AS status,
          count(*)::int AS count
        FROM notifications.notification_deliveries
        GROUP BY channel, status
        ORDER BY channel, status
      `),
      input.database.execute<CountRow>(sql`
        SELECT
          definition_key AS "definitionKey",
          status::text AS status,
          count(*)::int AS count
        FROM notifications.notification_occurrences
        GROUP BY definition_key, status
        ORDER BY definition_key, status
      `),
      input.database.execute<CountRow>(sql`
        SELECT
          coalesce(provider_code, 'unassigned') AS "providerCode",
          status::text AS status,
          count(*)::int AS count
        FROM notifications.notification_delivery_attempts
        GROUP BY provider_code, status
        ORDER BY provider_code, status
      `),
      input.database.execute<OldestPendingRow>(sql`
        SELECT coalesce(
          extract(epoch FROM (now() - min(created_at))),
          0
        )::double precision AS "ageSeconds"
        FROM notifications.notification_deliveries
        WHERE status IN (
          'PENDING',
          'RENDERING',
          'SENDING',
          'RETRY_SCHEDULED',
          'UNKNOWN',
          'BLOCKED_NO_PROVIDER'
        )
      `),
    ]);

    const lines = [
      "# HELP shopana_notifications_deliveries_total Deliveries by channel and status.",
      "# TYPE shopana_notifications_deliveries_total gauge",
      ...deliveries.map(
        (row) =>
          `shopana_notifications_deliveries_total{channel="${label(row.channel)}",status="${label(row.status)}"} ${Number(row.count)}`
      ),
      "# HELP shopana_notifications_occurrences_total Occurrences by definition and status.",
      "# TYPE shopana_notifications_occurrences_total gauge",
      ...occurrences.map(
        (row) =>
          `shopana_notifications_occurrences_total{definition="${label(row.definitionKey)}",status="${label(row.status)}"} ${Number(row.count)}`
      ),
      "# HELP shopana_notifications_attempts_total Provider attempts by provider and status.",
      "# TYPE shopana_notifications_attempts_total gauge",
      ...attempts.map(
        (row) =>
          `shopana_notifications_attempts_total{provider="${label(row.providerCode)}",status="${label(row.status)}"} ${Number(row.count)}`
      ),
      "# HELP shopana_notifications_oldest_pending_age_seconds Age of the oldest non-terminal delivery.",
      "# TYPE shopana_notifications_oldest_pending_age_seconds gauge",
      `shopana_notifications_oldest_pending_age_seconds ${Number(oldestPending[0]?.ageSeconds ?? 0)}`,
    ];
    return reply
      .type("text/plain; version=0.0.4; charset=utf-8")
      .send(`${lines.join("\n")}\n`);
  });

  await app.listen({ port: input.port, host: "0.0.0.0" });
  return app;
}

function label(value: string | undefined): string {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll('"', '\\"');
}
