import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { normalizeRelayPagination, type RepositoryConnectionResult } from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerTagAssignmentGlobalId,
  decodeCustomerTagGlobalId,
} from "../global-id-where-mappers.js";
import {
  customer,
  customerTag,
  customerTagAssignment,
  type CustomerTag,
  type CustomerTagAssignment,
} from "../models/index.js";
import { fullUnicodeNfkc } from "@shopana/customer-segment-dsl";
import { normalizeUnicodeSearchValue } from "../../segments/normalization.js";

export const customerTagRelayQuery = createRelayQuery(
  createQuery(customerTag)
    .include(["id"])
    .mapWhereField("id", decodeCustomerTagGlobalId)
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerTag", tieBreaker: "id" },
);

export const customerTagAssignmentRelayQuery = createRelayQuery(
  createQuery(customerTagAssignment)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerTagAssignmentGlobalId,
      customerId: decodeCustomerGlobalId,
      tagId: decodeCustomerTagGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerTagAssignment", tieBreaker: "id" },
);

export type CustomerTagRelayInput = InferRelayInput<typeof customerTagRelayQuery>;
export type CustomerTagAssignmentRelayInput = InferRelayInput<
  typeof customerTagAssignmentRelayQuery
>;
export type CustomerTagAssignmentConnectionInput = CustomerTagAssignmentRelayInput & {
  customerId?: string;
  tagId?: string;
};

