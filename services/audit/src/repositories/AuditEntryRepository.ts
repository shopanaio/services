import { and, count, desc, eq, gt, gte, inArray, lt, lte, or, type SQL } from "drizzle-orm";
import { Transactional } from "@shopana/shared-kernel";
import { auditRecordDigest, type AuditEntryInput } from "../domain/index.js";
import {
  auditEntries,
  auditOperations,
  auditTargets,
  type AuditEntryRecord,
  type AuditOperationRecord,
} from "./models/index.js";
import { BaseRepository } from "./BaseRepository.js";

export interface AuditEntryWhere {
  aggregateId?: string | null;
  targetId?: string | null;
  actorId?: string | null;
  actions?: readonly ("CREATE" | "UPDATE" | "DELETE")[] | null;
  commands?: readonly string[] | null;
  occurredFrom?: string | null;
  occurredTo?: string | null;
}

export interface AuditConnectionInput {
  first?: number | null;
  after?: string | null;
  where?: AuditEntryWhere | null;
  targetId?: string | null;
  organizationId: string;
  storeId: string;
}

export interface AuditConnectionResult {
  edges: Array<{ cursor: string; node: AuditEntryRecord }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

/**
 * Persistence boundary for the immutable audit projection.
 * Query and ingestion methods are intentionally added with the business implementation.
 */
export class AuditEntryRepository extends BaseRepository {
  @Transactional()
  async append(input: AuditEntryInput): Promise<void> {
    const inserted = await this.connection
      .insert(auditEntries)
      .values({
        eventId: input.eventId,
        organizationId: input.organizationId,
        storeId: input.storeId,
        eventSequence: input.eventSequence,
        eventType: input.eventType,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        action: input.action,
        command: input.command,
        actorType: input.actorType,
        actorId: input.actorId,
        sourceService: input.sourceService,
        parentWorkflowId: input.parentWorkflowId,
        correlationId: input.correlationId,
        schemaVersion: input.schemaVersion,
        occurredAt: input.occurredAt,
        recordDigest: auditRecordDigest(input),
      })
      .onConflictDoNothing({ target: auditEntries.eventId })
      .returning({ eventId: auditEntries.eventId });
    if (inserted.length === 0) {
      const [existing] = await this.connection
        .select({ digest: auditEntries.recordDigest })
        .from(auditEntries)
        .where(eq(auditEntries.eventId, input.eventId))
        .limit(1);
      if (!existing || existing.digest !== auditRecordDigest(input)) {
        throw new Error("Audit event ID conflicts with a different immutable record");
      }
      return;
    }

    await this.connection.insert(auditOperations).values(
      input.operations.map((operation) => ({
        eventId: input.eventId,
        position: operation.position,
        operationType: operation.type,
        action: operation.action,
        targetType: operation.target?.type ?? null,
        targetId: operation.target?.id ?? null,
        changes: operation.changes,
      })),
    );

    const targets = new Map<string, { targetType: string; targetId: string; isRoot: boolean }>();
    targets.set(`${input.aggregateType}:${input.aggregateId}`, {
      targetType: input.aggregateType,
      targetId: input.aggregateId,
      isRoot: true,
    });
    for (const operation of input.operations) {
      if (operation.target) {
        const key = `${operation.target.type}:${operation.target.id}`;
        if (!targets.has(key)) {
          targets.set(key, {
            targetType: operation.target.type,
            targetId: operation.target.id,
            isRoot: false,
          });
        }
      }
    }
    await this.connection.insert(auditTargets).values(
      [...targets.values()].map((target) => ({
        eventId: input.eventId,
        organizationId: input.organizationId,
        ...target,
      })),
    );
  }

  async findByEventId(
    eventId: string,
    organizationId: string,
    storeId: string,
  ): Promise<AuditEntryRecord | null> {
    const [entry] = await this.connection
      .select()
      .from(auditEntries)
      .where(
        and(
          eq(auditEntries.eventId, eventId),
          eq(auditEntries.organizationId, organizationId),
          eq(auditEntries.storeId, storeId),
        ),
      )
      .limit(1);
    return entry ?? null;
  }

  async findOperations(eventId: string) {
    return this.connection
      .select()
      .from(auditOperations)
      .where(eq(auditOperations.eventId, eventId))
      .orderBy(auditOperations.position);
  }

