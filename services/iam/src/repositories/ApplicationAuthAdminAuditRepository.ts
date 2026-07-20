import type { TransactionManager } from "@shopana/shared-kernel";
import { Transactional } from "@shopana/shared-kernel";
import { eq } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import type { ApplicationAuthAdminAuditRecord as AuditRecord } from "../services/ApplicationAuthAdminAuditPort.js";
import { BaseRepository } from "./BaseRepository.js";
import { applicationAuthAdminAudit } from "./models/index.js";

/** Transaction-aware append-only storage for durable admin audit records. */
export class ApplicationAuthAdminAuditRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @Transactional()
  async append(record: AuditRecord): Promise<void> {
    const rows = await this.connection
      .insert(applicationAuthAdminAudit)
      .values({
        recordId: record.recordId,
        schemaVersion: record.schemaVersion,
        occurredAt: new Date(record.occurredAt),
        category: record.category,
        action: record.action,
        outcome: record.outcome,
        reasonCategory: record.reasonCategory,
        actorType: record.actorType,
        actorId: record.actorId,
        organizationId: record.organizationId,
        applicationId: record.applicationId,
        targetType: record.targetType,
        targetId: record.targetId ?? null,
        requestId: record.requestId,
        safeDiffJson: { ...record.safeDiff },
      })
      .onConflictDoNothing({ target: applicationAuthAdminAudit.recordId })
      .returning({ recordId: applicationAuthAdminAudit.recordId });
    if (rows.length === 1) return;

    // Idempotent replay is acknowledged only when the record already exists.
    const [existing] = await this.connection
      .select({ recordId: applicationAuthAdminAudit.recordId })
      .from(applicationAuthAdminAudit)
      .where(eq(applicationAuthAdminAudit.recordId, record.recordId))
      .limit(1);
    if (!existing) {
      throw new Error("Application auth admin audit record was not persisted");
    }
  }
}