export class CustomerTagRepository extends BaseRepository {
  @ReadOnly()
  async customerIdsByTagId(tagId: string): Promise<string[]> {
    const rows = await this.connection
      .select({ customerId: customerTagAssignment.customerId })
      .from(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          eq(customerTagAssignment.tagId, tagId),
        ),
      );
    return [...new Set(rows.map((row) => row.customerId))].sort();
  }

  @ReadOnly()
  async findById(id: string): Promise<CustomerTag | null> {
    const rows = await this.connection
      .select()
      .from(customerTag)
      .where(
        and(
          eq(customerTag.storeId, this.storeId),
          eq(customerTag.id, id),
          isNull(customerTag.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByName(name: string): Promise<CustomerTag | null> {
    const rows = await this.connection
      .select()
      .from(customerTag)
      .where(
        and(
          eq(customerTag.storeId, this.storeId),
          eq(customerTag.normalizedName, normalizeTagName(name)),
          isNull(customerTag.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerTag[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerTag)
      .where(
        and(
          eq(customerTag.storeId, this.storeId),
          inArray(customerTag.id, [...new Set(ids)]),
          isNull(customerTag.deletedAt),
        ),
      );
  }

  @ReadOnly()
  async findAssignmentById(id: string): Promise<CustomerTagAssignment | null> {
    const rows = await this.connection
      .select()
      .from(customerTagAssignment)
      .where(and(eq(customerTagAssignment.storeId, this.storeId), eq(customerTagAssignment.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getAssignmentsByIds(ids: readonly string[]): Promise<CustomerTagAssignment[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          inArray(customerTagAssignment.id, [...new Set(ids)]),
        ),
      );
  }

  async create(name: string): Promise<CustomerTag> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerTag)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        name: normalizeTagDisplayName(name),
        normalizedName: normalizeTagName(name),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();
    return rows[0];
  }

  async update(id: string, name: string): Promise<CustomerTag | null> {
    const rows = await this.connection
      .update(customerTag)
      .set({
        name: normalizeTagDisplayName(name),
        normalizedName: normalizeTagName(name),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerTag.storeId, this.storeId),
          eq(customerTag.id, id),
          isNull(customerTag.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerTag)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(customerTag.storeId, this.storeId),
          eq(customerTag.id, id),
          isNull(customerTag.deletedAt),
        ),
      )
      .returning({ id: customerTag.id });
    return rows.length > 0;
  }

  async assign(
    customerId: string,
    tagId: string,
    assignedById?: string | null,
  ): Promise<CustomerTagAssignment> {
    const existing = await this.findAssignment(customerId, tagId);
    if (existing) return existing;
    const rows = await this.connection
      .insert(customerTagAssignment)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId,
        tagId,
        assignedById: assignedById ?? null,
        assignedAt: new Date().toISOString(),
      })
      .returning();
    return rows[0];
  }

  async unassign(customerId: string, tagId: string): Promise<string | null> {
    const rows = await this.connection
      .delete(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          eq(customerTagAssignment.customerId, customerId),
          eq(customerTagAssignment.tagId, tagId),
        ),
      )
      .returning({ id: customerTagAssignment.id });
    return rows[0]?.id ?? null;
  }

  @Transactional()
  async replaceForCustomer(
    customerId: string,
    tagIds: readonly string[],
    assignedById?: string | null,
  ): Promise<CustomerTagAssignment[]> {
    await this.connection
      .delete(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          eq(customerTagAssignment.customerId, customerId),
        ),
      );
    const uniqueIds = [...new Set(tagIds)];
    if (uniqueIds.length === 0) return [];
    const ids = await this.generateUuidV7s(uniqueIds.length);
    const assignedAt = new Date().toISOString();
    return this.connection
      .insert(customerTagAssignment)
      .values(
        uniqueIds.map((tagId, index) => ({
          id: ids[index],
          storeId: this.storeId,
          customerId,
          tagId,
          assignedById: assignedById ?? null,
          assignedAt,
        })),
      )
      .returning();
  }

  @ReadOnly()
  async countCustomers(tagId: string): Promise<number> {
    const counts = await this.countCustomersByTagIds([tagId]);
    return counts.get(tagId) ?? 0;
  }

  @ReadOnly()
  async countCustomersByTagIds(tagIds: readonly string[]): Promise<Map<string, number>> {
    if (tagIds.length === 0) return new Map();
    const rows = await this.connection
      .select({
        tagId: customerTagAssignment.tagId,
        count: count(),
      })
      .from(customerTagAssignment)
      .innerJoin(
        customer,
        and(
          eq(customer.storeId, customerTagAssignment.storeId),
          eq(customer.id, customerTagAssignment.customerId),
          isNull(customer.deletedAt),
        ),
      )
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          inArray(customerTagAssignment.tagId, [...new Set(tagIds)]),
        ),
      )
      .groupBy(customerTagAssignment.tagId);
    return new Map(rows.map((row) => [row.tagId, row.count]));
  }

  @ReadOnly()
  async getConnection(input: CustomerTagRelayInput): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerTagRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "name", direction: "asc" }];
    const query: CustomerTagRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: { storeId: this.storeId, where: where ?? null, orderBy: effectiveOrder },
    };
    const [result, totalCount] = await Promise.all([
      customerTagRelayQuery.execute(this.connection, query),
      customerTagRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @ReadOnly()
  async getAssignmentConnection(
    input: CustomerTagAssignmentConnectionInput,
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, tagId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerTagAssignmentRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(customerId ? [{ customerId: { _eq: customerId } }] : []),
        ...(tagId ? [{ tagId: { _eq: tagId } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "assignedAt", direction: "desc" }];
    const query: CustomerTagAssignmentRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        customerId: customerId ?? null,
        tagId: tagId ?? null,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerTagAssignmentRelayQuery.execute(this.connection, query),
      customerTagAssignmentRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async deleteAssignmentsForCustomer(customerId: string): Promise<number> {
    const rows = await this.connection
      .delete(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          eq(customerTagAssignment.customerId, customerId),
        ),
      )
      .returning({ id: customerTagAssignment.id });
    return rows.length;
  }

  @ReadOnly()
  async findAssignment(customerId: string, tagId: string): Promise<CustomerTagAssignment | null> {
    const rows = await this.connection
      .select()
      .from(customerTagAssignment)
      .where(
        and(
          eq(customerTagAssignment.storeId, this.storeId),
          eq(customerTagAssignment.customerId, customerId),
          eq(customerTagAssignment.tagId, tagId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

function normalizeTagName(name: string): string {
  return normalizeUnicodeSearchValue(name);
}

export function normalizeTagDisplayName(name: string): string {
  return fullUnicodeNfkc(name)
    .replace(
      // oxlint-disable-next-line eslint/no-control-regex -- Unicode whitespace includes control code points.
      /[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/gu,
      " ",
    )
    .trim();
}
