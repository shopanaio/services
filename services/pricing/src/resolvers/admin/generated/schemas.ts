import { z } from 'zod'
import { BigIntFilter, BooleanFilter, CurrencyCode, DateTimeFilter, DimensionUnit, DiscountAllocationMethod, DiscountAllocationTargetType, DiscountAmountOffRuleInput, DiscountBuyXGetYRuleInput, DiscountBuyerContextInput, DiscountBuyerContextType, DiscountChannelInput, DiscountClass, DiscountClassFilter, DiscountCodeCreateOperationInput, DiscountCodeDeleteOperationInput, DiscountCodeOrderByInput, DiscountCodeOrderField, DiscountCodeStatus, DiscountCodeStatusFilter, DiscountCodeUpdateOperationInput, DiscountCodeWhereInput, DiscountCodesUpdateInput, DiscountCreateInput, DiscountCurrencyFilter, DiscountDefinitionUpdateInput, DiscountDeleteInput, DiscountEffectiveStatus, DiscountEffectiveStatusFilter, DiscountExternalReferenceCreateInput, DiscountExternalReferenceDeleteInput, DiscountExternalReferenceIdentityInput, DiscountExternalReferenceOrderByInput, DiscountExternalReferenceOrderField, DiscountExternalReferenceSyncInput, DiscountExternalReferenceUpdateInput, DiscountExternalReferenceWhereInput, DiscountExternalSyncDirection, DiscountExternalSyncDirectionFilter, DiscountExternalSyncStatus, DiscountExternalSyncStatusFilter, DiscountFreeShippingRuleInput, DiscountKind, DiscountKindFilter, DiscountLifecycleUpdateInput, DiscountMethod, DiscountMethodFilter, DiscountMinimumRequirementInput, DiscountMinimumRequirementSyncInput, DiscountOperationType, DiscountOrderByInput, DiscountOrderField, DiscountPurchaseModesInput, DiscountRedemptionOrderByInput, DiscountRedemptionOrderField, DiscountRedemptionStatus, DiscountRedemptionStatusFilter, DiscountRedemptionWhereInput, DiscountReferenceStatus, DiscountRequirementType, DiscountReservationStatus, DiscountReservationStatusFilter, DiscountRuleInput, DiscountScheduleInput, DiscountState, DiscountStateFilter, DiscountTargetRole, DiscountTargetSelectionInput, DiscountTargetType, DiscountUpdateInput, DiscountUsageLimitsInput, DiscountUsageReservationOrderByInput, DiscountUsageReservationOrderField, DiscountUsageReservationWhereInput, DiscountValueType, DiscountWhereInput, IdFilter, IntFilter, LocaleCode, SortDirection, StringFilter, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const DiscountAllocationMethodSchema = z.nativeEnum(DiscountAllocationMethod);

export const DiscountAllocationTargetTypeSchema = z.nativeEnum(DiscountAllocationTargetType);

export const DiscountBuyerContextTypeSchema = z.nativeEnum(DiscountBuyerContextType);

export const DiscountClassSchema = z.nativeEnum(DiscountClass);

export const DiscountCodeOrderFieldSchema = z.nativeEnum(DiscountCodeOrderField);

export const DiscountCodeStatusSchema = z.nativeEnum(DiscountCodeStatus);

export const DiscountEffectiveStatusSchema = z.nativeEnum(DiscountEffectiveStatus);

export const DiscountExternalReferenceOrderFieldSchema = z.nativeEnum(DiscountExternalReferenceOrderField);

export const DiscountExternalSyncDirectionSchema = z.nativeEnum(DiscountExternalSyncDirection);

export const DiscountExternalSyncStatusSchema = z.nativeEnum(DiscountExternalSyncStatus);

export const DiscountKindSchema = z.nativeEnum(DiscountKind);

export const DiscountMethodSchema = z.nativeEnum(DiscountMethod);

export const DiscountOperationTypeSchema = z.nativeEnum(DiscountOperationType);

export const DiscountOrderFieldSchema = z.nativeEnum(DiscountOrderField);

export const DiscountRedemptionOrderFieldSchema = z.nativeEnum(DiscountRedemptionOrderField);

export const DiscountRedemptionStatusSchema = z.nativeEnum(DiscountRedemptionStatus);

export const DiscountReferenceStatusSchema = z.nativeEnum(DiscountReferenceStatus);

export const DiscountRequirementTypeSchema = z.nativeEnum(DiscountRequirementType);

export const DiscountReservationStatusSchema = z.nativeEnum(DiscountReservationStatus);

export const DiscountStateSchema = z.nativeEnum(DiscountState);

export const DiscountTargetRoleSchema = z.nativeEnum(DiscountTargetRole);

export const DiscountTargetTypeSchema = z.nativeEnum(DiscountTargetType);

export const DiscountUsageReservationOrderFieldSchema = z.nativeEnum(DiscountUsageReservationOrderField);

export const DiscountValueTypeSchema = z.nativeEnum(DiscountValueType);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function BigIntFilterSchema(): z.ZodObject<Properties<BigIntFilter>> {
  return z.object({
    _between: z.array(z.string()).nullish(),
    _eq: z.string().nullish(),
    _gt: z.string().nullish(),
    _gte: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.string().nullish(),
    _lte: z.string().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function BooleanFilterSchema(): z.ZodObject<Properties<BooleanFilter>> {
  return z.object({
    _eq: z.boolean().nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.boolean().nullish()
  })
}

export function DateTimeFilterSchema(): z.ZodObject<Properties<DateTimeFilter>> {
  return z.object({
    _between: z.array(z.string()).nullish(),
    _eq: z.string().nullish(),
    _gt: z.string().nullish(),
    _gte: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.string().nullish(),
    _lte: z.string().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function DiscountAmountOffRuleInputSchema(): z.ZodObject<Properties<DiscountAmountOffRuleInput>> {
  return z.object({
    allocationMethod: DiscountAllocationMethodSchema.nullish(),
    amountMinor: z.string().nullish(),
    maximumDiscountMinor: z.string().nullish(),
    percentageBps: z.number().nullish(),
    valueType: DiscountValueTypeSchema
  })
}

export function DiscountBuyXGetYRuleInputSchema(): z.ZodObject<Properties<DiscountBuyXGetYRuleInput>> {
  return z.object({
    benefitAmountMinor: z.string().nullish(),
    benefitPercentageBps: z.number().nullish(),
    benefitQuantity: z.number(),
    benefitValueType: DiscountValueTypeSchema,
    requiredQuantity: z.number().nullish(),
    requiredSubtotalMinor: z.string().nullish(),
    requirementType: DiscountRequirementTypeSchema,
    usesPerOrderLimit: z.number().nullish()
  })
}

export function DiscountBuyerContextInputSchema(): z.ZodObject<Properties<DiscountBuyerContextInput>> {
  return z.object({
    customerIds: z.array(z.string()).nullish(),
    segmentIds: z.array(z.string()).nullish(),
    type: DiscountBuyerContextTypeSchema
  })
}

export function DiscountChannelInputSchema(): z.ZodObject<Properties<DiscountChannelInput>> {
  return z.object({
    code: z.string(),
    featured: z.boolean().default(false).nullish()
  })
}

export function DiscountClassFilterSchema(): z.ZodObject<Properties<DiscountClassFilter>> {
  return z.object({
    _eq: DiscountClassSchema.nullish(),
    _in: z.array(DiscountClassSchema).nullish(),
    _neq: DiscountClassSchema.nullish(),
    _notIn: z.array(DiscountClassSchema).nullish()
  })
}

export function DiscountCodeCreateOperationInputSchema(): z.ZodObject<Properties<DiscountCodeCreateOperationInput>> {
  return z.object({
    clientMutationId: z.string().nullish(),
    code: z.string(),
    metadata: z.record(z.unknown()).nullish(),
    usageLimit: z.string().nullish()
  })
}

export function DiscountCodeDeleteOperationInputSchema(): z.ZodObject<Properties<DiscountCodeDeleteOperationInput>> {
  return z.object({
    codeId: z.string(),
    expectedUpdatedAt: z.string()
  })
}

export function DiscountCodeOrderByInputSchema(): z.ZodObject<Properties<DiscountCodeOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: DiscountCodeOrderFieldSchema
  })
}

export function DiscountCodeStatusFilterSchema(): z.ZodObject<Properties<DiscountCodeStatusFilter>> {
  return z.object({
    _eq: DiscountCodeStatusSchema.nullish(),
    _in: z.array(DiscountCodeStatusSchema).nullish(),
    _neq: DiscountCodeStatusSchema.nullish(),
    _notIn: z.array(DiscountCodeStatusSchema).nullish()
  })
}

export function DiscountCodeUpdateOperationInputSchema(): z.ZodObject<Properties<DiscountCodeUpdateOperationInput>> {
  return z.object({
    code: z.string().nullish(),
    codeId: z.string(),
    expectedUpdatedAt: z.string(),
    metadata: z.record(z.unknown()).nullish(),
    status: DiscountCodeStatusSchema.nullish(),
    usageLimit: z.string().nullish()
  })
}

export function DiscountCodeWhereInputSchema(): z.ZodObject<Properties<DiscountCodeWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => DiscountCodeWhereInputSchema())).nullish(),
    _not: z.lazy(() => DiscountCodeWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => DiscountCodeWhereInputSchema())).nullish(),
    code: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    disabledAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    discountId: z.lazy(() => IdFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    normalizedCode: z.lazy(() => StringFilterSchema().nullish()),
    remainingCount: z.lazy(() => BigIntFilterSchema().nullish()),
    reservedCount: z.lazy(() => BigIntFilterSchema().nullish()),
    status: z.lazy(() => DiscountCodeStatusFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    usageCount: z.lazy(() => BigIntFilterSchema().nullish()),
    usageLimit: z.lazy(() => BigIntFilterSchema().nullish())
  })
}

