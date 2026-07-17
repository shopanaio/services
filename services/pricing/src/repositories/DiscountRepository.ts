import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { ReadOnly } from "@shopana/shared-kernel";
import type { TransactionManager } from "@shopana/shared-kernel";
import {
  and,
  asc,
  eq,
  getViewSelectedFields,
  inArray,
} from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import { BaseRepository } from "./BaseRepository.js";
import {
  decodeCheckoutGlobalId,
  decodeCustomerGlobalId,
  decodeDiscountCodeGlobalId,
  decodeDiscountExternalReferenceGlobalId,
  decodeDiscountGlobalId,
  decodeDiscountRedemptionGlobalId,
  decodeDiscountUsageReservationGlobalId,
  decodeOrderGlobalId,
  mapGraphqlBigInt,
} from "./global-id-where-mappers.js";
import {
  discount,
  discountAmountOff,
  discountBuyerContext,
  discountBuyXGetY,
  discountChannel,
  discountCodeListView,
  discountCombinationClass,
  discountEligibleCustomer,
  discountEligibleSegment,
  discountExternalReference,
  discountFreeShipping,
  discountListView,
  discountMinimumRequirement,
  discountRedemption,
  discountRedemptionAllocation,
  discountTarget,
  discountTargetSelection,
  discountUsageReservation,
  discountUsageSummaryView,
  type Discount,
  type DiscountAmountOff,
  type DiscountBuyerContext,
  type DiscountBuyXGetY,
  type DiscountChannel,
  type DiscountCodeListView,
  type DiscountCombinationClass,
  type DiscountEligibleCustomer,
  type DiscountEligibleSegment,
  type DiscountExternalReference,
  type DiscountFreeShipping,
  type DiscountListView,
  type DiscountMinimumRequirement,
  type DiscountRedemption,
  type DiscountRedemptionAllocation,
  type DiscountTarget,
  type DiscountTargetSelection,
  type DiscountUsageReservation,
  type DiscountUsageSummaryView,
} from "./models/index.js";

export const discountRelayQuery = createRelayQuery(
  createQuery(discountListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeDiscountGlobalId,
      usageLimit: mapGraphqlBigInt,
      reservedUsageCount: mapGraphqlBigInt,
      usageCount: mapGraphqlBigInt,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "discount", tieBreaker: "id" },
);

export const discountCodeRelayQuery = createRelayQuery(
  createQuery(discountCodeListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeDiscountCodeGlobalId,
      discountId: decodeDiscountGlobalId,
      usageLimit: mapGraphqlBigInt,
      reservedCount: mapGraphqlBigInt,
      usageCount: mapGraphqlBigInt,
      remainingCount: mapGraphqlBigInt,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "discountCode", tieBreaker: "id" },
);

export const discountUsageReservationRelayQuery = createRelayQuery(
  createQuery(discountUsageReservation)
    .include(["id"])
    .mapWhereFields({
      id: decodeDiscountUsageReservationGlobalId,
      discountId: decodeDiscountGlobalId,
      codeId: decodeDiscountCodeGlobalId,
      customerId: decodeCustomerGlobalId,
      checkoutId: decodeCheckoutGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "discountUsageReservation", tieBreaker: "id" },
);

export const discountRedemptionRelayQuery = createRelayQuery(
  createQuery(discountRedemption)
    .include(["id"])
    .mapWhereFields({
      id: decodeDiscountRedemptionGlobalId,
      discountId: decodeDiscountGlobalId,
      codeId: decodeDiscountCodeGlobalId,
      reservationId: decodeDiscountUsageReservationGlobalId,
      customerId: decodeCustomerGlobalId,
      checkoutId: decodeCheckoutGlobalId,
      orderId: decodeOrderGlobalId,
      amountMinor: mapGraphqlBigInt,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "discountRedemption", tieBreaker: "id" },
);

export const discountExternalReferenceRelayQuery = createRelayQuery(
  createQuery(discountExternalReference)
    .include(["id"])
    .mapWhereFields({
      id: decodeDiscountExternalReferenceGlobalId,
      discountId: decodeDiscountGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "discountExternalReference", tieBreaker: "id" },
);

export type DiscountRelayInput = InferRelayInput<typeof discountRelayQuery>;
export type DiscountCodeRelayInput = InferRelayInput<
  typeof discountCodeRelayQuery
>;
export type DiscountUsageReservationRelayInput = InferRelayInput<
  typeof discountUsageReservationRelayQuery
>;
export type DiscountRedemptionRelayInput = InferRelayInput<
  typeof discountRedemptionRelayQuery
>;
export type DiscountExternalReferenceRelayInput = InferRelayInput<
  typeof discountExternalReferenceRelayQuery
>;

/** GraphQL adds virtual list fields which are backed by search columns. */
export type DiscountConnectionInput = Omit<DiscountRelayInput, "where"> & {
  where?: unknown;
};

export interface DiscountConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export type DiscountReadModel = DiscountListView &
  Pick<Discount, "metadata">;

export type DiscountRuleReadModel =
  | { kind: "AMOUNT_OFF"; value: DiscountAmountOff }
  | { kind: "BUY_X_GET_Y"; value: DiscountBuyXGetY }
  | { kind: "FREE_SHIPPING"; value: DiscountFreeShipping };

function mapVirtualWhereFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(mapVirtualWhereFields);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const virtualFieldMapping: Record<string, string> = {
    code: "searchCodes",
    tag: "searchTags",
    channelCode: "searchChannelCodes",
    featuredChannelCode: "searchFeaturedChannelCodes",
  };

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      virtualFieldMapping[key] ?? key,
      mapVirtualWhereFields(child),
    ]),
  );
}

