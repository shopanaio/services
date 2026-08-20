import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { ReadOnly } from "@shopana/shared-kernel";
import type { TransactionManager } from "@shopana/shared-kernel";
import { and, asc, eq, getViewSelectedFields, inArray, isNull } from "drizzle-orm";
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
  discountCode,
  discountCodeUsageCounter,
  discountCodeListView,
  discountCombinationClass,
  discountEligibleCustomer,
  discountEligibleSegment,
  discountExternalReference,
  discountFreeShipping,
  discountFunctionBinding,
  discountListView,
  discountMinimumRequirement,
  discountRedemption,
  discountRedemptionAllocation,
  discountTarget,
  discountTargetSelection,
  discountTag,
  discountUsageCounter,
  discountUsageReservation,
  discountUsageSummaryView,
  type Discount,
  type DiscountAmountOff,
  type DiscountBuyerContext,
  type DiscountBuyXGetY,
  type DiscountChannel,
  type DiscountCode,
  type DiscountCodeListView,
  type DiscountCodeUsageCounter,
  type DiscountCombinationClass,
  type DiscountEligibleCustomer,
  type DiscountEligibleSegment,
  type DiscountExternalReference,
  type NewDiscountExternalReference,
  type DiscountFreeShipping,
  type DiscountFunctionBinding,
  type NewDiscountFunctionBinding,
  type DiscountListView,
  type DiscountMinimumRequirement,
  type DiscountRedemption,
  type DiscountRedemptionAllocation,
  type DiscountTarget,
  type DiscountTargetSelection,
  type DiscountTag,
  type DiscountUsageCounter,
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
export type DiscountCodeRelayInput = InferRelayInput<typeof discountCodeRelayQuery>;
export type DiscountUsageReservationRelayInput = InferRelayInput<
  typeof discountUsageReservationRelayQuery
>;
export type DiscountRedemptionRelayInput = InferRelayInput<typeof discountRedemptionRelayQuery>;
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

export type DiscountReadModel = DiscountListView & Pick<Discount, "metadata">;

export type DiscountRuleReadModel =
  | { kind: "AMOUNT_OFF"; value: DiscountAmountOff }
  | { kind: "BUY_X_GET_Y"; value: DiscountBuyXGetY }
  | { kind: "FREE_SHIPPING"; value: DiscountFreeShipping };

export interface DiscountAggregate {
  discount: Discount;
  amountOff: DiscountAmountOff | null;
  buyXGetY: DiscountBuyXGetY | null;
  freeShipping: DiscountFreeShipping | null;
  minimumRequirement: DiscountMinimumRequirement | null;
  targetSelections: DiscountTargetSelection[];
  targets: DiscountTarget[];
  buyerContext: DiscountBuyerContext | null;
  eligibleCustomers: DiscountEligibleCustomer[];
  eligibleSegments: DiscountEligibleSegment[];
  codes: DiscountCode[];
  usageCounter: DiscountUsageCounter | null;
  codeUsageCounters: DiscountCodeUsageCounter[];
  tags: DiscountTag[];
  channels: DiscountChannel[];
  combinations: DiscountCombinationClass[];
  functionBinding: DiscountFunctionBinding | null;
}

export type DiscountRootPatch = Partial<
  Pick<
    Discount,
    | "title"
    | "priority"
    | "usageLimit"
    | "appliesOncePerCustomer"
    | "appliesOnOneTimePurchase"
    | "appliesOnSubscription"
    | "startsAt"
    | "endsAt"
    | "state"
    | "archivedAt"
    | "metadata"
  >
>;

export interface DiscountCreateWriteInput {
  id: string;
  method: Discount["method"];
  calculationStrategy: Discount["calculationStrategy"];
  kind: Discount["kind"];
  discountClass: Discount["discountClass"];
  title: string | null;
  currency: Discount["currency"];
  priority: number;
  usageLimit: bigint | null;
  appliesOncePerCustomer: boolean;
  appliesOnOneTimePurchase: boolean;
  appliesOnSubscription: boolean;
  startsAt?: string;
  endsAt: string | null;
  createdById: string | null;
  metadata: Record<string, unknown>;
}