export function DiscountCodesUpdateInputSchema(): z.ZodObject<Properties<DiscountCodesUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => DiscountCodeCreateOperationInputSchema())).nullish(),
    delete: z.array(z.lazy(() => DiscountCodeDeleteOperationInputSchema())).nullish(),
    update: z.array(z.lazy(() => DiscountCodeUpdateOperationInputSchema())).nullish()
  })
}

export function DiscountCreateInputSchema(): z.ZodObject<Properties<DiscountCreateInput>> {
  return z.object({
    buyerContext: z.lazy(() => DiscountBuyerContextInputSchema().nullish()),
    channels: z.array(z.lazy(() => DiscountChannelInputSchema())).nullish(),
    codes: z.array(z.lazy(() => DiscountCodeCreateOperationInputSchema())).nullish(),
    combinesWith: z.array(DiscountClassSchema).nullish(),
    currency: CurrencyCodeSchema,
    kind: DiscountKindSchema,
    metadata: z.record(z.unknown()).nullish(),
    method: DiscountMethodSchema,
    minimumRequirement: z.lazy(() => DiscountMinimumRequirementInputSchema().nullish()),
    priority: z.number().default(0).nullish(),
    purchaseModes: z.lazy(() => DiscountPurchaseModesInputSchema().nullish()),
    rule: z.lazy(() => DiscountRuleInputSchema().nullish()),
    schedule: z.lazy(() => DiscountScheduleInputSchema().nullish()),
    state: DiscountStateSchema.nullish(),
    tags: z.array(z.string()).nullish(),
    targetSelections: z.array(z.lazy(() => DiscountTargetSelectionInputSchema())).nullish(),
    title: z.string().nullish(),
    usage: z.lazy(() => DiscountUsageLimitsInputSchema().nullish())
  })
}