  async findOperationsByEventIds(eventIds: readonly string[]) {
    if (eventIds.length === 0) return new Map<string, AuditOperationRecord[]>();
    const operations = await this.connection
      .select()
      .from(auditOperations)
      .where(inArray(auditOperations.eventId, [...eventIds]))
      .orderBy(auditOperations.eventId, auditOperations.position);
    const grouped = new Map<string, AuditOperationRecord[]>();
    for (const operation of operations) {
      const group = grouped.get(operation.eventId);
      if (group) group.push(operation);
      else grouped.set(operation.eventId, [operation]);
    }
    return grouped;
  }

  async getConnection(input: AuditConnectionInput): Promise<AuditConnectionResult> {
    const first = normalizeFirst(input.first);
    const cursor = input.after ? decodeCursor(input.after) : null;
    const conditions = [
      eq(auditEntries.organizationId, input.organizationId),
      eq(auditEntries.storeId, input.storeId),
      ...this.whereConditions(input.where, input.targetId, input.organizationId),
    ];
    if (cursor) {
      conditions.push(
        or(
          lt(auditEntries.occurredAt, cursor.occurredAt),
          and(
            eq(auditEntries.occurredAt, cursor.occurredAt),
            gt(auditEntries.eventId, cursor.eventId),
          ),
        )!,
      );
    }
    const [rows, counted] = await Promise.all([
      this.connection
        .select()
        .from(auditEntries)
        .where(and(...conditions))
        .orderBy(desc(auditEntries.occurredAt), auditEntries.eventId)
        .limit(first + 1),
      this.connection
        .select({ total: count() })
        .from(auditEntries)
        .where(
          and(
            eq(auditEntries.organizationId, input.organizationId),
            eq(auditEntries.storeId, input.storeId),
            ...this.whereConditions(input.where, input.targetId, input.organizationId),
          ),
        ),
    ]);
    const page = rows.slice(0, first);
    const edges = page.map((node) => ({
      cursor: encodeCursor(node.occurredAt, node.eventId),
      node,
    }));
    return {
      edges,
      totalCount: counted[0]?.total ?? 0,
      pageInfo: {
        hasNextPage: rows.length > first,
        hasPreviousPage: cursor !== null,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges.at(-1)?.cursor ?? null,
      },
    };
  }

  private whereConditions(
    where: AuditEntryWhere | null | undefined,
    targetId: string | null | undefined,
    organizationId: string,
  ): SQL[] {
    const conditions: SQL[] = [];
    if (where?.aggregateId) conditions.push(eq(auditEntries.aggregateId, where.aggregateId));
    if (where?.actorId) conditions.push(eq(auditEntries.actorId, where.actorId));
    if (where?.actions?.length) conditions.push(inArray(auditEntries.action, [...where.actions]));
    if (where?.commands?.length)
      conditions.push(inArray(auditEntries.command, [...where.commands]));
    if (where?.occurredFrom)
      conditions.push(gte(auditEntries.occurredAt, normalizeDate(where.occurredFrom)));
    if (where?.occurredTo)
      conditions.push(lte(auditEntries.occurredAt, normalizeDate(where.occurredTo)));
    const effectiveTargetId = targetId ?? where?.targetId;
    if (effectiveTargetId) {
      conditions.push(
        inArray(
          auditEntries.eventId,
          this.connection
            .select({ eventId: auditTargets.eventId })
            .from(auditTargets)
            .where(
              and(
                eq(auditTargets.organizationId, organizationId),
                eq(auditTargets.targetId, effectiveTargetId),
              ),
            ),
        ),
      );
    }
    return conditions;
  }
}

function normalizeFirst(value: number | null | undefined): number {
  const first = value ?? 50;
  if (!Number.isInteger(first) || first < 1 || first > 100) {
    throw new Error("first must be between 1 and 100");
  }
  return first;
}

function normalizeDate(value: string): string {
  if (Number.isNaN(Date.parse(value))) throw new Error("Invalid audit timestamp filter");
  return value;
}

function encodeCursor(occurredAt: string, eventId: string): string {
  return Buffer.from(JSON.stringify({ occurredAt, eventId })).toString("base64url");
}

function decodeCursor(cursor: string): { occurredAt: string; eventId: string } {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      occurredAt?: unknown;
      eventId?: unknown;
    };
    if (
      typeof value.occurredAt !== "string" ||
      Number.isNaN(Date.parse(value.occurredAt)) ||
      typeof value.eventId !== "string" ||
      !value.eventId
    ) {
      throw new Error();
    }
    return { occurredAt: value.occurredAt, eventId: value.eventId };
  } catch {
    throw new Error("Invalid audit cursor");
  }
}
