import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerTaxIdentifierGlobalId,
} from "../global-id-where-mappers.js";
import {
  customerTaxIdentifier,
  type CustomerTaxIdentifier,
  type NewCustomerTaxIdentifier,
} from "../models/index.js";

export const customerTaxIdentifierRelayQuery = createRelayQuery(
  createQuery(customerTaxIdentifier)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerTaxIdentifierGlobalId,
      customerId: decodeCustomerGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerTaxIdentifier", tieBreaker: "id" }
);

export type CustomerTaxIdentifierRelayInput = InferRelayInput<
  typeof customerTaxIdentifierRelayQuery
>;
export type CustomerTaxIdentifierConnectionInput =
  CustomerTaxIdentifierRelayInput & { customerId: string };

export interface CustomerTaxIdentifierCreateData {
  customerId: string;
  identifierType: string;
  countryCode?: string | null;
  value: string;
  normalizedValue?: string;
  status?: CustomerTaxIdentifier["status"];
  isPrimary?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
}

export type CustomerTaxIdentifierPatch = Partial<
  Pick<
    NewCustomerTaxIdentifier,
    | "identifierType"
    | "countryCode"
    | "value"
    | "normalizedValue"
    | "status"
    | "isPrimary"
    | "validFrom"
    | "validTo"
    | "verifiedAt"
  >
>;

export class CustomerTaxIdentifierRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerTaxIdentifier | null> {
    const rows = await this.connection
      .select()
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.id, id),
          isNull(customerTaxIdentifier.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findOwnedById(
    customerId: string,
    id: string
  ): Promise<CustomerTaxIdentifier | null> {
    const rows = await this.connection
      .select()
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.customerId, customerId),
          eq(customerTaxIdentifier.id, id),
          isNull(customerTaxIdentifier.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findDuplicate(input: {
    customerId: string;
    identifierType: string;
    countryCode?: string | null;
    value: string;
    exceptId?: string;
  }): Promise<CustomerTaxIdentifier | null> {
    const rows = await this.connection
      .select()
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.customerId, input.customerId),
          eq(customerTaxIdentifier.identifierType, input.identifierType.trim()),
          input.countryCode == null
            ? isNull(customerTaxIdentifier.countryCode)
            : eq(
                customerTaxIdentifier.countryCode,
                input.countryCode.trim().toUpperCase()
              ),
          eq(
            customerTaxIdentifier.normalizedValue,
            normalizeTaxIdentifier(input.value)
          ),
          input.exceptId
            ? ne(customerTaxIdentifier.id, input.exceptId)
            : undefined,
          isNull(customerTaxIdentifier.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerTaxIdentifier[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          inArray(customerTaxIdentifier.id, [...new Set(ids)]),
          isNull(customerTaxIdentifier.deletedAt)
        )
      );
  }

  @ReadOnly()
  async getByCustomerIds(customerIds: readonly string[]): Promise<CustomerTaxIdentifier[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          inArray(customerTaxIdentifier.customerId, [...new Set(customerIds)]),
          isNull(customerTaxIdentifier.deletedAt)
        )
      );
  }

  @Transactional()
  async create(data: CustomerTaxIdentifierCreateData): Promise<CustomerTaxIdentifier> {
    if (data.isPrimary) await this.clearPrimary(data.customerId);
    const now = new Date().toISOString();
    const row: NewCustomerTaxIdentifier = {
      ...data,
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      identifierType: data.identifierType.trim(),
      countryCode: data.countryCode?.trim().toUpperCase() ?? null,
      value: data.value.trim(),
      normalizedValue:
        data.normalizedValue ?? normalizeTaxIdentifier(data.value),
      status: data.status ?? "UNVERIFIED",
      isPrimary: data.isPrimary ?? false,
      verifiedAt: data.status === "VERIFIED" ? now : null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = await this.connection
      .insert(customerTaxIdentifier)
      .values(row)
      .returning();
    return rows[0];
  }

  @Transactional()
  async update(
    id: string,
    patch: CustomerTaxIdentifierPatch
  ): Promise<CustomerTaxIdentifier | null> {
    const current = await this.findById(id);
    if (!current) return null;
    return this.updateOwned(current.customerId, id, patch);
  }

  @Transactional()
  async updateOwned(
    customerId: string,
    id: string,
    patch: CustomerTaxIdentifierPatch
  ): Promise<CustomerTaxIdentifier | null> {
    const current = await this.findOwnedById(customerId, id);
    if (!current) return null;
    if (patch.isPrimary === true) await this.clearPrimary(current.customerId, id);
    const value = patch.value === undefined ? undefined : patch.value.trim();
    const rows = await this.connection
      .update(customerTaxIdentifier)
      .set({
        ...patch,
        ...(patch.identifierType !== undefined
          ? { identifierType: patch.identifierType.trim() }
          : {}),
        ...(patch.countryCode !== undefined
          ? { countryCode: patch.countryCode?.trim().toUpperCase() ?? null }
          : {}),
        ...(value !== undefined
          ? {
              value,
              normalizedValue:
                patch.normalizedValue ?? normalizeTaxIdentifier(value),
            }
          : {}),
        ...(patch.status === "VERIFIED" && current.status !== "VERIFIED"
          ? { verifiedAt: new Date().toISOString() }
          : patch.status !== undefined && patch.status !== "VERIFIED"
            ? { verifiedAt: null }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.customerId, customerId),
          eq(customerTaxIdentifier.id, id),
          isNull(customerTaxIdentifier.deletedAt)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const current = await this.findById(id);
    return current
      ? this.softDeleteOwned(current.customerId, id)
      : false;
  }

  async softDeleteOwned(customerId: string, id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerTaxIdentifier)
      .set({ isPrimary: false, deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.customerId, customerId),
          eq(customerTaxIdentifier.id, id),
          isNull(customerTaxIdentifier.deletedAt)
        )
      )
      .returning({ id: customerTaxIdentifier.id });
    return rows.length > 0;
  }

  async redactForCustomer(
    customerId: string,
    redactedAt: string,
  ): Promise<number> {
    const identifiers = await this.connection
      .select({ id: customerTaxIdentifier.id })
      .from(customerTaxIdentifier)
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.customerId, customerId),
        ),
      );
    for (const identifier of identifiers) {
      const value = `redacted:${identifier.id}`;
      await this.connection
        .update(customerTaxIdentifier)
        .set({
          identifierType: "redacted",
          countryCode: null,
          value,
          normalizedValue: value,
          status: "REJECTED",
          isPrimary: false,
          verifiedAt: null,
          validFrom: null,
          validTo: null,
          updatedAt: redactedAt,
          deletedAt: redactedAt,
        })
        .where(
          and(
            eq(customerTaxIdentifier.storeId, this.storeId),
            eq(customerTaxIdentifier.id, identifier.id),
          ),
        );
    }
    return identifiers.length;
  }

  @ReadOnly()
  async getConnection(
    input: CustomerTaxIdentifierConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerTaxIdentifierRelayInput["where"] = {
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
    const query: CustomerTaxIdentifierRelayInput = {
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
      customerTaxIdentifierRelayQuery.execute(this.connection, query),
      customerTaxIdentifierRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async clearPrimary(customerId: string, exceptId?: string): Promise<void> {
    await this.connection
      .update(customerTaxIdentifier)
      .set({ isPrimary: false, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(customerTaxIdentifier.storeId, this.storeId),
          eq(customerTaxIdentifier.customerId, customerId),
          eq(customerTaxIdentifier.isPrimary, true),
          isNull(customerTaxIdentifier.deletedAt),
          exceptId ? sql`${customerTaxIdentifier.id} <> ${exceptId}` : undefined
        )
      );
  }
}

export function normalizeTaxIdentifier(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/[\s._\-/]+/gu, "")
    .toUpperCase();
}