export function DiscountCurrencyFilterSchema(): z.ZodObject<Properties<DiscountCurrencyFilter>> {
  return z.object({
    _eq: CurrencyCodeSchema.nullish(),
    _in: z.array(CurrencyCodeSchema).nullish(),
    _neq: CurrencyCodeSchema.nullish(),
    _notIn: z.array(CurrencyCodeSchema).nullish()
  })
}

export function DiscountDefinitionUpdateInputSchema(): z.ZodObject<Properties<DiscountDefinitionUpdateInput>> {
  return z.object({
    priority: z.number().nullish(),
    purchaseModes: z.lazy(() => DiscountPurchaseModesInputSchema().nullish()),
    schedule: z.lazy(() => DiscountScheduleInputSchema().nullish()),
    title: z.string().nullish(),
    usage: z.lazy(() => DiscountUsageLimitsInputSchema().nullish())
  })
}

export function DiscountDeleteInputSchema(): z.ZodObject<Properties<DiscountDeleteInput>> {
  return z.object({
    expectedRevision: z.number(),
    id: z.string()
  })
}

export function DiscountEffectiveStatusFilterSchema(): z.ZodObject<Properties<DiscountEffectiveStatusFilter>> {
  return z.object({
    _eq: DiscountEffectiveStatusSchema.nullish(),
    _in: z.array(DiscountEffectiveStatusSchema).nullish(),
    _neq: DiscountEffectiveStatusSchema.nullish(),
    _notIn: z.array(DiscountEffectiveStatusSchema).nullish()
  })
}

export function DiscountExternalReferenceCreateInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceCreateInput>> {
  return z.object({
    direction: DiscountExternalSyncDirectionSchema,
    discountId: z.string(),
    externalId: z.string(),
    externalSystem: z.string(),
    externalType: z.string().default("discount").nullish(),
    externalUrl: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish()
  })
}

export function DiscountExternalReferenceDeleteInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceDeleteInput>> {
  return z.object({
    expectedUpdatedAt: z.string(),
    id: z.string(),
    permanent: z.boolean().default(false).nullish()
  })
}

export function DiscountExternalReferenceIdentityInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceIdentityInput>> {
  return z.object({
    externalId: z.string().nullish(),
    externalSystem: z.string().nullish(),
    externalType: z.string().nullish(),
    externalUrl: z.string().nullish()
  })
}

export function DiscountExternalReferenceOrderByInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: DiscountExternalReferenceOrderFieldSchema
  })
}

export function DiscountExternalReferenceSyncInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceSyncInput>> {
  return z.object({
    contentChecksum: z.string().nullish(),
    direction: DiscountExternalSyncDirectionSchema.nullish(),
    etag: z.string().nullish(),
    lastError: z.string().nullish(),
    lastSyncedAt: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    status: DiscountExternalSyncStatusSchema.nullish()
  })
}

export function DiscountExternalReferenceUpdateInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceUpdateInput>> {
  return z.object({
    identity: z.lazy(() => DiscountExternalReferenceIdentityInputSchema().nullish()),
    sync: z.lazy(() => DiscountExternalReferenceSyncInputSchema().nullish())
  })
}

