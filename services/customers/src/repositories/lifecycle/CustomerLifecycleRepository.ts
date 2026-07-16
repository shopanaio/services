import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerDataRequestGlobalId,
  decodeCustomerGlobalId,
  decodeCustomerMergeGlobalId,
} from "../global-id-where-mappers.js";
import {
  customerDataRequest,
  customerMerge,
  type CustomerDataRequest,
  type CustomerMerge,
  type NewCustomerDataRequest,
  type NewCustomerMerge,
} from "../models/index.js";

export const customerMergeRelayQuery = createRelayQuery(
  createQuery(customerMerge)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerMergeGlobalId,
      sourceCustomerId: decodeCustomerGlobalId,
      targetCustomerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerMerge", tieBreaker: "id" }
);

export const customerDataRequestRelayQuery = createRelayQuery(
  createQuery(customerDataRequest)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerDataRequestGlobalId,
      customerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerDataRequest", tieBreaker: "id" }
);

export type CustomerMergeRelayInput = InferRelayInput<
  typeof customerMergeRelayQuery
>;
export type CustomerDataRequestRelayInput = InferRelayInput<
  typeof customerDataRequestRelayQuery
>;

export type CustomerMergeCreateData = Omit<
  NewCustomerMerge,
  | "id"
  | "storeId"
  | "status"
  | "resolution"
  | "errorCode"
  | "errorMessage"
  | "requestedAt"
  | "startedAt"
  | "finishedAt"
  | "updatedAt"
>;
export type CustomerDataRequestCreateData = Omit<
  NewCustomerDataRequest,
  | "id"
  | "storeId"
  | "status"
  | "resultFileId"
  | "rejectionReason"
  | "requestedAt"
  | "startedAt"
  | "finishedAt"
  | "updatedAt"
>;

