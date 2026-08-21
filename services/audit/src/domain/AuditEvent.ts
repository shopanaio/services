import { createHash } from "node:crypto";
import { z } from "zod";
import type { DomainEvent } from "@shopana/events";

const auditValueSchema = z
  .object({
    state: z.enum(["VISIBLE", "MASKED", "OMITTED"]),
    value: z.unknown().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.state !== "VISIBLE" && value.value !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only visible audit values may carry data",
      });
    }
  });

const changeSchema = z
  .object({
    path: z.string().min(1).max(512),
    kind: z.enum(["SET", "ADD", "REMOVE", "MOVE"]),
    before: auditValueSchema.optional(),
    after: auditValueSchema.optional(),
  })
  .strict();

const operationSchema = z
  .object({
    position: z.number().int().nonnegative(),
    type: z.string().min(1).max(128),
    action: z.enum(["CREATE", "UPDATE", "DELETE", "MOVE", "LINK", "UNLINK"]),
    target: z
      .object({ type: z.string().min(1).max(64), id: z.string().min(1) })
      .strict()
      .optional(),
    changes: z.array(changeSchema),
  })
  .strict();

const auditSchema = z
  .object({
    kind: z.literal("aggregate-mutation"),
    schemaVersion: z.literal(1),
    storeId: z.string().min(1),
    action: z.enum(["CREATE", "UPDATE", "DELETE"]),
    command: z.string().min(1).max(128),
    aggregate: z.object({ type: z.string().min(1).max(64), id: z.string().min(1) }).strict(),
    operations: z
      .array(operationSchema)
      .min(1)
      .superRefine((operations, context) => {
        const positions = new Set<number>();
        for (const operation of operations) {
          if (positions.has(operation.position)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Audit operation positions must be unique",
            });
          }
          positions.add(operation.position);
        }
      }),
  })
  .strict();

const incomingEventSchema = z
  .object({
    eventId: z.string().min(1),
    eventType: z.string().min(1).max(128),
    emitKey: z.string().min(1),
    eventSequence: z.number().int().positive(),
    timestamp: z.string().datetime({ offset: true }),
    source: z.string().min(1).max(64),
    payload: z.object({ audit: auditSchema }).passthrough(),
    parentWorkflowId: z.string().min(1).optional(),
    context: z
      .object({
        organizationId: z.string().min(1),
        correlationId: z.string().min(1),
      })
      .passthrough(),
    subject: z.object({ type: z.string().min(1), id: z.string().min(1) }).strict(),
    actor: z
      .object({ type: z.enum(["user", "service", "system"]), id: z.string().min(1).optional() })
      .strict()
      .optional(),
  })
  .strict();

export type AuditEntryInput = ReturnType<typeof parseAuditEvent>;

/** Validated, privacy-safe aggregate mutation event used by the append-only projection. */
export function parseAuditEvent(event: DomainEvent<string, Record<string, unknown>>) {
  const parsed = incomingEventSchema.parse(event);
  const audit = parsed.payload.audit;
  if (parsed.subject.type !== audit.aggregate.type || parsed.subject.id !== audit.aggregate.id) {
    throw new Error("Audit aggregate must match the event subject");
  }
  if (parsed.actor?.type === "user" && !parsed.actor.id) {
    throw new Error("User audit actor must have an ID");
  }

  const operations = [...audit.operations].sort((left, right) => left.position - right.position);
  return {
    eventId: parsed.eventId,
    organizationId: parsed.context.organizationId,
    storeId: audit.storeId,
    eventSequence: parsed.eventSequence,
    eventType: parsed.eventType,
    aggregateType: audit.aggregate.type,
    aggregateId: audit.aggregate.id,
    action: audit.action,
    command: audit.command,
    actorType: (parsed.actor?.type ?? "system").toUpperCase() as "USER" | "SERVICE" | "SYSTEM",
    actorId: parsed.actor?.id ?? null,
    sourceService: parsed.source,
    parentWorkflowId: parsed.parentWorkflowId ?? null,
    correlationId: parsed.context.correlationId,
    schemaVersion: audit.schemaVersion,
    occurredAt: parsed.timestamp,
    operations,
  };
}

export function auditRecordDigest(input: AuditEntryInput): string {
  return createHash("sha256").update(stableJson(input)).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}