export function DiscountExternalReferenceWhereInputSchema(): z.ZodObject<Properties<DiscountExternalReferenceWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => DiscountExternalReferenceWhereInputSchema())).nullish(),
    _not: z.lazy(() => DiscountExternalReferenceWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => DiscountExternalReferenceWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    deletedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    direction: z.lazy(() => DiscountExternalSyncDirectionFilterSchema().nullish()),
    discountId: z.lazy(() => IdFilterSchema().nullish()),
    externalId: z.lazy(() => StringFilterSchema().nullish()),
    externalSystem: z.lazy(() => StringFilterSchema().nullish()),
    externalType: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    lastSyncedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    syncStatus: z.lazy(() => DiscountExternalSyncStatusFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function DiscountExternalSyncDirectionFilterSchema(): z.ZodObject<Properties<DiscountExternalSyncDirectionFilter>> {
  return z.object({
    _eq: DiscountExternalSyncDirectionSchema.nullish(),
    _in: z.array(DiscountExternalSyncDirectionSchema).nullish(),
    _neq: DiscountExternalSyncDirectionSchema.nullish(),
    _notIn: z.array(DiscountExternalSyncDirectionSchema).nullish()
  })
}

export function DiscountExternalSyncStatusFilterSchema(): z.ZodObject<Properties<DiscountExternalSyncStatusFilter>> {
  return z.object({
    _eq: DiscountExternalSyncStatusSchema.nullish(),
    _in: z.array(DiscountExternalSyncStatusSchema).nullish(),
    _neq: DiscountExternalSyncStatusSchema.nullish(),
    _notIn: z.array(DiscountExternalSyncStatusSchema).nullish()
  })
}

export function DiscountFreeShippingRuleInputSchema(): z.ZodObject<Properties<DiscountFreeShippingRuleInput>> {
  return z.object({
    maximumShippingPriceMinor: z.string().nullish()
  })
}

export function DiscountKindFilterSchema(): z.ZodObject<Properties<DiscountKindFilter>> {
  return z.object({
    _eq: DiscountKindSchema.nullish(),
    _in: z.array(DiscountKindSchema).nullish(),
    _neq: DiscountKindSchema.nullish(),
    _notIn: z.array(DiscountKindSchema).nullish()
  })
}

export function DiscountLifecycleUpdateInputSchema(): z.ZodObject<Properties<DiscountLifecycleUpdateInput>> {
  return z.object({
    state: DiscountStateSchema
  })
}

export function DiscountMethodFilterSchema(): z.ZodObject<Properties<DiscountMethodFilter>> {
  return z.object({
    _eq: DiscountMethodSchema.nullish(),
    _in: z.array(DiscountMethodSchema).nullish(),
    _neq: DiscountMethodSchema.nullish(),
    _notIn: z.array(DiscountMethodSchema).nullish()
  })
}

export function DiscountMinimumRequirementInputSchema(): z.ZodObject<Properties<DiscountMinimumRequirementInput>> {
  return z.object({
    quantity: z.number().nullish(),
    requirementType: DiscountRequirementTypeSchema,
    subtotalMinor: z.string().nullish()
  })
}

export function DiscountMinimumRequirementSyncInputSchema(): z.ZodObject<Properties<DiscountMinimumRequirementSyncInput>> {
  return z.object({
    requirement: z.lazy(() => DiscountMinimumRequirementInputSchema().nullish())
  })
}

export function DiscountOrderByInputSchema(): z.ZodObject<Properties<DiscountOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: DiscountOrderFieldSchema
  })
}

export function DiscountPurchaseModesInputSchema(): z.ZodObject<Properties<DiscountPurchaseModesInput>> {
  return z.object({
    appliesOnOneTimePurchase: z.boolean(),
    appliesOnSubscription: z.boolean()
  })
}

export function DiscountRedemptionOrderByInputSchema(): z.ZodObject<Properties<DiscountRedemptionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: DiscountRedemptionOrderFieldSchema
  })
}

export function DiscountRedemptionStatusFilterSchema(): z.ZodObject<Properties<DiscountRedemptionStatusFilter>> {
  return z.object({
    _eq: DiscountRedemptionStatusSchema.nullish(),
    _in: z.array(DiscountRedemptionStatusSchema).nullish(),
    _neq: DiscountRedemptionStatusSchema.nullish(),
    _notIn: z.array(DiscountRedemptionStatusSchema).nullish()
  })
}