export class CustomerLifecycleRepository extends BaseRepository {
  @ReadOnly()
  async findMergeById(id: string): Promise<CustomerMerge | null> {
    const rows = await this.connection
      .select()
      .from(customerMerge)
      .where(
        and(
          eq(customerMerge.storeId, this.storeId),
          eq(customerMerge.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getMergesByIds(ids: readonly string[]): Promise<CustomerMerge[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerMerge)
      .where(
        and(
          eq(customerMerge.storeId, this.storeId),
          inArray(customerMerge.id, [...new Set(ids)])
        )
      );
  }

  @ReadOnly()
  async findDataRequestById(id: string): Promise<CustomerDataRequest | null> {
    const rows = await this.connection
      .select()
      .from(customerDataRequest)
      .where(
        and(
          eq(customerDataRequest.storeId, this.storeId),
          eq(customerDataRequest.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getDataRequestsByIds(ids: readonly string[]): Promise<CustomerDataRequest[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerDataRequest)
      .where(
        and(
          eq(customerDataRequest.storeId, this.storeId),
          inArray(customerDataRequest.id, [...new Set(ids)])
        )
      );
  }

  async createMerge(data: CustomerMergeCreateData): Promise<CustomerMerge> {
    const existing = await this.findMergeByIdempotencyKey(data.idempotencyKey);
    if (existing) return existing;
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerMerge)
      .values({
        ...data,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        status: "REQUESTED",
        resolution: {},
        errorCode: null,
        errorMessage: null,
        requestedAt: now,
        startedAt: null,
        finishedAt: null,
        updatedAt: now,
      })
      .returning();
    return rows[0];
  }

  async updateMergeStatus(
    id: string,
    input: {
      status: CustomerMerge["status"];
      resolution?: Record<string, unknown>;
      errorCode?: string | null;
      errorMessage?: string | null;
    }
  ): Promise<CustomerMerge | null> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerMerge)
      .set({
        status: input.status,
        ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
        ...(input.errorCode !== undefined ? { errorCode: input.errorCode } : {}),
        ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage } : {}),
        ...(input.status === "IN_PROGRESS" ? { startedAt: now, finishedAt: null } : {}),
        ...(input.status === "COMPLETED" || input.status === "FAILED"
          ? { finishedAt: now }
          : {}),
        updatedAt: now,
      })
      .where(and(eq(customerMerge.storeId, this.storeId), eq(customerMerge.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async deleteMerge(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(customerMerge)
      .where(
        and(
          eq(customerMerge.storeId, this.storeId),
          eq(customerMerge.id, id),
          eq(customerMerge.status, "REQUESTED")
        )
      )
      .returning({ id: customerMerge.id });
    return rows.length > 0;
  }

  async createDataRequest(
    data: CustomerDataRequestCreateData
  ): Promise<CustomerDataRequest> {
    const existing = await this.findDataRequestByIdempotencyKey(data.idempotencyKey);
    if (existing) return existing;
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerDataRequest)
      .values({
        ...data,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        status: "PENDING",
        resultFileId: null,
        rejectionReason: null,
        requestedAt: now,
        startedAt: null,
        finishedAt: null,
        updatedAt: now,
      })
      .returning();
    return rows[0];
  }

  async updateDataRequestStatus(
    id: string,
    input: {
      status: CustomerDataRequest["status"];
      resultFileId?: string | null;
      rejectionReason?: string | null;
    }
  ): Promise<CustomerDataRequest | null> {
    const now = new Date().toISOString();
    const isTerminal = ["COMPLETED", "REJECTED", "CANCELLED"].includes(input.status);
    const rows = await this.connection
      .update(customerDataRequest)
      .set({
        status: input.status,
        ...(input.resultFileId !== undefined ? { resultFileId: input.resultFileId } : {}),
        ...(input.rejectionReason !== undefined
          ? { rejectionReason: input.rejectionReason }
          : {}),
        ...(input.status === "PROCESSING" ? { startedAt: now, finishedAt: null } : {}),
        ...(isTerminal ? { finishedAt: now } : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(customerDataRequest.storeId, this.storeId),
          eq(customerDataRequest.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async cancelDataRequest(id: string, reason?: string | null): Promise<CustomerDataRequest | null> {
    return this.updateDataRequestStatus(id, {
      status: "CANCELLED",
      rejectionReason: reason ?? null,
    });
  }

  async deleteDataRequest(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(customerDataRequest)
      .where(
        and(
          eq(customerDataRequest.storeId, this.storeId),
          eq(customerDataRequest.id, id),
          eq(customerDataRequest.status, "PENDING")
        )
      )
      .returning({ id: customerDataRequest.id });
    return rows.length > 0;
  }

  @ReadOnly()
  async getMergeConnection(
    input: CustomerMergeRelayInput
  ): Promise<RepositoryConnectionResult> {
    return this.executeConnection(
      input,
      customerMergeRelayQuery,
      [{ field: "requestedAt", direction: "desc" }]
    );
  }

  @ReadOnly()
  async getDataRequestConnection(
    input: CustomerDataRequestRelayInput
  ): Promise<RepositoryConnectionResult> {
    return this.executeConnection(
      input,
      customerDataRequestRelayQuery,
      [{ field: "requestedAt", direction: "desc" }]
    );
  }

  private async executeConnection(
    input: CustomerMergeRelayInput | CustomerDataRequestRelayInput,
    queryBuilder: typeof customerMergeRelayQuery | typeof customerDataRequestRelayQuery,
    defaultOrder: Array<{ field: "requestedAt"; direction: "desc" }>
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { where, orderBy, ...pagination } = normalized;
    const mergedWhere = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? defaultOrder;
    const executeInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: { storeId: this.storeId, where: where ?? null, orderBy: effectiveOrder },
    };
    const [result, totalCount] = await Promise.all([
      queryBuilder.execute(this.connection, executeInput as never),
      queryBuilder.count(this.connection, { where: mergedWhere } as never),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async findMergeByIdempotencyKey(key: string): Promise<CustomerMerge | null> {
    const rows = await this.connection
      .select()
      .from(customerMerge)
      .where(
        and(
          eq(customerMerge.storeId, this.storeId),
          eq(customerMerge.idempotencyKey, key)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private async findDataRequestByIdempotencyKey(
    key: string
  ): Promise<CustomerDataRequest | null> {
    const rows = await this.connection
      .select()
      .from(customerDataRequest)
      .where(
        and(
          eq(customerDataRequest.storeId, this.storeId),
          eq(customerDataRequest.idempotencyKey, key)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}