export class DiscountRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  @ReadOnly()
  async findById(id: string): Promise<DiscountReadModel | null> {
    return (await this.getByIds([id]))[0] ?? null;
  }

  @ReadOnly()
  async getByIds(ids: readonly string[]): Promise<DiscountReadModel[]> {
    if (ids.length === 0) return [];

    const rows = await this.connection
      .select({
        ...getViewSelectedFields(discountListView),
        metadata: discount.metadata,
      })
      .from(discountListView)
      .innerJoin(
        discount,
        and(
          eq(discount.storeId, discountListView.storeId),
          eq(discount.id, discountListView.id),
        ),
      )
      .where(
        and(
          eq(discountListView.storeId, this.storeId),
          inArray(discountListView.id, [...new Set(ids)]),
        ),
      );

    return rows;
  }

  @ReadOnly()
  async getRulesByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountRuleReadModel[]> {
    if (ids.length === 0) return [];
    const uniqueIds = [...new Set(ids)];
    const [amountOffRows, buyXGetYRows, freeShippingRows] = await Promise.all([
      this.connection
        .select()
        .from(discountAmountOff)
        .where(
          and(
            eq(discountAmountOff.storeId, this.storeId),
            inArray(discountAmountOff.discountId, uniqueIds),
          ),
        ),
      this.connection
        .select()
        .from(discountBuyXGetY)
        .where(
          and(
            eq(discountBuyXGetY.storeId, this.storeId),
            inArray(discountBuyXGetY.discountId, uniqueIds),
          ),
        ),
      this.connection
        .select()
        .from(discountFreeShipping)
        .where(
          and(
            eq(discountFreeShipping.storeId, this.storeId),
            inArray(discountFreeShipping.discountId, uniqueIds),
          ),
        ),
    ]);

    return [
      ...amountOffRows.map(
        (value): DiscountRuleReadModel => ({ kind: "AMOUNT_OFF", value }),
      ),
      ...buyXGetYRows.map(
        (value): DiscountRuleReadModel => ({ kind: "BUY_X_GET_Y", value }),
      ),
      ...freeShippingRows.map(
        (value): DiscountRuleReadModel => ({ kind: "FREE_SHIPPING", value }),
      ),
    ];
  }

  @ReadOnly()
  async getMinimumRequirementsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountMinimumRequirement[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountMinimumRequirement)
      .where(
        and(
          eq(discountMinimumRequirement.storeId, this.storeId),
          inArray(discountMinimumRequirement.discountId, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getTargetSelectionsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountTargetSelection[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountTargetSelection)
      .where(
        and(
          eq(discountTargetSelection.storeId, this.storeId),
          inArray(discountTargetSelection.discountId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountTargetSelection.discountId),
        asc(discountTargetSelection.role),
      );
  }

  @ReadOnly()
  async getTargetsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountTarget[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountTarget)
      .where(
        and(
          eq(discountTarget.storeId, this.storeId),
          inArray(discountTarget.discountId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountTarget.discountId),
        asc(discountTarget.role),
        asc(discountTarget.targetId),
      );
  }

  @ReadOnly()
  async getBuyerContextsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountBuyerContext[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountBuyerContext)
      .where(
        and(
          eq(discountBuyerContext.storeId, this.storeId),
          inArray(discountBuyerContext.discountId, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getEligibleCustomersByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountEligibleCustomer[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountEligibleCustomer)
      .where(
        and(
          eq(discountEligibleCustomer.storeId, this.storeId),
          inArray(discountEligibleCustomer.discountId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountEligibleCustomer.discountId),
        asc(discountEligibleCustomer.customerId),
      );
  }

  @ReadOnly()
  async getEligibleSegmentsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountEligibleSegment[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountEligibleSegment)
      .where(
        and(
          eq(discountEligibleSegment.storeId, this.storeId),
          inArray(discountEligibleSegment.discountId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountEligibleSegment.discountId),
        asc(discountEligibleSegment.segmentId),
      );
  }

  @ReadOnly()
  async getChannelsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountChannel[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountChannel)
      .where(
        and(
          eq(discountChannel.storeId, this.storeId),
          inArray(discountChannel.discountId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountChannel.discountId),
        asc(discountChannel.channelCode),
      );
  }

  @ReadOnly()
  async getCombinationsByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountCombinationClass[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountCombinationClass)
      .where(
        and(
          eq(discountCombinationClass.storeId, this.storeId),
          inArray(discountCombinationClass.discountId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountCombinationClass.discountId),
        asc(discountCombinationClass.combinesWithClass),
      );
  }

  @ReadOnly()
  async getUsageSummariesByDiscountIds(
    ids: readonly string[],
  ): Promise<DiscountUsageSummaryView[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountUsageSummaryView)
      .where(
        and(
          eq(discountUsageSummaryView.storeId, this.storeId),
          inArray(discountUsageSummaryView.discountId, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getCodesByIds(ids: readonly string[]): Promise<DiscountCodeListView[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountCodeListView)
      .where(
        and(
          eq(discountCodeListView.storeId, this.storeId),
          inArray(discountCodeListView.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getUsageReservationsByIds(
    ids: readonly string[],
  ): Promise<DiscountUsageReservation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountUsageReservation)
      .where(
        and(
          eq(discountUsageReservation.storeId, this.storeId),
          inArray(discountUsageReservation.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getRedemptionsByIds(
    ids: readonly string[],
  ): Promise<DiscountRedemption[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountRedemption)
      .where(
        and(
          eq(discountRedemption.storeId, this.storeId),
          inArray(discountRedemption.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getRedemptionAllocationsByIds(
    ids: readonly string[],
  ): Promise<DiscountRedemptionAllocation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountRedemptionAllocation)
      .where(
        and(
          eq(discountRedemptionAllocation.storeId, this.storeId),
          inArray(discountRedemptionAllocation.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getRedemptionAllocationsByRedemptionIds(
    ids: readonly string[],
  ): Promise<DiscountRedemptionAllocation[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountRedemptionAllocation)
      .where(
        and(
          eq(discountRedemptionAllocation.storeId, this.storeId),
          inArray(
            discountRedemptionAllocation.redemptionId,
            [...new Set(ids)],
          ),
        ),
      )
      .orderBy(
        asc(discountRedemptionAllocation.redemptionId),
        asc(discountRedemptionAllocation.createdAt),
        asc(discountRedemptionAllocation.id),
      );
  }

  @ReadOnly()
  async getExternalReferencesByIds(
    ids: readonly string[],
  ): Promise<DiscountExternalReference[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(discountExternalReference)
      .where(
        and(
          eq(discountExternalReference.storeId, this.storeId),
          inArray(discountExternalReference.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getConnection(
    args: DiscountConnectionInput,
  ): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mappedWhere = mapVirtualWhereFields(where) as
      | DiscountRelayInput["where"]
      | undefined;
    const mergedWhere: DiscountRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(mappedWhere ? [mappedWhere] : []),
      ],
    };
    const executeInput: DiscountRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "updatedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      discountRelayQuery.execute(this.connection, executeInput),
      discountRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getCodeConnection(
    args: DiscountCodeRelayInput,
  ): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: DiscountCodeRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: DiscountCodeRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      discountCodeRelayQuery.execute(this.connection, executeInput),
      discountCodeRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getUsageReservationConnection(
    args: DiscountUsageReservationRelayInput,
  ): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: DiscountUsageReservationRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: DiscountUsageReservationRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      discountUsageReservationRelayQuery.execute(
        this.connection,
        executeInput,
      ),
      discountUsageReservationRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);

    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getRedemptionConnection(
    args: DiscountRedemptionRelayInput,
  ): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: DiscountRedemptionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: DiscountRedemptionRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "committedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      discountRedemptionRelayQuery.execute(this.connection, executeInput),
      discountRedemptionRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);

    return this.toConnectionResult(result, totalCount);
  }

  @ReadOnly()
  async getExternalReferenceConnection(
    args: DiscountExternalReferenceRelayInput,
  ): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: DiscountExternalReferenceRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: DiscountExternalReferenceRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "updatedAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      discountExternalReferenceRelayQuery.execute(
        this.connection,
        executeInput,
      ),
      discountExternalReferenceRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);

    return this.toConnectionResult(result, totalCount);
  }

  private toConnectionResult(
    result: { edges: Array<{ cursor: string; node: { id: string } }>; pageInfo: PageInfo },
    totalCount: number,
  ): DiscountConnectionResult {
    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }
}
