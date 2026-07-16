import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, count, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerGroupGlobalId,
  decodeCustomerGroupMembershipGlobalId,
} from "../global-id-where-mappers.js";
import {
  customer,
  customerGroup,
  customerGroupMembership,
  type CustomerGroup,
  type CustomerGroupMembership,
  type NewCustomerGroup,
} from "../models/index.js";

export const customerGroupRelayQuery = createRelayQuery(
  createQuery(customerGroup)
    .include(["id"])
    .mapWhereField("id", decodeCustomerGroupGlobalId)
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerGroup", tieBreaker: "id" }
);

export const customerGroupMembershipRelayQuery = createRelayQuery(
  createQuery(customerGroupMembership)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerGroupMembershipGlobalId,
      customerId: decodeCustomerGlobalId,
      groupId: decodeCustomerGroupGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerGroupMembership", tieBreaker: "id" }
);

export type CustomerGroupRelayInput = InferRelayInput<
  typeof customerGroupRelayQuery
>;
export type CustomerGroupMembershipRelayInput = InferRelayInput<
  typeof customerGroupMembershipRelayQuery
>;
export type CustomerGroupMembershipConnectionInput =
  CustomerGroupMembershipRelayInput & {
    customerId?: string;
    groupId?: string;
  };

export interface CustomerGroupMembershipSetData {
  customerId: string;
  groupId: string;
  isPrimary?: boolean;
  source?: CustomerGroupMembership["source"];
  assignedById?: string | null;
  expiresAt?: string | null;
}