export function DiscountRedemptionWhereInputSchema(): z.ZodObject<Properties<DiscountRedemptionWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => DiscountRedemptionWhereInputSchema())).nullish(),
    _not: z.lazy(() => DiscountRedemptionWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => DiscountRedemptionWhereInputSchema())).nullish(),
    amountMinor: z.lazy(() => BigIntFilterSchema().nullish()),
    checkoutId: z.lazy(() => IdFilterSchema().nullish()),
    codeId: z.lazy(() => IdFilterSchema().nullish()),
    committedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    configurationRevision: z.lazy(() => IntFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    currency: z.lazy(() => DiscountCurrencyFilterSchema().nullish()),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    discountClass: z.lazy(() => DiscountClassFilterSchema().nullish()),
    discountId: z.lazy(() => IdFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    orderId: z.lazy(() => IdFilterSchema().nullish()),
    reservationId: z.lazy(() => IdFilterSchema().nullish()),
    reversedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    status: z.lazy(() => DiscountRedemptionStatusFilterSchema().nullish())
  })
}

export function DiscountReservationStatusFilterSchema(): z.ZodObject<Properties<DiscountReservationStatusFilter>> {
  return z.object({
    _eq: DiscountReservationStatusSchema.nullish(),
    _in: z.array(DiscountReservationStatusSchema).nullish(),
    _neq: DiscountReservationStatusSchema.nullish(),
    _notIn: z.array(DiscountReservationStatusSchema).nullish()
  })
}

export function DiscountRuleInputSchema(): z.ZodObject<Properties<DiscountRuleInput>> {
  return z.object({
    amountOff: z.lazy(() => DiscountAmountOffRuleInputSchema().nullish()),
    buyXGetY: z.lazy(() => DiscountBuyXGetYRuleInputSchema().nullish()),
    freeShipping: z.lazy(() => DiscountFreeShippingRuleInputSchema().nullish())
  })
}

export function DiscountScheduleInputSchema(): z.ZodObject<Properties<DiscountScheduleInput>> {
  return z.object({
    endsAt: z.string().nullish(),
    startsAt: z.string()
  })
}

export function DiscountStateFilterSchema(): z.ZodObject<Properties<DiscountStateFilter>> {
  return z.object({
    _eq: DiscountStateSchema.nullish(),
    _in: z.array(DiscountStateSchema).nullish(),
    _neq: DiscountStateSchema.nullish(),
    _notIn: z.array(DiscountStateSchema).nullish()
  })
}

export function DiscountTargetSelectionInputSchema(): z.ZodObject<Properties<DiscountTargetSelectionInput>> {
  return z.object({
    role: DiscountTargetRoleSchema,
    targetIds: z.array(z.string()),
    targetType: DiscountTargetTypeSchema
  })
}

export function DiscountUpdateInputSchema(): z.ZodObject<Properties<DiscountUpdateInput>> {
  return z.object({
    channels: z.array(z.lazy(() => DiscountChannelInputSchema())).nullish(),
    codes: z.lazy(() => DiscountCodesUpdateInputSchema().nullish()),
    combinesWith: z.array(DiscountClassSchema).nullish(),
    definition: z.lazy(() => DiscountDefinitionUpdateInputSchema().nullish()),
    eligibility: z.lazy(() => DiscountBuyerContextInputSchema().nullish()),
    lifecycle: z.lazy(() => DiscountLifecycleUpdateInputSchema().nullish()),
    metadata: z.record(z.unknown()).nullish(),
    minimumRequirement: z.lazy(() => DiscountMinimumRequirementSyncInputSchema().nullish()),
    rule: z.lazy(() => DiscountRuleInputSchema().nullish()),
    tags: z.array(z.string()).nullish(),
    targetSelections: z.array(z.lazy(() => DiscountTargetSelectionInputSchema())).nullish()
  })
}

export function DiscountUsageLimitsInputSchema(): z.ZodObject<Properties<DiscountUsageLimitsInput>> {
  return z.object({
    appliesOncePerCustomer: z.boolean(),
    usageLimit: z.string().nullish()
  })
}

