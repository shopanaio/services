import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerTaxExemptionGlobalId,
} from "../global-id-where-mappers.js";
import {
  customerTaxExemption,
  type CustomerTaxExemption,
  type NewCustomerTaxExemption,
} from "../models/index.js";

export const customerTaxExemptionRelayQuery = createRelayQuery(
  createQuery(customerTaxExemption)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerTaxExemptionGlobalId,
      customerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerTaxExemption", tieBreaker: "id" }
);

export type CustomerTaxExemptionRelayInput = InferRelayInput<
  typeof customerTaxExemptionRelayQuery
>;
export type CustomerTaxExemptionConnectionInput =
  CustomerTaxExemptionRelayInput & { customerId: string };
export type CustomerTaxExemptionCreateData = Omit<
  NewCustomerTaxExemption,
  "id" | "storeId" | "createdAt" | "updatedAt" | "deletedAt"
>;
export type CustomerTaxExemptionPatch = Partial<
  Pick<
    NewCustomerTaxExemption,
    | "code"
    | "countryCode"
    | "regionCode"
    | "reason"
    | "status"
    | "certificateFileId"
    | "validFrom"
    | "validTo"
  >
>;

export class CustomerTaxExemptionRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerTaxExemption | null> {
    const rows = await this.connection
      .select()
      .from(customerTaxExemption)
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          eq(customerTaxExemption.id, id),
          isNull(customerTaxExemption.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerTaxExemption[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerTaxExemption)
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          inArray(customerTaxExemption.id, [...new Set(ids)]),
          isNull(customerTaxExemption.deletedAt)
        )
      );
  }

  @ReadOnly()
  async getByCustomerIds(customerIds: readonly string[]): Promise<CustomerTaxExemption[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerTaxExemption)
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          inArray(customerTaxExemption.customerId, [...new Set(customerIds)]),
          isNull(customerTaxExemption.deletedAt)
        )
      );
  }

  async create(data: CustomerTaxExemptionCreateData): Promise<CustomerTaxExemption> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerTaxExemption)
      .values({
        ...data,
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        code: data.code.trim(),
        countryCode: data.countryCode?.toUpperCase() ?? null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();
    return rows[0];
  }

  async update(
    id: string,
    patch: CustomerTaxExemptionPatch
  ): Promise<CustomerTaxExemption | null> {
    const rows = await this.connection
      .update(customerTaxExemption)
      .set({
        ...patch,
        ...(patch.code !== undefined ? { code: patch.code.trim() } : {}),
        ...(patch.countryCode !== undefined
          ? { countryCode: patch.countryCode?.toUpperCase() ?? null }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          eq(customerTaxExemption.id, id),
          isNull(customerTaxExemption.deletedAt)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerTaxExemption)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          eq(customerTaxExemption.id, id),
          isNull(customerTaxExemption.deletedAt)
        )
      )
      .returning({ id: customerTaxExemption.id });
    return rows.length > 0;
  }

  async redactForCustomer(
    customerId: string,
    redactedAt: string,
  ): Promise<Array<{ id: string; certificateFileId: string | null }>> {
    const exemptions = await this.connection
      .select({
        id: customerTaxExemption.id,
        certificateFileId: customerTaxExemption.certificateFileId,
      })
      .from(customerTaxExemption)
      .where(
        and(
          eq(customerTaxExemption.storeId, this.storeId),
          eq(customerTaxExemption.customerId, customerId),
        ),
      );
    for (const exemption of exemptions) {
      await this.connection
        .update(customerTaxExemption)
        .set({
          code: `redacted:${exemption.id}`,
          countryCode: null,
          regionCode: null,
          reason: null,
          status: "REVOKED",
          certificateFileId: null,
          validFrom: null,
          validTo: null,
          updatedAt: redactedAt,
          deletedAt: redactedAt,
        })
        .where(
          and(
            eq(customerTaxExemption.storeId, this.storeId),
            eq(customerTaxExemption.id, exemption.id),
          ),
        );
    }
    return exemptions;
  }

  @ReadOnly()
  async getConnection(
    input: CustomerTaxExemptionConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerTaxExemptionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { customerId: { _eq: customerId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [
      { field: "createdAt", direction: "desc" },
    ];
    const query: CustomerTaxExemptionRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        customerId,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerTaxExemptionRelayQuery.execute(this.connection, query),
      customerTaxExemptionRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
}