export class CustomerGroupRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerGroup | null> {
    const rows = await this.connection
      .select()
      .from(customerGroup)
      .where(
        and(
          eq(customerGroup.storeId, this.storeId),
          eq(customerGroup.id, id),
          isNull(customerGroup.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async findByCode(code: string): Promise<CustomerGroup | null> {
    const rows = await this.connection
      .select()
      .from(customerGroup)
      .where(
        and(
          eq(customerGroup.storeId, this.storeId),
          eq(customerGroup.code, normalizeCode(code)),
          isNull(customerGroup.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerGroup[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerGroup)
      .where(
        and(
          eq(customerGroup.storeId, this.storeId),
          inArray(customerGroup.id, [...new Set(ids)]),
          isNull(customerGroup.deletedAt)
        )
      );
  }

  @ReadOnly()
  async findMembershipById(id: string): Promise<CustomerGroupMembership | null> {
    const rows = await this.connection
      .select()
      .from(customerGroupMembership)
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          eq(customerGroupMembership.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getMembershipsByIds(
    ids: readonly string[]
  ): Promise<CustomerGroupMembership[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerGroupMembership)
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          inArray(customerGroupMembership.id, [...new Set(ids)])
        )
      );
  }

  @Transactional()
  async create(data: {
    code: string;
    name: string;
    description?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }): Promise<CustomerGroup> {
    if (data.isDefault && data.isActive !== false) await this.clearDefault();
    const now = new Date().toISOString();
    const row: NewCustomerGroup = {
      id: await this.generateUuidV7(),
      storeId: this.storeId,
      code: normalizeCode(data.code),
      name: data.name.trim(),
      description: data.description ?? null,
      isDefault: data.isDefault ?? false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const rows = await this.connection.insert(customerGroup).values(row).returning();
    return rows[0];
  }

  @Transactional()
  async update(
    id: string,
    patch: Partial<
      Pick<NewCustomerGroup, "code" | "name" | "description" | "isDefault" | "isActive">
    >
  ): Promise<CustomerGroup | null> {
    const current = await this.findById(id);
    if (!current) return null;
    const nextActive = patch.isActive ?? current.isActive;
    const nextDefault = patch.isDefault ?? current.isDefault;
    if (nextActive && nextDefault) await this.clearDefault(id);
    const rows = await this.connection
      .update(customerGroup)
      .set({
        ...patch,
        ...(patch.code !== undefined ? { code: normalizeCode(patch.code) } : {}),
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(!nextActive ? { isDefault: false } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(customerGroup.storeId, this.storeId),
          eq(customerGroup.id, id),
          isNull(customerGroup.deletedAt)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerGroup)
      .set({ isActive: false, isDefault: false, deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(customerGroup.storeId, this.storeId),
          eq(customerGroup.id, id),
          isNull(customerGroup.deletedAt)
        )
      )
      .returning({ id: customerGroup.id });
    return rows.length > 0;
  }

  @Transactional()
  async setMembership(
    data: CustomerGroupMembershipSetData
  ): Promise<CustomerGroupMembership> {
    if (data.isPrimary) await this.clearPrimaryMembership(data.customerId);
    const now = new Date().toISOString();
    const existing = await this.findMembership(data.customerId, data.groupId);
    const values = {
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        customerId: data.customerId,
        groupId: data.groupId,
        isPrimary: data.isPrimary ?? false,
        source: data.source ?? "MANUAL",
        assignedById: data.assignedById ?? null,
        assignedAt: now,
        expiresAt: data.expiresAt ?? null,
      };
    const rows = existing
      ? await this.connection
        .update(customerGroupMembership)
        .set({
          isPrimary: data.isPrimary ?? false,
          source: data.source ?? "MANUAL",
          assignedById: data.assignedById ?? null,
          assignedAt: now,
          expiresAt: data.expiresAt ?? null,
        })
        .where(
          and(
            eq(customerGroupMembership.storeId, this.storeId),
            eq(customerGroupMembership.id, existing.id)
          )
        )
        .returning()
      : await this.connection
        .insert(customerGroupMembership)
        .values(values)
        .returning();
    return rows[0];
  }

  async deleteMembership(customerId: string, groupId: string): Promise<string | null> {
    const rows = await this.connection
      .delete(customerGroupMembership)
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          eq(customerGroupMembership.customerId, customerId),
          eq(customerGroupMembership.groupId, groupId)
        )
      )
      .returning({ id: customerGroupMembership.id });
    return rows[0]?.id ?? null;
  }

  @Transactional()
  async replaceManualMembershipsForCustomer(
    customerId: string,
    memberships: readonly Omit<CustomerGroupMembershipSetData, "customerId" | "source">[]
  ): Promise<CustomerGroupMembership[]> {
    await this.connection
      .delete(customerGroupMembership)
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          eq(customerGroupMembership.customerId, customerId),
          eq(customerGroupMembership.source, "MANUAL")
        )
      );
    const result: CustomerGroupMembership[] = [];
    for (const membership of memberships) {
      result.push(
        await this.setMembership({
          ...membership,
          customerId,
          source: "MANUAL",
        })
      );
    }
    return result;
  }

  @ReadOnly()
  async countCurrentCustomers(groupId: string): Promise<number> {
    const counts = await this.countCurrentCustomersByGroupIds([groupId]);
    return counts.get(groupId) ?? 0;
  }

  @ReadOnly()
  async countCurrentCustomersByGroupIds(
    groupIds: readonly string[]
  ): Promise<Map<string, number>> {
    if (groupIds.length === 0) return new Map();
    const rows = await this.connection
      .select({
        groupId: customerGroupMembership.groupId,
        count: count(),
      })
      .from(customerGroupMembership)
      .innerJoin(
        customer,
        and(
          eq(customer.storeId, customerGroupMembership.storeId),
          eq(customer.id, customerGroupMembership.customerId),
          isNull(customer.deletedAt)
        )
      )
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          inArray(customerGroupMembership.groupId, [...new Set(groupIds)]),
          or(
            isNull(customerGroupMembership.expiresAt),
            sql`${customerGroupMembership.expiresAt} > now()`
          )
        )
      )
      .groupBy(customerGroupMembership.groupId);
    return new Map(rows.map((row) => [row.groupId, row.count]));
  }

  @ReadOnly()
  async getConnection(input: CustomerGroupRelayInput): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerGroupRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "name", direction: "asc" }];
    const query: CustomerGroupRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: { storeId: this.storeId, where: where ?? null, orderBy: effectiveOrder },
    };
    const [result, totalCount] = await Promise.all([
      customerGroupRelayQuery.execute(this.connection, query),
      customerGroupRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @ReadOnly()
  async getMembershipConnection(
    input: CustomerGroupMembershipConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, groupId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerGroupMembershipRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(customerId ? [{ customerId: { _eq: customerId } }] : []),
        ...(groupId ? [{ groupId: { _eq: groupId } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "assignedAt", direction: "desc" }];
    const query: CustomerGroupMembershipRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        customerId: customerId ?? null,
        groupId: groupId ?? null,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerGroupMembershipRelayQuery.execute(this.connection, query),
      customerGroupMembershipRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async clearDefault(exceptId?: string): Promise<void> {
    await this.connection
      .update(customerGroup)
      .set({ isDefault: false, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(customerGroup.storeId, this.storeId),
          eq(customerGroup.isDefault, true),
          isNull(customerGroup.deletedAt),
          exceptId ? sql`${customerGroup.id} <> ${exceptId}` : undefined
        )
      );
  }

  private async clearPrimaryMembership(customerId: string): Promise<void> {
    await this.connection
      .update(customerGroupMembership)
      .set({ isPrimary: false })
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          eq(customerGroupMembership.customerId, customerId),
          eq(customerGroupMembership.isPrimary, true)
        )
      );
  }

  private async findMembership(
    customerId: string,
    groupId: string
  ): Promise<CustomerGroupMembership | null> {
    const rows = await this.connection
      .select()
      .from(customerGroupMembership)
      .where(
        and(
          eq(customerGroupMembership.storeId, this.storeId),
          eq(customerGroupMembership.customerId, customerId),
          eq(customerGroupMembership.groupId, groupId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }
}

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}
