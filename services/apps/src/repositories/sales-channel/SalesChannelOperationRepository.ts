import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
} from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type {
  AppLifecycleOperationStatus,
  SalesChannelConnectionStatus,
  SalesChannelOperationRecord,
  SalesChannelOperationType,
} from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appSalesChannelConnections,
  appSalesChannelOperations,
  type SalesChannelOperationModel,
} from "../models/index.js";

export class SalesChannelOperationRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async create(input: {
    readonly connectionId: string;
    readonly type: SalesChannelOperationType;
    readonly targetSpecificationId?: string;
    readonly idempotencyKey: string;
    readonly workflowId: string;
    readonly actorType: "USER" | "APP" | "SERVICE" | "SYSTEM";
    readonly actorId?: string;
    readonly correlationId?: string;
    readonly previousConnectionStatus: SalesChannelConnectionStatus;
  }): Promise<SalesChannelOperationRecord> {
    const rows = await this.connection
      .insert(appSalesChannelOperations)
      .values({
        ...input,
        targetSpecificationId: input.targetSpecificationId ?? null,
        actorId: input.actorId ?? null,
        correlationId: input.correlationId ?? null,
      })
      .returning();
    if (!rows[0]) throw new Error("Sales channel operation was not returned");
    return mapOperation(rows[0]);
  }

  async findById(id: string): Promise<SalesChannelOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelOperations)
      .where(eq(appSalesChannelOperations.id, id))
      .limit(1);
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async findByIdForStore(
    id: string,
  ): Promise<SalesChannelOperationRecord | null> {
    const rows = await this.connection
      .select(getTableColumns(appSalesChannelOperations))
      .from(appSalesChannelOperations)
      .innerJoin(
        appSalesChannelConnections,
        eq(
          appSalesChannelConnections.id,
          appSalesChannelOperations.connectionId,
        ),
      )
      .where(
        and(
          eq(appSalesChannelConnections.storeId, this.storeId),
          eq(appSalesChannelOperations.id, id),
        ),
      )
      .limit(1);
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async getByIdsForStore(
    ids: readonly string[],
  ): Promise<SalesChannelOperationRecord[]> {
    if (ids.length === 0) return [];
    const rows = await this.connection
      .select(getTableColumns(appSalesChannelOperations))
      .from(appSalesChannelOperations)
      .innerJoin(
        appSalesChannelConnections,
        eq(
          appSalesChannelConnections.id,
          appSalesChannelOperations.connectionId,
        ),
      )
      .where(
        and(
          eq(appSalesChannelConnections.storeId, this.storeId),
          inArray(
            appSalesChannelOperations.id,
            [...new Set(ids)],
          ),
        ),
      );
    return rows.map(mapOperation);
  }

  async findByIdempotency(
    connectionId: string,
    idempotencyKey: string,
  ): Promise<SalesChannelOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelOperations)
      .where(
        and(
          eq(appSalesChannelOperations.connectionId, connectionId),
          eq(appSalesChannelOperations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async findByInstallationIdempotency(
    installationId: string,
    idempotencyKey: string,
  ): Promise<SalesChannelOperationRecord | null> {
    const rows = await this.connection
      .select({ operation: appSalesChannelOperations })
      .from(appSalesChannelOperations)
      .innerJoin(
        appSalesChannelConnections,
        eq(
          appSalesChannelConnections.id,
          appSalesChannelOperations.connectionId,
        ),
      )
      .where(
        and(
          eq(appSalesChannelConnections.installationId, installationId),
          eq(appSalesChannelOperations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapOperation(rows[0].operation) : null;
  }

  async listByConnection(
    connectionId: string,
  ): Promise<SalesChannelOperationRecord[]> {
    const rows = await this.connection
      .select()
      .from(appSalesChannelOperations)
      .where(eq(appSalesChannelOperations.connectionId, connectionId))
      .orderBy(desc(appSalesChannelOperations.createdAt));
    return rows.map(mapOperation);
  }

  async updateStatus(
    id: string,
    status: AppLifecycleOperationStatus,
    error?: { readonly code: string; readonly message: string },
  ): Promise<SalesChannelOperationRecord | null> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(appSalesChannelOperations)
      .set({
        status,
        startedAt: status === "RUNNING" ? now : undefined,
        completedAt:
          status === "SUCCEEDED" || status === "FAILED" ? now : undefined,
        errorCode: error?.code ?? (status === "FAILED" ? "UNKNOWN" : null),
        errorMessage: error?.message ?? null,
        updatedAt: now,
      })
      .where(eq(appSalesChannelOperations.id, id))
      .returning();
    return rows[0] ? mapOperation(rows[0]) : null;
  }
}

function mapOperation(
  row: SalesChannelOperationModel,
): SalesChannelOperationRecord {
  return row as SalesChannelOperationRecord;
}
