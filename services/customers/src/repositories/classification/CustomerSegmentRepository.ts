import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  normalizeRelayPagination,
  type RepositoryConnectionResult,
} from "../connection.js";
import {
  decodeCustomerGlobalId,
  decodeCustomerSegmentGlobalId,
  decodeCustomerSegmentMembershipGlobalId,
} from "../global-id-where-mappers.js";
import {
  customer,
  customerSegment,
  customerSegmentListView,
  customerSegmentMembership,
  type CustomerSegment,
  type CustomerSegmentMembership,
  type NewCustomerSegment,
} from "../models/index.js";

export const customerSegmentRelayQuery = createRelayQuery(
  createQuery(customerSegmentListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerSegmentGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerSegment", tieBreaker: "id" }
);

export const customerSegmentMembershipRelayQuery = createRelayQuery(
  createQuery(customerSegmentMembership)
    .include(["id"])
    .mapWhereFields({
      id: decodeCustomerSegmentMembershipGlobalId,
      customerId: decodeCustomerGlobalId,
      segmentId: decodeCustomerSegmentGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "customerSegmentMembership", tieBreaker: "id" }
);

export type CustomerSegmentRelayInput = InferRelayInput<
  typeof customerSegmentRelayQuery
>;
export type CustomerSegmentMembershipRelayInput = InferRelayInput<
  typeof customerSegmentMembershipRelayQuery
>;
export type CustomerSegmentMembershipConnectionInput =
  CustomerSegmentMembershipRelayInput & {
    customerId?: string;
    segmentId?: string;
  };

export type CustomerSegmentPatch = Partial<
  Pick<
    NewCustomerSegment,
    "name" | "description" | "color" | "type" | "status" | "query" | "definition"
  >
>;

export interface CustomerSegmentMembershipRelationsPatch {
  create: Array<{ customerId: string; expiresAt?: string | null }>;
  update: Array<{ membershipId: string; expiresAt?: string | null }>;
  deleteIds: string[];
  setCustomerIds?: string[];
}

export interface CustomerSegmentUpdateResult {
  segment: CustomerSegment;
  affectedCustomerIds: string[];
}

export interface SegmentMembershipMutationResult {
  segment: CustomerSegment;
  memberships: CustomerSegmentMembership[];
}

export class CustomerSegmentRepository extends BaseRepository {
  @ReadOnly()
  async findById(id: string): Promise<CustomerSegment | null> {
    const rows = await this.connection
      .select()
      .from(customerSegment)
      .where(
        and(
          eq(customerSegment.storeId, this.storeId),
          eq(customerSegment.id, id),
          isNull(customerSegment.deletedAt)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<CustomerSegment[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerSegment)
      .where(
        and(
          eq(customerSegment.storeId, this.storeId),
          inArray(customerSegment.id, [...new Set(ids)]),
          isNull(customerSegment.deletedAt)
        )
      );
  }

  @ReadOnly()
  async findMembershipById(id: string): Promise<CustomerSegmentMembership | null> {
    const rows = await this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getMembershipsByIds(
    ids: readonly string[]
  ): Promise<CustomerSegmentMembership[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          inArray(customerSegmentMembership.id, [...new Set(ids)])
        )
      );
  }

  @ReadOnly()
  async getMembershipsByCustomerIds(
    customerIds: readonly string[]
  ): Promise<CustomerSegmentMembership[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          inArray(customerSegmentMembership.customerId, [...new Set(customerIds)])
        )
      );
  }

  @ReadOnly()
  async getManualMembershipsBySegmentId(
    segmentId: string
  ): Promise<CustomerSegmentMembership[]> {
    return this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.segmentId, segmentId),
          eq(customerSegmentMembership.source, "MANUAL")
        )
      );
  }

  @ReadOnly()
  async getMembershipsBySegmentAndCustomerIds(
    segmentId: string,
    customerIds: readonly string[]
  ): Promise<CustomerSegmentMembership[]> {
    if (customerIds.length === 0) return [];
    return this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.segmentId, segmentId),
          inArray(
            customerSegmentMembership.customerId,
            [...new Set(customerIds)]
          )
        )
      );
  }

  @ReadOnly()
  async countCurrentCustomersBySegmentIds(
    segmentIds: readonly string[]
  ): Promise<Map<string, number>> {
    if (segmentIds.length === 0) return new Map();
    const rows = await this.connection
      .select({
        segmentId: customerSegmentMembership.segmentId,
        count: sql<number>`count(*)::integer`,
      })
      .from(customerSegmentMembership)
      .innerJoin(
        customer,
        and(
          eq(customer.storeId, customerSegmentMembership.storeId),
          eq(customer.id, customerSegmentMembership.customerId),
          isNull(customer.deletedAt)
        )
      )
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          inArray(
            customerSegmentMembership.segmentId,
            [...new Set(segmentIds)]
          ),
          sql`(${customerSegmentMembership.expiresAt} IS NULL OR ${customerSegmentMembership.expiresAt} > now())`
        )
      )
      .groupBy(customerSegmentMembership.segmentId);
    return new Map(rows.map((row) => [row.segmentId, row.count]));
  }

  async create(data: {
    name: string;
    description?: string | null;
    color?: string | null;
    type: CustomerSegment["type"];
    status?: CustomerSegment["status"];
    query?: string | null;
    definition?: Record<string, unknown>;
    createdById?: string | null;
  }): Promise<CustomerSegment> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(customerSegment)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        name: data.name.trim(),
        description: data.description ?? null,
        color: data.color ?? null,
        type: data.type,
        status: data.status ?? "DRAFT",
        query: data.query ?? null,
        definition: data.definition ?? {},
        createdById: data.createdById ?? null,
        revision: 0,
        definitionRevision: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();
    return rows[0];
  }

  async update(
    id: string,
    patch: CustomerSegmentPatch,
    expectedRevision?: number,
    definitionChanged = false
  ): Promise<CustomerSegment | null> {
    const conditions = [
      eq(customerSegment.storeId, this.storeId),
      eq(customerSegment.id, id),
      isNull(customerSegment.deletedAt),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(customerSegment.revision, expectedRevision));
    }
    const rows = await this.connection
      .update(customerSegment)
      .set({
        ...patch,
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        revision: sql`${customerSegment.revision} + 1`,
        ...(definitionChanged
          ? {
              definitionRevision: sql`${customerSegment.definitionRevision} + 1`,
            }
          : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning();
    return rows[0] ?? null;
  }

  @Transactional()
  async updateWithMemberships(
    id: string,
    patch: CustomerSegmentPatch,
    memberships: CustomerSegmentMembershipRelationsPatch | undefined,
    expectedRevision?: number,
    definitionChanged = false
  ): Promise<CustomerSegmentUpdateResult | null> {
    const segment = await this.update(
      id,
      patch,
      expectedRevision,
      definitionChanged
    );
    if (!segment) return null;
    if (!memberships) {
      return { segment, affectedCustomerIds: [] };
    }

    const affectedCustomerIds = new Set<string>();
    const now = new Date().toISOString();

    if (memberships.setCustomerIds !== undefined) {
      const previous = await this.getManualMembershipsBySegmentId(id);
      for (const membership of previous) {
        affectedCustomerIds.add(membership.customerId);
      }
      for (const customerId of memberships.setCustomerIds) {
        affectedCustomerIds.add(customerId);
      }

      await this.connection
        .delete(customerSegmentMembership)
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.segmentId, id),
            eq(customerSegmentMembership.source, "MANUAL")
          )
        );

      const customerIds = [...new Set(memberships.setCustomerIds)];
      if (customerIds.length > 0) {
        const ids = await this.generateUuidV7s(customerIds.length);
        await this.connection.insert(customerSegmentMembership).values(
          customerIds.map((customerId, index) => ({
            id: ids[index],
            storeId: this.storeId,
            customerId,
            segmentId: id,
            source: "MANUAL" as const,
            evaluatedAt: now,
            evaluatedDefinitionRevision: null,
            expiresAt: null,
          }))
        );
      }
      return { segment, affectedCustomerIds: [...affectedCustomerIds] };
    }

    const referencedMemberships = await this.getMembershipsByIds([
      ...memberships.update.map((item) => item.membershipId),
      ...memberships.deleteIds,
    ]);
    for (const membership of referencedMemberships) {
      affectedCustomerIds.add(membership.customerId);
    }
    for (const input of memberships.create) {
      affectedCustomerIds.add(input.customerId);
    }

    if (memberships.create.length > 0) {
      const ids = await this.generateUuidV7s(memberships.create.length);
      await this.connection.insert(customerSegmentMembership).values(
        memberships.create.map((input, index) => ({
          id: ids[index],
          storeId: this.storeId,
          customerId: input.customerId,
          segmentId: id,
          source: "MANUAL" as const,
          evaluatedAt: now,
          evaluatedDefinitionRevision: null,
          expiresAt: input.expiresAt ?? null,
        }))
      );
    }

    for (const input of memberships.update) {
      if (input.expiresAt === undefined) continue;
      await this.connection
        .update(customerSegmentMembership)
        .set({ expiresAt: input.expiresAt })
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.id, input.membershipId),
            eq(customerSegmentMembership.segmentId, id),
            eq(customerSegmentMembership.source, "MANUAL")
          )
        );
    }

    if (memberships.deleteIds.length > 0) {
      await this.connection
        .delete(customerSegmentMembership)
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.segmentId, id),
            eq(customerSegmentMembership.source, "MANUAL"),
            inArray(
              customerSegmentMembership.id,
              [...new Set(memberships.deleteIds)]
            )
          )
        );
    }

    return { segment, affectedCustomerIds: [...affectedCustomerIds] };
  }

  async softDelete(id: string, expectedRevision?: number): Promise<boolean> {
    const conditions = [
      eq(customerSegment.storeId, this.storeId),
      eq(customerSegment.id, id),
      isNull(customerSegment.deletedAt),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(customerSegment.revision, expectedRevision));
    }
    const now = new Date().toISOString();
    const rows = await this.connection
      .update(customerSegment)
      .set({
        status: "ARCHIVED",
        revision: sql`${customerSegment.revision} + 1`,
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(...conditions))
      .returning({ id: customerSegment.id });
    return rows.length > 0;
  }

  @Transactional()
  async addCustomers(
    segmentId: string,
    customerIds: readonly string[],
    expectedRevision?: number,
    source: CustomerSegmentMembership["source"] = "MANUAL"
  ): Promise<SegmentMembershipMutationResult | null> {
    const segment = await this.bumpRevision(segmentId, expectedRevision, source);
    if (!segment) return null;
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length === 0) return { segment, memberships: [] };
    const evaluatedAt = new Date().toISOString();
    const existing = await this.connection
      .select()
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.segmentId, segmentId),
          inArray(customerSegmentMembership.customerId, uniqueIds)
        )
      );
    const existingCustomerIds = new Set(existing.map((row) => row.customerId));
    const missingCustomerIds = uniqueIds.filter(
      (customerId) => !existingCustomerIds.has(customerId)
    );
    const updated = existing.length > 0
      ? await this.connection
        .update(customerSegmentMembership)
        .set({
          source,
          evaluatedAt,
          evaluatedDefinitionRevision:
            source === "RULE" ? segment.definitionRevision : null,
          expiresAt: null,
        })
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.segmentId, segmentId),
            inArray(
              customerSegmentMembership.customerId,
              existing.map((row) => row.customerId)
            )
          )
        )
        .returning()
      : [];
    const ids = await this.generateUuidV7s(missingCustomerIds.length);
    const inserted = missingCustomerIds.length > 0
      ? await this.connection
        .insert(customerSegmentMembership)
        .values(
          missingCustomerIds.map((customerId, index) => ({
            id: ids[index],
            storeId: this.storeId,
            customerId,
            segmentId,
            source,
            evaluatedAt,
            evaluatedDefinitionRevision:
              source === "RULE" ? segment.definitionRevision : null,
            expiresAt: null,
          }))
        )
        .returning()
      : [];
    const memberships = [...updated, ...inserted];
    return { segment, memberships };
  }

  @Transactional()
  async removeCustomers(
    segmentId: string,
    customerIds: readonly string[],
    expectedRevision?: number
  ): Promise<CustomerSegment | null> {
    const segment = await this.bumpRevision(segmentId, expectedRevision);
    if (!segment) return null;
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length > 0) {
      await this.connection
        .delete(customerSegmentMembership)
        .where(
          and(
            eq(customerSegmentMembership.storeId, this.storeId),
            eq(customerSegmentMembership.segmentId, segmentId),
            eq(customerSegmentMembership.source, "MANUAL"),
            inArray(customerSegmentMembership.customerId, uniqueIds)
          )
        );
    }
    return segment;
  }

  @Transactional()
  async replaceCustomers(
    segmentId: string,
    customerIds: readonly string[],
    expectedRevision?: number
  ): Promise<SegmentMembershipMutationResult | null> {
    const segment = await this.bumpRevision(segmentId, expectedRevision);
    if (!segment) return null;
    await this.connection
      .delete(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.segmentId, segmentId),
          eq(customerSegmentMembership.source, "MANUAL")
        )
      );
    const uniqueIds = [...new Set(customerIds)];
    if (uniqueIds.length === 0) return { segment, memberships: [] };
    const ids = await this.generateUuidV7s(uniqueIds.length);
    const evaluatedAt = new Date().toISOString();
    const memberships = await this.connection
      .insert(customerSegmentMembership)
      .values(
        uniqueIds.map((customerId, index) => ({
          id: ids[index],
          storeId: this.storeId,
          customerId,
          segmentId,
          source: "MANUAL" as const,
          evaluatedAt,
          evaluatedDefinitionRevision: null,
          expiresAt: null,
        }))
      )
      .returning();
    return { segment, memberships };
  }

  @Transactional()
  async replaceManualMembershipsForCustomer(
    customerId: string,
    segmentIds: readonly string[]
  ): Promise<CustomerSegmentMembership[]> {
    const previous = await this.connection
      .select({ segmentId: customerSegmentMembership.segmentId })
      .from(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.customerId, customerId),
          eq(customerSegmentMembership.source, "MANUAL")
        )
      );
    await this.connection
      .delete(customerSegmentMembership)
      .where(
        and(
          eq(customerSegmentMembership.storeId, this.storeId),
          eq(customerSegmentMembership.customerId, customerId),
          eq(customerSegmentMembership.source, "MANUAL")
        )
      );

    const uniqueIds = [...new Set(segmentIds)];
    let memberships: CustomerSegmentMembership[] = [];
    if (uniqueIds.length > 0) {
      const ids = await this.generateUuidV7s(uniqueIds.length);
      const evaluatedAt = new Date().toISOString();
      memberships = await this.connection
        .insert(customerSegmentMembership)
        .values(
          uniqueIds.map((segmentId, index) => ({
            id: ids[index],
            storeId: this.storeId,
            customerId,
            segmentId,
            source: "MANUAL" as const,
            evaluatedAt,
            evaluatedDefinitionRevision: null,
            expiresAt: null,
          }))
        )
        .returning();
    }

    const affected = [...new Set([...previous.map((row) => row.segmentId), ...uniqueIds])];
    if (affected.length > 0) {
      await this.connection
        .update(customerSegment)
        .set({
          revision: sql`${customerSegment.revision} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(customerSegment.storeId, this.storeId),
            inArray(customerSegment.id, affected),
            isNull(customerSegment.deletedAt)
          )
        );
    }
    return memberships;
  }

  @ReadOnly()
  async getConnection(
    input: CustomerSegmentRelayInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerSegmentRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "updatedAt", direction: "desc" }];
    const query: CustomerSegmentRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: { storeId: this.storeId, where: where ?? null, orderBy: effectiveOrder },
    };
    const [result, totalCount] = await Promise.all([
      customerSegmentRelayQuery.execute(this.connection, query),
      customerSegmentRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @ReadOnly()
  async getMembershipConnection(
    input: CustomerSegmentMembershipConnectionInput
  ): Promise<RepositoryConnectionResult> {
    const normalized = normalizeRelayPagination(input);
    const { customerId, segmentId, where, orderBy, ...pagination } = normalized;
    const mergedWhere: CustomerSegmentMembershipRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(customerId ? [{ customerId: { _eq: customerId } }] : []),
        ...(segmentId ? [{ segmentId: { _eq: segmentId } }] : []),
        ...(where ? [where] : []),
      ],
    };
    const effectiveOrder = orderBy ?? [{ field: "evaluatedAt", direction: "desc" }];
    const query: CustomerSegmentMembershipRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: effectiveOrder,
      filters: {
        storeId: this.storeId,
        customerId: customerId ?? null,
        segmentId: segmentId ?? null,
        where: where ?? null,
        orderBy: effectiveOrder,
      },
    };
    const [result, totalCount] = await Promise.all([
      customerSegmentMembershipRelayQuery.execute(this.connection, query),
      customerSegmentMembershipRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, nodeId: node.id })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  private async bumpRevision(
    segmentId: string,
    expectedRevision?: number,
    source: CustomerSegmentMembership["source"] = "MANUAL"
  ): Promise<CustomerSegment | null> {
    const conditions = [
      eq(customerSegment.storeId, this.storeId),
      eq(customerSegment.id, segmentId),
      eq(customerSegment.type, source === "RULE" ? "DYNAMIC" : "MANUAL"),
      isNull(customerSegment.deletedAt),
    ];
    if (expectedRevision !== undefined) {
      conditions.push(eq(customerSegment.revision, expectedRevision));
    }
    const rows = await this.connection
      .update(customerSegment)
      .set({
        revision: sql`${customerSegment.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning();
    return rows[0] ?? null;
  }
}