export type DiscountRuleWriteInput =
  | {
      type: "amountOff";
      operation: "DECREASE";
      valueType: "PERCENTAGE" | "FIXED_AMOUNT";
      percentageBps: number | null;
      amountMinor: bigint | null;
      allocationMethod: "EACH" | "ACROSS";
      maximumDiscountMinor: bigint | null;
    }
  | {
      type: "buyXGetY";
      requirementType: "SUBTOTAL" | "QUANTITY";
      requiredQuantity: number | null;
      requiredSubtotalMinor: bigint | null;
      benefitQuantity: number;
      benefitStrategy: "ADJUSTMENT" | "FREE";
      benefitOperation: "DECREASE" | null;
      benefitValueType: "PERCENTAGE" | "FIXED_AMOUNT" | null;
      benefitPercentageBps: number | null;
      benefitAmountMinor: bigint | null;
      usesPerOrderLimit: number | null;
    }
  | {
      type: "freeShipping";
      maximumShippingPriceMinor: bigint | null;
    };

export interface DiscountMinimumRequirementWriteInput {
  requirementType: "SUBTOTAL" | "QUANTITY";
  subtotalMinor: bigint | null;
  quantity: number | null;
}

export interface DiscountTargetSelectionWriteInput {
  role: "QUALIFIER" | "BENEFIT";
  targetType: "ALL_PRODUCTS" | "PRODUCTS" | "VARIANTS" | "CATEGORIES";
  targetIds: string[];
}

export interface DiscountBuyerContextWriteInput {
  type: "ALL" | "CUSTOMERS" | "SEGMENTS";
  customerIds: string[];
  segmentIds: string[];
}

export interface DiscountCodeCreateWriteInput {
  code: string;
  usageLimit: bigint | null;
  metadata: Record<string, unknown>;
}

export interface DiscountCodeUpdateWriteInput {
  codeId: string;
  expectedUpdatedAt: string;
  patch: Partial<Pick<DiscountCode, "code" | "status" | "usageLimit" | "metadata" | "disabledAt">>;
}

export interface DiscountCodeDeleteWriteInput {
  codeId: string;
  expectedUpdatedAt: string;
}

export type DiscountExternalReferencePatch = Partial<
  Pick<
    NewDiscountExternalReference,
    | "externalSystem"
    | "externalType"
    | "externalId"
    | "externalUrl"
    | "direction"
    | "syncStatus"
    | "etag"
    | "contentChecksum"
    | "lastSyncedAt"
    | "lastError"
    | "metadata"
  >
>;

export type DiscountExternalReferenceMutationResult =
  | { status: "applied"; value: DiscountExternalReference }
  | { status: "not_found" }
  | { status: "conflict"; current: DiscountExternalReference };

