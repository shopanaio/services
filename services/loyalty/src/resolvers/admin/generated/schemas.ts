import { z } from 'zod'
import { CurrencyCode, DimensionUnit, LocaleCode, LoyaltyAccountStatus, LoyaltyAccountStatusUpdateInput, LoyaltyAccountWhereInput, LoyaltyActorType, LoyaltyBalanceBucket, LoyaltyCatalogSelectorInput, LoyaltyCatalogSelectorType, LoyaltyDebtPolicy, LoyaltyEarningActionType, LoyaltyEarningModifierInput, LoyaltyEarningRuleInput, LoyaltyEarningTriggerType, LoyaltyEligibleSpendBasis, LoyaltyLotAllocationType, LoyaltyModifierStackingMode, LoyaltyPointsAdjustInput, LoyaltyPointsAdjustmentDirection, LoyaltyProgramCreateInput, LoyaltyProgramEarningRulesInput, LoyaltyProgramEligibilityInput, LoyaltyProgramEligibilityType, LoyaltyProgramRulesInput, LoyaltyProgramStatus, LoyaltyProgramUpdateInput, LoyaltyProgramVersionCreateInput, LoyaltyProgramVersionPublishInput, LoyaltyProgramVersionStatus, LoyaltyProgramWhereInput, LoyaltyRefundPolicy, LoyaltyReservationEventType, LoyaltyReservationReleaseInput, LoyaltyReservationStatus, LoyaltyReservationWhereInput, LoyaltyRestoredPointsExpiryPolicy, LoyaltyRewardDefinitionInput, LoyaltyRewardType, LoyaltyRoundingMode, LoyaltySegmentMatchMode, LoyaltyTierCalendarPeriod, LoyaltyTierDowngradePolicy, LoyaltyTierEvaluationWindowType, LoyaltyTierInput, LoyaltyTierMembershipEventType, LoyaltyTierMembershipStatus, LoyaltyTierPolicyInput, LoyaltyTierRequalificationPolicy, LoyaltyTransactionKind, LoyaltyTransactionSource, LoyaltyTransactionWhereInput, PriceAdjustmentOperation, PriceAdjustmentValueType, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const LoyaltyAccountStatusSchema = z.nativeEnum(LoyaltyAccountStatus);

export const LoyaltyActorTypeSchema = z.nativeEnum(LoyaltyActorType);

export const LoyaltyBalanceBucketSchema = z.nativeEnum(LoyaltyBalanceBucket);

export const LoyaltyCatalogSelectorTypeSchema = z.nativeEnum(LoyaltyCatalogSelectorType);

export const LoyaltyDebtPolicySchema = z.nativeEnum(LoyaltyDebtPolicy);

export const LoyaltyEarningActionTypeSchema = z.nativeEnum(LoyaltyEarningActionType);

export const LoyaltyEarningTriggerTypeSchema = z.nativeEnum(LoyaltyEarningTriggerType);

export const LoyaltyEligibleSpendBasisSchema = z.nativeEnum(LoyaltyEligibleSpendBasis);

export const LoyaltyLotAllocationTypeSchema = z.nativeEnum(LoyaltyLotAllocationType);

export const LoyaltyModifierStackingModeSchema = z.nativeEnum(LoyaltyModifierStackingMode);

export const LoyaltyPointsAdjustmentDirectionSchema = z.nativeEnum(LoyaltyPointsAdjustmentDirection);

export const LoyaltyProgramEligibilityTypeSchema = z.nativeEnum(LoyaltyProgramEligibilityType);

export const LoyaltyProgramStatusSchema = z.nativeEnum(LoyaltyProgramStatus);

export const LoyaltyProgramVersionStatusSchema = z.nativeEnum(LoyaltyProgramVersionStatus);

export const LoyaltyRefundPolicySchema = z.nativeEnum(LoyaltyRefundPolicy);

export const LoyaltyReservationEventTypeSchema = z.nativeEnum(LoyaltyReservationEventType);

export const LoyaltyReservationStatusSchema = z.nativeEnum(LoyaltyReservationStatus);

export const LoyaltyRestoredPointsExpiryPolicySchema = z.nativeEnum(LoyaltyRestoredPointsExpiryPolicy);

export const LoyaltyRewardTypeSchema = z.nativeEnum(LoyaltyRewardType);

export const LoyaltyRoundingModeSchema = z.nativeEnum(LoyaltyRoundingMode);

export const LoyaltySegmentMatchModeSchema = z.nativeEnum(LoyaltySegmentMatchMode);

export const LoyaltyTierCalendarPeriodSchema = z.nativeEnum(LoyaltyTierCalendarPeriod);

export const LoyaltyTierDowngradePolicySchema = z.nativeEnum(LoyaltyTierDowngradePolicy);

export const LoyaltyTierEvaluationWindowTypeSchema = z.nativeEnum(LoyaltyTierEvaluationWindowType);

export const LoyaltyTierMembershipEventTypeSchema = z.nativeEnum(LoyaltyTierMembershipEventType);

export const LoyaltyTierMembershipStatusSchema = z.nativeEnum(LoyaltyTierMembershipStatus);

export const LoyaltyTierRequalificationPolicySchema = z.nativeEnum(LoyaltyTierRequalificationPolicy);

export const LoyaltyTransactionKindSchema = z.nativeEnum(LoyaltyTransactionKind);

export const LoyaltyTransactionSourceSchema = z.nativeEnum(LoyaltyTransactionSource);

export const PriceAdjustmentOperationSchema = z.nativeEnum(PriceAdjustmentOperation);

export const PriceAdjustmentValueTypeSchema = z.nativeEnum(PriceAdjustmentValueType);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function LoyaltyAccountStatusUpdateInputSchema(): z.ZodObject<Properties<LoyaltyAccountStatusUpdateInput>> {
  return z.object({
    accountId: z.string(),
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    reason: z.string(),
    status: LoyaltyAccountStatusSchema
  })
}

export function LoyaltyAccountWhereInputSchema(): z.ZodObject<Properties<LoyaltyAccountWhereInput>> {
  return z.object({
    customerIds: z.array(z.string()).nullish(),
    hasDebt: z.boolean().nullish(),
    ids: z.array(z.string()).nullish(),
    minimumAvailablePoints: z.string().nullish(),
    programIds: z.array(z.string()).nullish(),
    statuses: z.array(LoyaltyAccountStatusSchema).nullish(),
    tierIds: z.array(z.string()).nullish()
  })
}

export function LoyaltyCatalogSelectorInputSchema(): z.ZodObject<Properties<LoyaltyCatalogSelectorInput>> {
  return z.object({
    ids: z.array(z.string()),
    type: LoyaltyCatalogSelectorTypeSchema
  })
}

export function LoyaltyEarningModifierInputSchema(): z.ZodObject<Properties<LoyaltyEarningModifierInput>> {
  return z.object({
    endsAt: z.string().nullish(),
    id: z.string(),
    multiplierBps: z.number(),
    priority: z.number(),
    segmentIds: z.array(z.string()),
    selector: z.lazy(() => LoyaltyCatalogSelectorInputSchema()),
    startsAt: z.string().nullish(),
    title: z.string()
  })
}

export function LoyaltyEarningRuleInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleInput>> {
  return z.object({
    action: z.record(z.unknown()),
    actionSchemaVersion: z.number().default(1).nullish(),
    actionType: LoyaltyEarningActionTypeSchema,
    code: z.string(),
    conditionSchemaVersion: z.number().default(1).nullish(),
    conditions: z.record(z.unknown()),
    limitSchemaVersion: z.number().default(1).nullish(),
    limits: z.record(z.unknown()),
    name: z.string(),
    priority: z.number().default(0).nullish(),
    stopProcessing: z.boolean().default(false).nullish(),
    triggerConfig: z.record(z.unknown()),
    triggerSchemaVersion: z.number().default(1).nullish(),
    triggerType: LoyaltyEarningTriggerTypeSchema
  })
}

export function LoyaltyPointsAdjustInputSchema(): z.ZodObject<Properties<LoyaltyPointsAdjustInput>> {
  return z.object({
    accountId: z.string(),
    description: z.string(),
    direction: LoyaltyPointsAdjustmentDirectionSchema,
    expectedBalanceRevision: z.number(),
    expiresAt: z.string().nullish(),
    idempotencyKey: z.string(),
    metadata: z.record(z.unknown()).nullish(),
    points: z.string(),
    reasonCode: z.string()
  })
}

export function LoyaltyProgramCreateInputSchema(): z.ZodObject<Properties<LoyaltyProgramCreateInput>> {
  return z.object({
    code: z.string(),
    defaultCurrencyCode: CurrencyCodeSchema,
    idempotencyKey: z.string(),
    isDefault: z.boolean().default(false).nullish(),
    metadata: z.record(z.unknown()).nullish(),
    name: z.string()
  })
}

export function LoyaltyProgramEarningRulesInputSchema(): z.ZodObject<Properties<LoyaltyProgramEarningRulesInput>> {
  return z.object({
    eligibleSpendBasis: LoyaltyEligibleSpendBasisSchema,
    excludedSelectors: z.array(z.lazy(() => LoyaltyCatalogSelectorInputSchema())),
    modifierStackingMode: LoyaltyModifierStackingModeSchema.default("HIGHEST").nullish(),
    modifiers: z.array(z.lazy(() => LoyaltyEarningModifierInputSchema()))
  })
}

export function LoyaltyProgramEligibilityInputSchema(): z.ZodObject<Properties<LoyaltyProgramEligibilityInput>> {
  return z.object({
    channelCodes: z.array(z.string()),
    excludedSegmentIds: z.array(z.string()),
    segmentIds: z.array(z.string()),
    segmentMatchMode: LoyaltySegmentMatchModeSchema.nullish(),
    type: LoyaltyProgramEligibilityTypeSchema
  })
}

export function LoyaltyProgramRulesInputSchema(): z.ZodObject<Properties<LoyaltyProgramRulesInput>> {
  return z.object({
    earning: z.lazy(() => LoyaltyProgramEarningRulesInputSchema()),
    eligibility: z.lazy(() => LoyaltyProgramEligibilityInputSchema()),
    schemaVersion: z.number().default(1).nullish()
  })
}

export function LoyaltyProgramUpdateInputSchema(): z.ZodObject<Properties<LoyaltyProgramUpdateInput>> {
  return z.object({
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    isDefault: z.boolean().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    name: z.string().nullish(),
    programId: z.string(),
    status: LoyaltyProgramStatusSchema.nullish()
  })
}

export function LoyaltyProgramVersionCreateInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionCreateInput>> {
  return z.object({
    activationDelaySeconds: z.number().default(0).nullish(),
    debtPolicy: LoyaltyDebtPolicySchema.default("TRACK_DEBT").nullish(),
    earnAmountMinor: z.string(),
    earnPoints: z.string(),
    earningEnabled: z.boolean().default(true).nullish(),
    earningRules: z.array(z.lazy(() => LoyaltyEarningRuleInputSchema())),
    effectiveFrom: z.string().nullish(),
    effectiveTo: z.string().nullish(),
    expectedProgramRevision: z.number(),
    idempotencyKey: z.string(),
    maximumOrderPercentageBps: z.number().default(10000).nullish(),
    maximumRedeemPointsPerOrder: z.string().nullish(),
    minimumEligibleAmountMinor: z.string().default("0").nullish(),
    minimumRedeemPoints: z.string().default("1").nullish(),
    pointsExpiryDays: z.number().nullish(),
    programId: z.string(),
    redeemAmountMinor: z.string(),
    redeemPoints: z.string(),
    redemptionEnabled: z.boolean().default(true).nullish(),
    refundPolicy: LoyaltyRefundPolicySchema.default("PROPORTIONAL").nullish(),
    restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicySchema.default("ORIGINAL_EXPIRY").nullish(),
    rewardDefinitions: z.array(z.lazy(() => LoyaltyRewardDefinitionInputSchema())),
    roundingMode: LoyaltyRoundingModeSchema.default("DOWN").nullish(),
    rules: z.lazy(() => LoyaltyProgramRulesInputSchema()),
    rulesSchemaVersion: z.number().default(1).nullish(),
    tierPolicy: z.lazy(() => LoyaltyTierPolicyInputSchema().nullish()),
    tiers: z.array(z.lazy(() => LoyaltyTierInputSchema())).nullish()
  })
}

export function LoyaltyProgramVersionPublishInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionPublishInput>> {
  return z.object({
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullish(),
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    programVersionId: z.string()
  })
}

export function LoyaltyProgramWhereInputSchema(): z.ZodObject<Properties<LoyaltyProgramWhereInput>> {
  return z.object({
    ids: z.array(z.string()).nullish(),
    isDefault: z.boolean().nullish(),
    search: z.string().nullish(),
    statuses: z.array(LoyaltyProgramStatusSchema).nullish()
  })
}

export function LoyaltyReservationReleaseInputSchema(): z.ZodObject<Properties<LoyaltyReservationReleaseInput>> {
  return z.object({
    expectedRevision: z.number(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
    reservationId: z.string()
  })
}

export function LoyaltyReservationWhereInputSchema(): z.ZodObject<Properties<LoyaltyReservationWhereInput>> {
  return z.object({
    accountIds: z.array(z.string()).nullish(),
    checkoutId: z.string().nullish(),
    createdFrom: z.string().nullish(),
    createdTo: z.string().nullish(),
    expiresBefore: z.string().nullish(),
    ids: z.array(z.string()).nullish(),
    orderId: z.string().nullish(),
    programIds: z.array(z.string()).nullish(),
    statuses: z.array(LoyaltyReservationStatusSchema).nullish()
  })
}

export function LoyaltyRewardDefinitionInputSchema(): z.ZodObject<Properties<LoyaltyRewardDefinitionInput>> {
  return z.object({
    code: z.string(),
    configuration: z.record(z.unknown()),
    configurationSchemaVersion: z.number().default(1).nullish(),
    endsAt: z.string().nullish(),
    issuanceLimit: z.string().nullish(),
    name: z.string(),
    perAccountLimit: z.string().nullish(),
    rewardType: LoyaltyRewardTypeSchema,
    startsAt: z.string().nullish(),
    validityDays: z.number().nullish()
  })
}

export function LoyaltyTierInputSchema(): z.ZodObject<Properties<LoyaltyTierInput>> {
  return z.object({
    code: z.string(),
    maintenance: z.record(z.unknown()).nullish(),
    name: z.string(),
    qualification: z.record(z.unknown()),
    qualificationSchemaVersion: z.number().default(1).nullish(),
    rank: z.number()
  })
}

export function LoyaltyTierPolicyInputSchema(): z.ZodObject<Properties<LoyaltyTierPolicyInput>> {
  return z.object({
    calendarPeriod: LoyaltyTierCalendarPeriodSchema.nullish(),
    downgradePolicy: LoyaltyTierDowngradePolicySchema.default("IMMEDIATE").nullish(),
    gracePeriodDays: z.number().default(0).nullish(),
    membershipDurationDays: z.number().nullish(),
    metricSchemaVersion: z.number().default(1).nullish(),
    programYearStartsMonth: z.number().nullish(),
    requalificationPolicy: LoyaltyTierRequalificationPolicySchema.default("AUTOMATIC").nullish(),
    rollingWindowDays: z.number().nullish(),
    windowType: LoyaltyTierEvaluationWindowTypeSchema
  })
}

export function LoyaltyTransactionWhereInputSchema(): z.ZodObject<Properties<LoyaltyTransactionWhereInput>> {
  return z.object({
    accountIds: z.array(z.string()).nullish(),
    checkoutId: z.string().nullish(),
    ids: z.array(z.string()).nullish(),
    kinds: z.array(LoyaltyTransactionKindSchema).nullish(),
    occurredFrom: z.string().nullish(),
    occurredTo: z.string().nullish(),
    orderId: z.string().nullish(),
    programIds: z.array(z.string()).nullish(),
    sourceId: z.string().nullish(),
    sources: z.array(LoyaltyTransactionSourceSchema).nullish()
  })
}
