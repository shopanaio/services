import { ApolloQuery, TypePolicy } from "@shopana/type-resolver";
import type { AuditEntryWhere } from "../../repositories/AuditEntryRepository.js";
import type { AuditEntryRecord, AuditOperationRecord } from "../../repositories/models/index.js";
import { AuditType } from "./AuditType.js";

interface EntryArgs {
  id: string;
}
interface ConnectionArgs {
  first?: number;
  after?: string;
  where?: AuditEntryWhere;
}
interface TimelineArgs {
  targetId: string;
  first?: number;
  after?: string;
}

@ApolloQuery
export class QueryResolver extends AuditType<Record<string, never>> {
  auditQuery() {
    return new AuditQueryResolver({}, this.$ctx);
  }
}

@TypePolicy<AuditQueryResolver>({
  resource: "store.audit",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AuditQueryResolver extends AuditType<Record<string, never>> {
  async entry(args: EntryArgs) {
    const entry = await this.$ctx.kernel.repository.entries.findByEventId(
      args.id,
      this.$ctx.store.organizationId,
      this.$ctx.store.id,
    );
    return entry ? this.resolveEntry(entry) : null;
  }

  async entries(args: ConnectionArgs) {
    return this.connection(args);
  }

  async timeline(args: TimelineArgs) {
    return this.connection({ first: args.first, after: args.after, targetId: args.targetId });
  }

  private async connection(args: ConnectionArgs & { targetId?: string }) {
    const result = await this.$ctx.kernel.repository.entries.getConnection({
      ...args,
      organizationId: this.$ctx.store.organizationId,
      storeId: this.$ctx.store.id,
    });
    const operations = await this.$ctx.kernel.repository.entries.findOperationsByEventIds(
      result.edges.map((edge) => edge.node.eventId),
    );
    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        node: this.resolveEntry(edge.node, operations.get(edge.node.eventId) ?? []),
      })),
      pageInfo: result.pageInfo,
      totalCount: result.totalCount,
    };
  }

  private async resolveEntry(
    entry: AuditEntryRecord,
    operations?: readonly AuditOperationRecord[],
  ) {
    const entryOperations =
      operations ?? (await this.$ctx.kernel.repository.entries.findOperations(entry.eventId));
    return {
      id: entry.eventId,
      eventId: entry.eventId,
      sequence: entry.eventSequence,
      eventType: entry.eventType,
      occurredAt: entry.occurredAt,
      recordedAt: entry.recordedAt,
      action: entry.action,
      command: entry.command,
      aggregate: { type: entry.aggregateType, id: entry.aggregateId },
      actor: { type: entry.actorType, id: entry.actorId },
      operations: entryOperations.map((operation) => ({
        position: operation.position,
        type: operation.operationType,
        action: operation.action,
        target:
          operation.targetType && operation.targetId
            ? { type: operation.targetType, id: operation.targetId }
            : null,
        changes: operation.changes,
      })),
      source: {
        service: entry.sourceService,
        workflowId: entry.parentWorkflowId,
        correlationId: entry.correlationId,
      },
    };
  }
}