export class DiscountCodeRevisionConflictError extends Error {
  constructor(public readonly codeId: string) {
    super("Discount code was modified by another user");
    this.name = "DiscountCodeRevisionConflictError";
  }
}

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

  async findAggregateById(id: string): Promise<DiscountAggregate | null> {
    const [root] = await this.connection
      .select()
      .from(discount)
      .where(and(eq(discount.storeId, this.storeId), eq(discount.id, id)))
      .limit(1);
    if (!root) return null;

    const [
      amountOffRows,
      buyXGetYRows,
      freeShippingRows,
      minimumRequirementRows,
      targetSelections,
      targets,
      buyerContextRows,
      eligibleCustomers,
      eligibleSegments,
      codes,
      usageCounterRows,
      codeUsageCounters,
      tags,
      channels,
      combinations,
      functionBindingRows,
    ] = await Promise.all([
      this.connection
        .select()
        .from(discountAmountOff)
        .where(
          and(eq(discountAmountOff.storeId, this.storeId), eq(discountAmountOff.discountId, id)),
        ),
      this.connection
        .select()
        .from(discountBuyXGetY)
        .where(
          and(eq(discountBuyXGetY.storeId, this.storeId), eq(discountBuyXGetY.discountId, id)),
        ),
      this.connection
        .select()
        .from(discountFreeShipping)
        .where(
          and(
            eq(discountFreeShipping.storeId, this.storeId),
            eq(discountFreeShipping.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountMinimumRequirement)
        .where(
          and(
            eq(discountMinimumRequirement.storeId, this.storeId),
            eq(discountMinimumRequirement.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountTargetSelection)
        .where(
          and(
            eq(discountTargetSelection.storeId, this.storeId),
            eq(discountTargetSelection.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountTarget)
        .where(and(eq(discountTarget.storeId, this.storeId), eq(discountTarget.discountId, id))),
      this.connection
        .select()
        .from(discountBuyerContext)
        .where(
          and(
            eq(discountBuyerContext.storeId, this.storeId),
            eq(discountBuyerContext.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountEligibleCustomer)
        .where(
          and(
            eq(discountEligibleCustomer.storeId, this.storeId),
            eq(discountEligibleCustomer.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountEligibleSegment)
        .where(
          and(
            eq(discountEligibleSegment.storeId, this.storeId),
            eq(discountEligibleSegment.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountCode)
        .where(and(eq(discountCode.storeId, this.storeId), eq(discountCode.discountId, id))),
      this.connection
        .select()
        .from(discountUsageCounter)
        .where(
          and(
            eq(discountUsageCounter.storeId, this.storeId),
            eq(discountUsageCounter.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountCodeUsageCounter)
        .where(
          and(
            eq(discountCodeUsageCounter.storeId, this.storeId),
            eq(discountCodeUsageCounter.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountTag)
        .where(and(eq(discountTag.storeId, this.storeId), eq(discountTag.discountId, id))),
      this.connection
        .select()
        .from(discountChannel)
        .where(and(eq(discountChannel.storeId, this.storeId), eq(discountChannel.discountId, id))),
      this.connection
        .select()
        .from(discountCombinationClass)
        .where(
          and(
            eq(discountCombinationClass.storeId, this.storeId),
            eq(discountCombinationClass.discountId, id),
          ),
        ),
      this.connection
        .select()
        .from(discountFunctionBinding)
        .where(
          and(
            eq(discountFunctionBinding.storeId, this.storeId),
            eq(discountFunctionBinding.discountId, id),
          ),
        ),
    ]);

    return {
      discount: root,
      amountOff: amountOffRows[0] ?? null,
      buyXGetY: buyXGetYRows[0] ?? null,
      freeShipping: freeShippingRows[0] ?? null,
      minimumRequirement: minimumRequirementRows[0] ?? null,
      targetSelections,
      targets,
      buyerContext: buyerContextRows[0] ?? null,
      eligibleCustomers,
      eligibleSegments,
      codes,
      usageCounter: usageCounterRows[0] ?? null,
      codeUsageCounters,
      tags,
      channels,
      combinations,
      functionBinding: functionBindingRows[0] ?? null,
    };
  }

  async create(input: DiscountCreateWriteInput): Promise<{ discount: Discount; created: boolean }> {
    const rows = await this.connection
      .insert(discount)
      .values({
        ...input,
        storeId: this.storeId,
        state: "DRAFT",
      })
      .onConflictDoNothing({ target: discount.id })
      .returning();

    if (rows[0]) {
      await this.connection.insert(discountUsageCounter).values({
        discountId: rows[0].id,
        storeId: this.storeId,
      });
      return { discount: rows[0], created: true };
    }

    const [existing] = await this.connection
      .select()
      .from(discount)
      .where(and(eq(discount.storeId, this.storeId), eq(discount.id, input.id)))
      .limit(1);
    if (!existing) {
      throw new Error("Discount ID conflict belongs to another store");
    }
    return { discount: existing, created: false };
  }

  async createFunctionBinding(
    input: Omit<NewDiscountFunctionBinding, "id" | "storeId" | "createdAt" | "updatedAt">,
  ): Promise<DiscountFunctionBinding> {
    const [row] = await this.connection
      .insert(discountFunctionBinding)
      .values({ ...input, storeId: this.storeId })
      .returning();
    if (!row) throw new Error("Failed to create discount function binding");
    return row;
  }

  async updateFunctionBinding(
    discountId: string,
    patch: Pick<
      NewDiscountFunctionBinding,
      | "installationId"
      | "functionKey"
      | "precedence"
      | "activationSequence"
      | "status"
      | "failureMode"
      | "configurationSnapshot"
      | "configurationRevision"
      | "routeRevision"
    >,
  ): Promise<void> {
    const rows = await this.connection
      .update(discountFunctionBinding)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(discountFunctionBinding.storeId, this.storeId),
          eq(discountFunctionBinding.discountId, discountId),
        ),
      )
      .returning({ id: discountFunctionBinding.id });
    if (rows.length !== 1) {
      throw new Error("Failed to update discount function binding");
    }
  }

  async hasUsageHistory(id: string): Promise<boolean> {
    const [reservations, redemptions] = await Promise.all([
      this.connection
        .select({ id: discountUsageReservation.id })
        .from(discountUsageReservation)
        .where(
          and(
            eq(discountUsageReservation.storeId, this.storeId),
            eq(discountUsageReservation.discountId, id),
          ),
        )
        .limit(1),
      this.connection
        .select({ id: discountRedemption.id })
        .from(discountRedemption)
        .where(
          and(eq(discountRedemption.storeId, this.storeId), eq(discountRedemption.discountId, id)),
        )
        .limit(1),
    ]);
    return reservations.length > 0 || redemptions.length > 0;
  }

  async deleteDraft(id: string, expectedRevision: number): Promise<boolean> {
    const rows = await this.connection
      .delete(discount)
      .where(
        and(
          eq(discount.storeId, this.storeId),
          eq(discount.id, id),
          eq(discount.state, "DRAFT"),
          eq(discount.revision, expectedRevision),
        ),
      )
      .returning({ id: discount.id });
    return rows.length > 0;
  }

  async updateRoot(id: string, patch: DiscountRootPatch): Promise<boolean> {
    if (Object.keys(patch).length === 0) return false;
    const rows = await this.connection
      .update(discount)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(and(eq(discount.storeId, this.storeId), eq(discount.id, id)))
      .returning({ id: discount.id });
    return rows.length > 0;
  }

  async replaceRule(id: string, input: DiscountRuleWriteInput): Promise<void> {
    await this.connection
      .delete(discountAmountOff)
      .where(
        and(eq(discountAmountOff.storeId, this.storeId), eq(discountAmountOff.discountId, id)),
      );
    await this.connection
      .delete(discountBuyXGetY)
      .where(and(eq(discountBuyXGetY.storeId, this.storeId), eq(discountBuyXGetY.discountId, id)));
    await this.connection
      .delete(discountFreeShipping)
      .where(
        and(
          eq(discountFreeShipping.storeId, this.storeId),
          eq(discountFreeShipping.discountId, id),
        ),
      );

    if (input.type === "amountOff") {
      await this.connection.insert(discountAmountOff).values({
        discountId: id,
        storeId: this.storeId,
        operation: input.operation,
        valueType: input.valueType,
        percentageBps: input.percentageBps,
        amountMinor: input.amountMinor,
        allocationMethod: input.allocationMethod,
        maximumDiscountMinor: input.maximumDiscountMinor,
      });
    } else if (input.type === "buyXGetY") {
      await this.connection.insert(discountBuyXGetY).values({
        discountId: id,
        storeId: this.storeId,
        requirementType: input.requirementType,
        requiredQuantity: input.requiredQuantity,
        requiredSubtotalMinor: input.requiredSubtotalMinor,
        benefitQuantity: input.benefitQuantity,
        benefitStrategy: input.benefitStrategy,
        benefitOperation: input.benefitOperation,
        benefitValueType: input.benefitValueType,
        benefitPercentageBps: input.benefitPercentageBps,
        benefitAmountMinor: input.benefitAmountMinor,
        usesPerOrderLimit: input.usesPerOrderLimit,
      });
    } else {
      await this.connection.insert(discountFreeShipping).values({
        discountId: id,
        storeId: this.storeId,
        maximumShippingPriceMinor: input.maximumShippingPriceMinor,
      });
    }
  }

  async replaceMinimumRequirement(
    id: string,
    input: DiscountMinimumRequirementWriteInput | null,
  ): Promise<void> {
    await this.connection
      .delete(discountMinimumRequirement)
      .where(
        and(
          eq(discountMinimumRequirement.storeId, this.storeId),
          eq(discountMinimumRequirement.discountId, id),
        ),
      );
    if (!input) return;
    await this.connection.insert(discountMinimumRequirement).values({
      discountId: id,
      storeId: this.storeId,
      ...input,
    });
  }

  async replaceTargetSelections(
    id: string,
    items: DiscountTargetSelectionWriteInput[],
  ): Promise<void> {
    await this.connection
      .delete(discountTargetSelection)
      .where(
        and(
          eq(discountTargetSelection.storeId, this.storeId),
          eq(discountTargetSelection.discountId, id),
        ),
      );
    if (items.length === 0) return;
    await this.connection.insert(discountTargetSelection).values(
      items.map((item) => ({
        discountId: id,
        storeId: this.storeId,
        role: item.role,
        targetType: item.targetType,
      })),
    );
    const targets = items.flatMap((item) =>
      item.targetIds.map((targetId) => ({
        discountId: id,
        storeId: this.storeId,
        role: item.role,
        targetType: item.targetType,
        targetId,
      })),
    );
    if (targets.length > 0) {
      await this.connection.insert(discountTarget).values(targets);
    }
  }

  async replaceBuyerContext(id: string, input: DiscountBuyerContextWriteInput): Promise<void> {
    await this.connection
      .delete(discountBuyerContext)
      .where(
        and(
          eq(discountBuyerContext.storeId, this.storeId),
          eq(discountBuyerContext.discountId, id),
        ),
      );
    await this.connection.insert(discountBuyerContext).values({
      discountId: id,
      storeId: this.storeId,
      contextType: input.type,
    });
    if (input.customerIds.length > 0) {
      await this.connection.insert(discountEligibleCustomer).values(
        input.customerIds.map((customerId) => ({
          discountId: id,
          storeId: this.storeId,
          customerId,
        })),
      );
    }
    if (input.segmentIds.length > 0) {
      await this.connection.insert(discountEligibleSegment).values(
        input.segmentIds.map((segmentId) => ({
          discountId: id,
          storeId: this.storeId,
          segmentId,
        })),
      );
    }
  }

  async applyCodeChanges(
    id: string,
    input: {
      create: DiscountCodeCreateWriteInput[];
      update: DiscountCodeUpdateWriteInput[];
      delete: DiscountCodeDeleteWriteInput[];
    },
  ): Promise<void> {
    for (const item of input.update) {
      if (item.patch.code === undefined) continue;
      const rows = await this.connection
        .update(discountCode)
        .set({ code: `__SHOPANA_CODE_UPDATE_${item.codeId}` })
        .where(
          and(
            eq(discountCode.storeId, this.storeId),
            eq(discountCode.discountId, id),
            eq(discountCode.id, item.codeId),
            eq(discountCode.updatedAt, item.expectedUpdatedAt),
          ),
        )
        .returning({ id: discountCode.id });
      if (rows.length === 0) {
        throw new DiscountCodeRevisionConflictError(item.codeId);
      }
    }

    for (const item of input.delete) {
      const rows = await this.connection
        .delete(discountCode)
        .where(
          and(
            eq(discountCode.storeId, this.storeId),
            eq(discountCode.discountId, id),
            eq(discountCode.id, item.codeId),
            eq(discountCode.updatedAt, item.expectedUpdatedAt),
          ),
        )
        .returning({ id: discountCode.id });
      if (rows.length === 0) {
        throw new DiscountCodeRevisionConflictError(item.codeId);
      }
    }

    if (input.create.length > 0) {
      const ids = await this.generateUuidV7s(input.create.length);
      await this.connection.insert(discountCode).values(
        input.create.map((item, index) => ({
          id: ids[index],
          discountId: id,
          storeId: this.storeId,
          code: item.code,
          usageLimit: item.usageLimit,
          metadata: item.metadata,
        })),
      );
      await this.connection.insert(discountCodeUsageCounter).values(
        ids.map((codeId) => ({
          codeId,
          discountId: id,
          storeId: this.storeId,
        })),
      );
    }

    for (const item of input.update) {
      const rows = await this.connection
        .update(discountCode)
        .set({ ...item.patch, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(discountCode.storeId, this.storeId),
            eq(discountCode.discountId, id),
            eq(discountCode.id, item.codeId),
            eq(discountCode.updatedAt, item.expectedUpdatedAt),
          ),
        )
        .returning({ id: discountCode.id });
      if (rows.length === 0) {
        throw new DiscountCodeRevisionConflictError(item.codeId);
      }
    }
  }

  async replaceTags(id: string, items: string[]): Promise<void> {
    await this.connection
      .delete(discountTag)
      .where(and(eq(discountTag.storeId, this.storeId), eq(discountTag.discountId, id)));
    if (items.length === 0) return;
    await this.connection
      .insert(discountTag)
      .values(items.map((tag) => ({ discountId: id, storeId: this.storeId, tag })));
  }

  async replaceChannels(
    id: string,
    items: Array<{ code: string; featured: boolean }>,
  ): Promise<void> {
    await this.connection
      .delete(discountChannel)
      .where(and(eq(discountChannel.storeId, this.storeId), eq(discountChannel.discountId, id)));
    if (items.length === 0) return;
    await this.connection.insert(discountChannel).values(
      items.map((item) => ({
        discountId: id,
        storeId: this.storeId,
        channelCode: item.code,
        isFeatured: item.featured,
      })),
    );
  }

  async replaceCombinations(
    id: string,
    items: Array<"PRODUCT" | "ORDER" | "SHIPPING">,
  ): Promise<void> {
    await this.connection
      .delete(discountCombinationClass)
      .where(
        and(
          eq(discountCombinationClass.storeId, this.storeId),
          eq(discountCombinationClass.discountId, id),
        ),
      );
    if (items.length === 0) return;
    await this.connection.insert(discountCombinationClass).values(
      items.map((combinesWithClass) => ({
        discountId: id,
        storeId: this.storeId,
        combinesWithClass,
      })),
    );
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
        and(eq(discount.storeId, discountListView.storeId), eq(discount.id, discountListView.id)),
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
  async getRulesByDiscountIds(ids: readonly string[]): Promise<DiscountRuleReadModel[]> {
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
      ...amountOffRows.map((value): DiscountRuleReadModel => ({ kind: "AMOUNT_OFF", value })),
      ...buyXGetYRows.map((value): DiscountRuleReadModel => ({ kind: "BUY_X_GET_Y", value })),
      ...freeShippingRows.map((value): DiscountRuleReadModel => ({ kind: "FREE_SHIPPING", value })),
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
      .orderBy(asc(discountTargetSelection.discountId), asc(discountTargetSelection.role));
  }

  @ReadOnly()
  async getTargetsByDiscountIds(ids: readonly string[]): Promise<DiscountTarget[]> {
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
  async getBuyerContextsByDiscountIds(ids: readonly string[]): Promise<DiscountBuyerContext[]> {
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
      .orderBy(asc(discountEligibleCustomer.discountId), asc(discountEligibleCustomer.customerId));
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
      .orderBy(asc(discountEligibleSegment.discountId), asc(discountEligibleSegment.segmentId));
  }

  @ReadOnly()
  async getChannelsByDiscountIds(ids: readonly string[]): Promise<DiscountChannel[]> {
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
      .orderBy(asc(discountChannel.discountId), asc(discountChannel.channelCode));
  }

  @ReadOnly()
  async getCombinationsByDiscountIds(ids: readonly string[]): Promise<DiscountCombinationClass[]> {
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
  async getUsageReservationsByIds(ids: readonly string[]): Promise<DiscountUsageReservation[]> {
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
  async getRedemptionsByIds(ids: readonly string[]): Promise<DiscountRedemption[]> {
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
          inArray(discountRedemptionAllocation.redemptionId, [...new Set(ids)]),
        ),
      )
      .orderBy(
        asc(discountRedemptionAllocation.redemptionId),
        asc(discountRedemptionAllocation.createdAt),
        asc(discountRedemptionAllocation.id),
      );
  }

  @ReadOnly()
  async getExternalReferencesByIds(ids: readonly string[]): Promise<DiscountExternalReference[]> {
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
  async findExternalReferenceById(
    id: string,
    includeDeleted = false,
  ): Promise<DiscountExternalReference | null> {
    const rows = await this.connection
      .select()
      .from(discountExternalReference)
      .where(
        and(
          eq(discountExternalReference.storeId, this.storeId),
          eq(discountExternalReference.id, id),
          ...(includeDeleted ? [] : [isNull(discountExternalReference.deletedAt)]),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async createExternalReference(
    input: { id: string } & Omit<
      NewDiscountExternalReference,
      "id" | "storeId" | "createdAt" | "updatedAt" | "deletedAt"
    >,
  ): Promise<DiscountExternalReference> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(discountExternalReference)
      .values({
        ...input,
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoNothing({ target: discountExternalReference.id })
      .returning();
    if (rows[0]) return rows[0];

    const existing = await this.findExternalReferenceById(input.id, true);
    if (!existing) {
      throw new Error("External reference ID conflict belongs to another store");
    }
    return existing;
  }

  async updateExternalReference(
    id: string,
    expectedUpdatedAt: string,
    patch: DiscountExternalReferencePatch,
  ): Promise<DiscountExternalReferenceMutationResult> {
    const rows = await this.connection
      .update(discountExternalReference)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(discountExternalReference.storeId, this.storeId),
          eq(discountExternalReference.id, id),
          eq(discountExternalReference.updatedAt, expectedUpdatedAt),
          isNull(discountExternalReference.deletedAt),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return this.externalReferenceMutationMiss(id);
  }

  async deleteExternalReference(input: {
    id: string;
    expectedUpdatedAt: string;
    permanent: boolean;
  }): Promise<DiscountExternalReferenceMutationResult> {
    const conditions = and(
      eq(discountExternalReference.storeId, this.storeId),
      eq(discountExternalReference.id, input.id),
      eq(discountExternalReference.updatedAt, input.expectedUpdatedAt),
      isNull(discountExternalReference.deletedAt),
    );
    const rows = input.permanent
      ? await this.connection.delete(discountExternalReference).where(conditions).returning()
      : await this.connection
          .update(discountExternalReference)
          .set({
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(conditions)
          .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    return this.externalReferenceMutationMiss(input.id);
  }

  private async externalReferenceMutationMiss(
    id: string,
  ): Promise<DiscountExternalReferenceMutationResult> {
    const current = await this.findExternalReferenceById(id, true);
    return current ? { status: "conflict", current } : { status: "not_found" };
  }

  @ReadOnly()
  async getConnection(args: DiscountConnectionInput): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mappedWhere = mapVirtualWhereFields(where) as DiscountRelayInput["where"] | undefined;
    const mergedWhere: DiscountRelayInput["where"] = {
      _and: [{ storeId: { _eq: this.storeId } }, ...(mappedWhere ? [mappedWhere] : [])],
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
  async getCodeConnection(args: DiscountCodeRelayInput): Promise<DiscountConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: DiscountCodeRelayInput["where"] = {
      _and: [{ storeId: { _eq: this.storeId } }, ...(where ? [where] : [])],
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
      _and: [{ storeId: { _eq: this.storeId } }, ...(where ? [where] : [])],
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
      discountUsageReservationRelayQuery.execute(this.connection, executeInput),
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
      _and: [{ storeId: { _eq: this.storeId } }, ...(where ? [where] : [])],
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
      _and: [{ storeId: { _eq: this.storeId } }, ...(where ? [where] : [])],
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
      discountExternalReferenceRelayQuery.execute(this.connection, executeInput),
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
