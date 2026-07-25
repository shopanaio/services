import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
} from "drizzle-orm";
import type {
  AppInstallationStatus,
  AppLifecycleOperationType,
} from "@shopana/app-sdk";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { AppLifecycleOperationRecord } from "../../control-plane/types.js";
import type { Database } from "../../infrastructure/db/database.js";
import { BaseRepository } from "../BaseRepository.js";
import {
  appInstallations,
  appLifecycleOperations,
  type AppLifecycleOperationModel,
} from "../models/index.js";

export const appLifecycleOperationRelayQuery = createRelayQuery(
  createQuery(appLifecycleOperations)
    .include(["id"])
    .maxLimit(100)
    .defaultLimit(20),
  { name: "appLifecycleOperation", tieBreaker: "id" },
);

export type AppLifecycleOperationRelayInput = InferRelayInput<
  typeof appLifecycleOperationRelayQuery
>;

export interface AppLifecycleOperationConnectionInput {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
}

export interface AppLifecycleOperationConnectionResult {
  readonly edges: Array<{ cursor: string; nodeId: string }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export interface CreateLifecycleOperationInput {
  readonly installationId: string;
  readonly type: AppLifecycleOperationType;
  readonly targetVersion: string;
  readonly previousInstallationStatus: AppInstallationStatus;
  readonly idempotencyKey: string;
  readonly workflowId: string;
  readonly actorType: "USER" | "SERVICE" | "SYSTEM";
  readonly actorId?: string;
  readonly correlationId?: string;
}

export class AppLifecycleOperationRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
  ) {
    super(db, txManager);
  }

  async findById(
    id: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appLifecycleOperations)
      .where(eq(appLifecycleOperations.id, id))
      .limit(1);
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async findByIdForStore(
    id: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const rows = await this.connection
      .select(getTableColumns(appLifecycleOperations))
      .from(appLifecycleOperations)
      .innerJoin(
        appInstallations,
        eq(
          appInstallations.id,
          appLifecycleOperations.installationId,
        ),
      )
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appLifecycleOperations.id, id),
        ),
      )
      .limit(1);
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async getByIdsForStore(
    ids: readonly string[],
  ): Promise<AppLifecycleOperationRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.connection
      .select(getTableColumns(appLifecycleOperations))
      .from(appLifecycleOperations)
      .innerJoin(
        appInstallations,
        eq(
          appInstallations.id,
          appLifecycleOperations.installationId,
        ),
      )
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          inArray(appLifecycleOperations.id, [...new Set(ids)]),
        ),
      );
    return rows.map(mapOperation);
  }

  async lockById(
    id: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appLifecycleOperations)
      .where(eq(appLifecycleOperations.id, id))
      .limit(1)
      .for("update");
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async findByIdempotency(
    installationId: string,
    idempotencyKey: string,
  ): Promise<AppLifecycleOperationRecord | null> {
    const rows = await this.connection
      .select()
      .from(appLifecycleOperations)
      .where(
        and(
          eq(appLifecycleOperations.installationId, installationId),
          eq(appLifecycleOperations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return rows[0] ? mapOperation(rows[0]) : null;
  }

  async findLatestFailedUpdatePreviousStatus(
    installationId: string,
  ): Promise<"ACTIVE" | "SUSPENDED" | null> {
    const rows = await this.connection
      .select({
        status: appLifecycleOperations.previousInstallationStatus,
      })
      .from(appLifecycleOperations)
      .where(
        and(
          eq(appLifecycleOperations.installationId, installationId),
          eq(appLifecycleOperations.type, "UPDATE"),
          eq(appLifecycleOperations.status, "FAILED"),
          inArray(
            appLifecycleOperations.previousInstallationStatus,
            ["ACTIVE", "SUSPENDED"],
          ),
        ),
      )
      .orderBy(desc(appLifecycleOperations.createdAt))
      .limit(1);
    const status = rows[0]?.status;
    return status === "ACTIVE" || status === "SUSPENDED"
      ? status
      : null;
  }

  async listByInstallation(
    installationId: string,
  ): Promise<AppLifecycleOperationRecord[]> {
    const rows = await this.connection
      .select()
      .from(appLifecycleOperations)
      .where(
        eq(appLifecycleOperations.installationId, installationId),
      )
      .orderBy(desc(appLifecycleOperations.createdAt));
    return rows.map(mapOperation);
  }

  async getConnection(
    installationId: string,
    input: AppLifecycleOperationConnectionInput,
  ): Promise<AppLifecycleOperationConnectionResult> {
    if (!(await this.installationBelongsToCurrentStore(installationId))) {
      return emptyConnection();
    }

    const where: AppLifecycleOperationRelayInput["where"] = {
      installationId: { _eq: installationId },
    };
    const relayInput: AppLifecycleOperationRelayInput = {
      first:
        input.first == null && input.last == null
          ? 20
          : input.first,
      after: input.after,
      last: input.last,
      before: input.before,
      where,
      orderBy: [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      appLifecycleOperationRelayQuery.execute(
        this.connection,
        relayInput,
      ),
      appLifecycleOperationRelayQuery.count(this.connection, {
        where,
      }),
    ]);

    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async create(
    input: CreateLifecycleOperationInput,
  ): Promise<AppLifecycleOperationRecord> {
    const rows = await this.connection
      .insert(appLifecycleOperations)
      .values({
        installationId: input.installationId,
        type: input.type,
        status: "PENDING",
        targetVersion: input.targetVersion,
        previousInstallationStatus:
          input.previousInstallationStatus,
        idempotencyKey: input.idempotencyKey,
        workflowId: input.workflowId,
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        correlationId: input.correlationId ?? null,
      })
      .returning();
    return mapOperation(requiredRow(rows[0]));
  }

  async markRunning(id: string): Promise<boolean> {
    const rows = await this.connection
      .update(appLifecycleOperations)
      .set({
        status: "RUNNING",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(appLifecycleOperations.id, id),
          eq(appLifecycleOperations.status, "PENDING"),
        ),
      )
      .returning({ id: appLifecycleOperations.id });
    return rows.length === 1;
  }

  async markSucceeded(id: string): Promise<void> {
    await this.connection
      .update(appLifecycleOperations)
      .set({
        status: "SUCCEEDED",
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appLifecycleOperations.id, id));
  }

  async markFailed(
    id: string,
    error: { readonly code: string; readonly message: string },
  ): Promise<void> {
    await this.connection
      .update(appLifecycleOperations)
      .set({
        status: "FAILED",
        errorCode: error.code,
        errorMessage: error.message,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appLifecycleOperations.id, id));
  }

  private async installationBelongsToCurrentStore(
    installationId: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .select({ id: appInstallations.id })
      .from(appInstallations)
      .where(
        and(
          eq(appInstallations.storeId, this.storeId),
          eq(appInstallations.id, installationId),
        ),
      )
      .limit(1);
    return rows.length === 1;
  }
}

function emptyConnection(): AppLifecycleOperationConnectionResult {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    totalCount: 0,
  };
}

function mapOperation(
  row: AppLifecycleOperationModel,
): AppLifecycleOperationRecord {
  if (
    row.actorType !== "USER" &&
    row.actorType !== "SERVICE" &&
    row.actorType !== "SYSTEM"
  ) {
    throw new Error(
      `Unsupported App lifecycle actor type "${row.actorType}"`,
    );
  }
  return { ...row, actorType: row.actorType };
}

function requiredRow(
  row: AppLifecycleOperationModel | undefined,
): AppLifecycleOperationModel {
  if (!row) {
    throw new Error(
      "App lifecycle operation was not returned by PostgreSQL",
    );
  }
  return row;
}