export function DiscountUsageReservationOrderByInputSchema(): z.ZodObject<Properties<DiscountUsageReservationOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: DiscountUsageReservationOrderFieldSchema
  })
}

export function DiscountUsageReservationWhereInputSchema(): z.ZodObject<Properties<DiscountUsageReservationWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => DiscountUsageReservationWhereInputSchema())).nullish(),
    _not: z.lazy(() => DiscountUsageReservationWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => DiscountUsageReservationWhereInputSchema())).nullish(),
    checkoutId: z.lazy(() => IdFilterSchema().nullish()),
    closedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    codeId: z.lazy(() => IdFilterSchema().nullish()),
    committedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    discountId: z.lazy(() => IdFilterSchema().nullish()),
    expiresAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    status: z.lazy(() => DiscountReservationStatusFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function DiscountWhereInputSchema(): z.ZodObject<Properties<DiscountWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => DiscountWhereInputSchema())).nullish(),
    _not: z.lazy(() => DiscountWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => DiscountWhereInputSchema())).nullish(),
    appliesOnOneTimePurchase: z.lazy(() => BooleanFilterSchema().nullish()),
    appliesOnSubscription: z.lazy(() => BooleanFilterSchema().nullish()),
    appliesOncePerCustomer: z.lazy(() => BooleanFilterSchema().nullish()),
    archivedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    channelCode: z.lazy(() => StringFilterSchema().nullish()),
    combinesWithOrderDiscounts: z.lazy(() => BooleanFilterSchema().nullish()),
    combinesWithProductDiscounts: z.lazy(() => BooleanFilterSchema().nullish()),
    combinesWithShippingDiscounts: z.lazy(() => BooleanFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    createdById: z.lazy(() => StringFilterSchema().nullish()),
    currency: z.lazy(() => DiscountCurrencyFilterSchema().nullish()),
    discountClass: z.lazy(() => DiscountClassFilterSchema().nullish()),
    effectiveStatus: z.lazy(() => DiscountEffectiveStatusFilterSchema().nullish()),
    endsAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    featuredChannelCode: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    kind: z.lazy(() => DiscountKindFilterSchema().nullish()),
    method: z.lazy(() => DiscountMethodFilterSchema().nullish()),
    primaryCode: z.lazy(() => StringFilterSchema().nullish()),
    priority: z.lazy(() => IntFilterSchema().nullish()),
    reservedUsageCount: z.lazy(() => BigIntFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    startsAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    state: z.lazy(() => DiscountStateFilterSchema().nullish()),
    tag: z.lazy(() => StringFilterSchema().nullish()),
    title: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    usageCount: z.lazy(() => BigIntFilterSchema().nullish()),
    usageLimit: z.lazy(() => BigIntFilterSchema().nullish())
  })
}

export function IdFilterSchema(): z.ZodObject<Properties<IdFilter>> {
  return z.object({
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notIn: z.array(z.string()).nullish()
  })
}

export function IntFilterSchema(): z.ZodObject<Properties<IntFilter>> {
  return z.object({
    _between: z.array(z.number()).nullish(),
    _eq: z.number().nullish(),
    _gt: z.number().nullish(),
    _gte: z.number().nullish(),
    _in: z.array(z.number()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.number().nullish(),
    _lte: z.number().nullish(),
    _neq: z.number().nullish(),
    _notIn: z.array(z.number()).nullish()
  })
}

export function StringFilterSchema(): z.ZodObject<Properties<StringFilter>> {
  return z.object({
    _contains: z.string().nullish(),
    _containsi: z.string().nullish(),
    _endsWith: z.string().nullish(),
    _endsWithi: z.string().nullish(),
    _eq: z.string().nullish(),
    _in: z.array(z.string()).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _neq: z.string().nullish(),
    _notContains: z.string().nullish(),
    _notContainsi: z.string().nullish(),
    _notIn: z.array(z.string()).nullish(),
    _startsWith: z.string().nullish(),
    _startsWithi: z.string().nullish()
  })
}
