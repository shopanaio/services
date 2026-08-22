import { z } from 'zod'
import { CurrencyCode, DimensionUnit, LocaleCode, LoyaltyAccountBalanceRebuildInput, LoyaltyAccountOrderByInput, LoyaltyAccountOrderField, LoyaltyAccountStatus, LoyaltyAccountStatusOperationInput, LoyaltyAccountStatusUpdateInput, LoyaltyAccountUpdateInput, LoyaltyAccountWhereInput, LoyaltyActorType, LoyaltyBalanceBucket, LoyaltyCatalogSelectorInput, LoyaltyCatalogSelectorType, LoyaltyDebtPolicy, LoyaltyEarningActionType, LoyaltyEarningModifierInput, LoyaltyEarningRuleCreateInput, LoyaltyEarningRuleDeleteInput, LoyaltyEarningRuleInput, LoyaltyEarningRuleOperationInput, LoyaltyEarningRuleUpdateInput, LoyaltyEarningRuleUpdateOperationValuesInput, LoyaltyEarningRuleUsageOrderByInput, LoyaltyEarningRuleUsageOrderField, LoyaltyEarningRuleUsageWhereInput, LoyaltyEarningTriggerType, LoyaltyEligibleSpendBasis, LoyaltyEventEvaluationDecision, LoyaltyEventEvaluationOrderByInput, LoyaltyEventEvaluationOrderField, LoyaltyEventEvaluationWhereInput, LoyaltyEventFactOrderByInput, LoyaltyEventFactOrderField, LoyaltyEventFactWhereInput, LoyaltyLotAllocationType, LoyaltyMaintenanceRunInput, LoyaltyModifierStackingMode, LoyaltyMonetaryAdjustmentDirection, LoyaltyMonetaryBalanceBucket, LoyaltyMonetaryTransactionKind, LoyaltyMonetaryTransactionOrderByInput, LoyaltyMonetaryTransactionOrderField, LoyaltyMonetaryWalletAdjustInput, LoyaltyMonetaryWalletAdjustmentOperationInput, LoyaltyMonetaryWalletBalanceRebuildInput, LoyaltyMonetaryWalletOrderByInput, LoyaltyMonetaryWalletOrderField, LoyaltyMonetaryWalletStatus, LoyaltyMonetaryWalletStatusOperationInput, LoyaltyMonetaryWalletStatusUpdateInput, LoyaltyMonetaryWalletType, LoyaltyMonetaryWalletUpdateInput, LoyaltyMonetaryWalletWhereInput, LoyaltyOperationType, LoyaltyOwnedEntityOperationAction, LoyaltyPointsAdjustInput, LoyaltyPointsAdjustmentDirection, LoyaltyPointsAdjustmentOperationInput, LoyaltyPointsConvertToMonetaryInput, LoyaltyPointsToMonetaryOperationInput, LoyaltyProgramCreateInput, LoyaltyProgramEarningRulesInput, LoyaltyProgramEligibilityInput, LoyaltyProgramEligibilityType, LoyaltyProgramFieldsInput, LoyaltyProgramOrderByInput, LoyaltyProgramOrderField, LoyaltyProgramRulesInput, LoyaltyProgramStatus, LoyaltyProgramUpdateInput, LoyaltyProgramVersionCreateInput, LoyaltyProgramVersionCreateOperationValuesInput, LoyaltyProgramVersionDeleteInput, LoyaltyProgramVersionOperationAction, LoyaltyProgramVersionOperationInput, LoyaltyProgramVersionPublishInput, LoyaltyProgramVersionPublishOperationValuesInput, LoyaltyProgramVersionStatus, LoyaltyProgramVersionUpdateInput, LoyaltyProgramVersionUpdateOperationValuesInput, LoyaltyProgramWhereInput, LoyaltyReferenceReconciliationStatus, LoyaltyRefundPolicy, LoyaltyReservationEventType, LoyaltyReservationOperationAction, LoyaltyReservationOrderByInput, LoyaltyReservationOrderField, LoyaltyReservationReleaseOperationInput, LoyaltyReservationStatus, LoyaltyReservationUpdateInput, LoyaltyReservationWhereInput, LoyaltyRestoredPointsExpiryPolicy, LoyaltyRewardDefinitionCreateInput, LoyaltyRewardDefinitionDeleteInput, LoyaltyRewardDefinitionInput, LoyaltyRewardDefinitionOperationInput, LoyaltyRewardDefinitionUpdateInput, LoyaltyRewardDefinitionUpdateOperationValuesInput, LoyaltyRewardEntitlementEventType, LoyaltyRewardEntitlementIssueInput, LoyaltyRewardEntitlementOperationAction, LoyaltyRewardEntitlementOperationInput, LoyaltyRewardEntitlementOrderByInput, LoyaltyRewardEntitlementOrderField, LoyaltyRewardEntitlementStatus, LoyaltyRewardEntitlementTransitionInput, LoyaltyRewardEntitlementWhereInput, LoyaltyRewardType, LoyaltyRoundingMode, LoyaltySegmentMatchMode, LoyaltyTierCalendarPeriod, LoyaltyTierCreateInput, LoyaltyTierDeleteInput, LoyaltyTierDowngradePolicy, LoyaltyTierEvaluateInput, LoyaltyTierEvaluationWindowType, LoyaltyTierInput, LoyaltyTierMembershipEventType, LoyaltyTierMembershipOperationAction, LoyaltyTierMembershipOperationInput, LoyaltyTierMembershipOrderByInput, LoyaltyTierMembershipOrderField, LoyaltyTierMembershipRevokeInput, LoyaltyTierMembershipStatus, LoyaltyTierOperationInput, LoyaltyTierPolicyDeleteInput, LoyaltyTierPolicyInput, LoyaltyTierPolicyOperationAction, LoyaltyTierPolicyOperationInput, LoyaltyTierPolicyUpsertInput, LoyaltyTierRequalificationPolicy, LoyaltyTierRewardBenefitCreateInput, LoyaltyTierRewardBenefitCreateOperationValuesInput, LoyaltyTierRewardBenefitDeleteInput, LoyaltyTierRewardBenefitOperationAction, LoyaltyTierRewardBenefitOperationInput, LoyaltyTierUpdateInput, LoyaltyTierUpdateOperationValuesInput, LoyaltyTransactionKind, LoyaltyTransactionOrderByInput, LoyaltyTransactionOrderField, LoyaltyTransactionSource, LoyaltyTransactionWhereInput, PriceAdjustmentOperation, PriceAdjustmentValueType, SortDirection, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

export const LocaleCodeSchema = z.nativeEnum(LocaleCode);

export const LoyaltyAccountOrderFieldSchema = z.nativeEnum(LoyaltyAccountOrderField);

export const LoyaltyAccountStatusSchema = z.nativeEnum(LoyaltyAccountStatus);

export const LoyaltyActorTypeSchema = z.nativeEnum(LoyaltyActorType);

export const LoyaltyBalanceBucketSchema = z.nativeEnum(LoyaltyBalanceBucket);

export const LoyaltyCatalogSelectorTypeSchema = z.nativeEnum(LoyaltyCatalogSelectorType);

export const LoyaltyDebtPolicySchema = z.nativeEnum(LoyaltyDebtPolicy);

export const LoyaltyEarningActionTypeSchema = z.nativeEnum(LoyaltyEarningActionType);

export const LoyaltyEarningRuleUsageOrderFieldSchema = z.nativeEnum(LoyaltyEarningRuleUsageOrderField);

export const LoyaltyEarningTriggerTypeSchema = z.nativeEnum(LoyaltyEarningTriggerType);

export const LoyaltyEligibleSpendBasisSchema = z.nativeEnum(LoyaltyEligibleSpendBasis);

export const LoyaltyEventEvaluationDecisionSchema = z.nativeEnum(LoyaltyEventEvaluationDecision);

export const LoyaltyEventEvaluationOrderFieldSchema = z.nativeEnum(LoyaltyEventEvaluationOrderField);

export const LoyaltyEventFactOrderFieldSchema = z.nativeEnum(LoyaltyEventFactOrderField);

export const LoyaltyLotAllocationTypeSchema = z.nativeEnum(LoyaltyLotAllocationType);

export const LoyaltyModifierStackingModeSchema = z.nativeEnum(LoyaltyModifierStackingMode);

export const LoyaltyMonetaryAdjustmentDirectionSchema = z.nativeEnum(LoyaltyMonetaryAdjustmentDirection);

export const LoyaltyMonetaryBalanceBucketSchema = z.nativeEnum(LoyaltyMonetaryBalanceBucket);

export const LoyaltyMonetaryTransactionKindSchema = z.nativeEnum(LoyaltyMonetaryTransactionKind);

export const LoyaltyMonetaryTransactionOrderFieldSchema = z.nativeEnum(LoyaltyMonetaryTransactionOrderField);

export const LoyaltyMonetaryWalletOrderFieldSchema = z.nativeEnum(LoyaltyMonetaryWalletOrderField);

export const LoyaltyMonetaryWalletStatusSchema = z.nativeEnum(LoyaltyMonetaryWalletStatus);

export const LoyaltyMonetaryWalletTypeSchema = z.nativeEnum(LoyaltyMonetaryWalletType);

export const LoyaltyOperationTypeSchema = z.nativeEnum(LoyaltyOperationType);

export const LoyaltyOwnedEntityOperationActionSchema = z.nativeEnum(LoyaltyOwnedEntityOperationAction);

export const LoyaltyPointsAdjustmentDirectionSchema = z.nativeEnum(LoyaltyPointsAdjustmentDirection);

export const LoyaltyProgramEligibilityTypeSchema = z.nativeEnum(LoyaltyProgramEligibilityType);

export const LoyaltyProgramOrderFieldSchema = z.nativeEnum(LoyaltyProgramOrderField);

export const LoyaltyProgramStatusSchema = z.nativeEnum(LoyaltyProgramStatus);

export const LoyaltyProgramVersionOperationActionSchema = z.nativeEnum(LoyaltyProgramVersionOperationAction);

export const LoyaltyProgramVersionStatusSchema = z.nativeEnum(LoyaltyProgramVersionStatus);

export const LoyaltyReferenceReconciliationStatusSchema = z.nativeEnum(LoyaltyReferenceReconciliationStatus);

export const LoyaltyRefundPolicySchema = z.nativeEnum(LoyaltyRefundPolicy);

export const LoyaltyReservationEventTypeSchema = z.nativeEnum(LoyaltyReservationEventType);

export const LoyaltyReservationOperationActionSchema = z.nativeEnum(LoyaltyReservationOperationAction);

export const LoyaltyReservationOrderFieldSchema = z.nativeEnum(LoyaltyReservationOrderField);

export const LoyaltyReservationStatusSchema = z.nativeEnum(LoyaltyReservationStatus);

export const LoyaltyRestoredPointsExpiryPolicySchema = z.nativeEnum(LoyaltyRestoredPointsExpiryPolicy);

export const LoyaltyRewardEntitlementEventTypeSchema = z.nativeEnum(LoyaltyRewardEntitlementEventType);

export const LoyaltyRewardEntitlementOperationActionSchema = z.nativeEnum(LoyaltyRewardEntitlementOperationAction);

export const LoyaltyRewardEntitlementOrderFieldSchema = z.nativeEnum(LoyaltyRewardEntitlementOrderField);

export const LoyaltyRewardEntitlementStatusSchema = z.nativeEnum(LoyaltyRewardEntitlementStatus);

export const LoyaltyRewardTypeSchema = z.nativeEnum(LoyaltyRewardType);

export const LoyaltyRoundingModeSchema = z.nativeEnum(LoyaltyRoundingMode);

export const LoyaltySegmentMatchModeSchema = z.nativeEnum(LoyaltySegmentMatchMode);

export const LoyaltyTierCalendarPeriodSchema = z.nativeEnum(LoyaltyTierCalendarPeriod);

export const LoyaltyTierDowngradePolicySchema = z.nativeEnum(LoyaltyTierDowngradePolicy);

export const LoyaltyTierEvaluationWindowTypeSchema = z.nativeEnum(LoyaltyTierEvaluationWindowType);

export const LoyaltyTierMembershipEventTypeSchema = z.nativeEnum(LoyaltyTierMembershipEventType);

export const LoyaltyTierMembershipOperationActionSchema = z.nativeEnum(LoyaltyTierMembershipOperationAction);

export const LoyaltyTierMembershipOrderFieldSchema = z.nativeEnum(LoyaltyTierMembershipOrderField);

export const LoyaltyTierMembershipStatusSchema = z.nativeEnum(LoyaltyTierMembershipStatus);

export const LoyaltyTierPolicyOperationActionSchema = z.nativeEnum(LoyaltyTierPolicyOperationAction);

export const LoyaltyTierRequalificationPolicySchema = z.nativeEnum(LoyaltyTierRequalificationPolicy);

export const LoyaltyTierRewardBenefitOperationActionSchema = z.nativeEnum(LoyaltyTierRewardBenefitOperationAction);

export const LoyaltyTransactionKindSchema = z.nativeEnum(LoyaltyTransactionKind);

export const LoyaltyTransactionOrderFieldSchema = z.nativeEnum(LoyaltyTransactionOrderField);

export const LoyaltyTransactionSourceSchema = z.nativeEnum(LoyaltyTransactionSource);

export const PriceAdjustmentOperationSchema = z.nativeEnum(PriceAdjustmentOperation);

export const PriceAdjustmentValueTypeSchema = z.nativeEnum(PriceAdjustmentValueType);

export const SortDirectionSchema = z.nativeEnum(SortDirection);

export const WeightUnitSchema = z.nativeEnum(WeightUnit);

export function LoyaltyAccountBalanceRebuildInputSchema(): z.ZodObject<Properties<LoyaltyAccountBalanceRebuildInput>> {
  return z.object({
    accountId: z.string()
  })
}

export function LoyaltyAccountOrderByInputSchema(): z.ZodObject<Properties<LoyaltyAccountOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyAccountOrderFieldSchema
  })
}

export function LoyaltyAccountStatusOperationInputSchema(): z.ZodObject<Properties<LoyaltyAccountStatusOperationInput>> {
  return z.object({
    reason: z.string(),
    status: LoyaltyAccountStatusSchema
  })
}

export function LoyaltyAccountStatusUpdateInputSchema(): z.ZodObject<Properties<LoyaltyAccountStatusUpdateInput>> {
  return z.object({
    accountId: z.string(),
    reason: z.string(),
    status: LoyaltyAccountStatusSchema
  })
}

export function LoyaltyAccountUpdateInputSchema(): z.ZodObject<Properties<LoyaltyAccountUpdateInput>> {
  return z.object({
    monetaryConversions: z.array(z.lazy(() => LoyaltyPointsToMonetaryOperationInputSchema())).nullish(),
    pointAdjustments: z.array(z.lazy(() => LoyaltyPointsAdjustmentOperationInputSchema())).nullish(),
    rebuildBalance: z.boolean().nullish(),
    rewardEntitlements: z.array(z.lazy(() => LoyaltyRewardEntitlementOperationInputSchema())).nullish(),
    status: z.lazy(() => LoyaltyAccountStatusOperationInputSchema().nullish()),
    tierMemberships: z.array(z.lazy(() => LoyaltyTierMembershipOperationInputSchema())).nullish()
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

export function LoyaltyEarningRuleCreateInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleCreateInput>> {
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
    programVersionId: z.string(),
    stopProcessing: z.boolean().default(false).nullish(),
    triggerConfig: z.record(z.unknown()),
    triggerSchemaVersion: z.number().default(1).nullish(),
    triggerType: LoyaltyEarningTriggerTypeSchema
  })
}

export function LoyaltyEarningRuleDeleteInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleDeleteInput>> {
  return z.object({
    earningRuleId: z.string()
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

export function LoyaltyEarningRuleOperationInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleOperationInput>> {
  return z.object({
    action: LoyaltyOwnedEntityOperationActionSchema,
    create: z.lazy(() => LoyaltyEarningRuleInputSchema().nullish()),
    earningRuleId: z.string().nullish(),
    update: z.lazy(() => LoyaltyEarningRuleUpdateOperationValuesInputSchema().nullish())
  })
}

export function LoyaltyEarningRuleUpdateInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleUpdateInput>> {
  return z.object({
    action: z.record(z.unknown()).nullish(),
    actionSchemaVersion: z.number().nullish(),
    actionType: LoyaltyEarningActionTypeSchema.nullish(),
    conditionSchemaVersion: z.number().nullish(),
    conditions: z.record(z.unknown()).nullish(),
    earningRuleId: z.string(),
    limitSchemaVersion: z.number().nullish(),
    limits: z.record(z.unknown()).nullish(),
    name: z.string().nullish(),
    priority: z.number().nullish(),
    stopProcessing: z.boolean().nullish(),
    triggerConfig: z.record(z.unknown()).nullish(),
    triggerSchemaVersion: z.number().nullish(),
    triggerType: LoyaltyEarningTriggerTypeSchema.nullish()
  })
}

export function LoyaltyEarningRuleUpdateOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleUpdateOperationValuesInput>> {
  return z.object({
    action: z.record(z.unknown()).nullish(),
    actionSchemaVersion: z.number().nullish(),
    actionType: LoyaltyEarningActionTypeSchema.nullish(),
    conditionSchemaVersion: z.number().nullish(),
    conditions: z.record(z.unknown()).nullish(),
    limitSchemaVersion: z.number().nullish(),
    limits: z.record(z.unknown()).nullish(),
    name: z.string().nullish(),
    priority: z.number().nullish(),
    stopProcessing: z.boolean().nullish(),
    triggerConfig: z.record(z.unknown()).nullish(),
    triggerSchemaVersion: z.number().nullish(),
    triggerType: LoyaltyEarningTriggerTypeSchema.nullish()
  })
}

export function LoyaltyEarningRuleUsageOrderByInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleUsageOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyEarningRuleUsageOrderFieldSchema
  })
}

export function LoyaltyEarningRuleUsageWhereInputSchema(): z.ZodObject<Properties<LoyaltyEarningRuleUsageWhereInput>> {
  return z.object({
    earningRuleId: z.string(),
    effectiveAt: z.string().nullish(),
    scopeKey: z.string().nullish()
  })
}

export function LoyaltyEventEvaluationOrderByInputSchema(): z.ZodObject<Properties<LoyaltyEventEvaluationOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyEventEvaluationOrderFieldSchema
  })
}

export function LoyaltyEventEvaluationWhereInputSchema(): z.ZodObject<Properties<LoyaltyEventEvaluationWhereInput>> {
  return z.object({
    accountId: z.string().nullish(),
    decisions: z.array(LoyaltyEventEvaluationDecisionSchema).nullish(),
    earningRuleId: z.string().nullish(),
    eventFactId: z.string().nullish()
  })
}

export function LoyaltyEventFactOrderByInputSchema(): z.ZodObject<Properties<LoyaltyEventFactOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyEventFactOrderFieldSchema
  })
}

export function LoyaltyEventFactWhereInputSchema(): z.ZodObject<Properties<LoyaltyEventFactWhereInput>> {
  return z.object({
    customerIds: z.array(z.string()).nullish(),
    eventTypes: z.array(z.string()).nullish(),
    occurredFrom: z.string().nullish(),
    occurredTo: z.string().nullish(),
    producers: z.array(z.string()).nullish()
  })
}

export function LoyaltyMaintenanceRunInputSchema(): z.ZodObject<Properties<LoyaltyMaintenanceRunInput>> {
  return z.object({
    effectiveAt: z.string(),
    limit: z.number().default(100).nullish(),
    rebuildBalances: z.boolean().default(false).nullish()
  })
}

export function LoyaltyMonetaryTransactionOrderByInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryTransactionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyMonetaryTransactionOrderFieldSchema
  })
}

export function LoyaltyMonetaryWalletAdjustInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletAdjustInput>> {
  return z.object({
    amountMinor: z.string(),
    direction: LoyaltyMonetaryAdjustmentDirectionSchema,
    expiresAt: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    occurredAt: z.string().nullish(),
    reasonCode: z.string(),
    walletId: z.string()
  })
}

export function LoyaltyMonetaryWalletAdjustmentOperationInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletAdjustmentOperationInput>> {
  return z.object({
    amountMinor: z.string(),
    direction: LoyaltyMonetaryAdjustmentDirectionSchema,
    expiresAt: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    occurredAt: z.string().nullish(),
    reasonCode: z.string()
  })
}

export function LoyaltyMonetaryWalletBalanceRebuildInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletBalanceRebuildInput>> {
  return z.object({
    walletId: z.string()
  })
}

export function LoyaltyMonetaryWalletOrderByInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyMonetaryWalletOrderFieldSchema
  })
}

export function LoyaltyMonetaryWalletStatusOperationInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletStatusOperationInput>> {
  return z.object({
    reasonCode: z.string(),
    status: LoyaltyMonetaryWalletStatusSchema
  })
}

export function LoyaltyMonetaryWalletStatusUpdateInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletStatusUpdateInput>> {
  return z.object({
    reasonCode: z.string(),
    status: LoyaltyMonetaryWalletStatusSchema,
    walletId: z.string()
  })
}

export function LoyaltyMonetaryWalletUpdateInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletUpdateInput>> {
  return z.object({
    adjustments: z.array(z.lazy(() => LoyaltyMonetaryWalletAdjustmentOperationInputSchema())).nullish(),
    rebuildBalance: z.boolean().nullish(),
    status: z.lazy(() => LoyaltyMonetaryWalletStatusOperationInputSchema().nullish())
  })
}

export function LoyaltyMonetaryWalletWhereInputSchema(): z.ZodObject<Properties<LoyaltyMonetaryWalletWhereInput>> {
  return z.object({
    accountIds: z.array(z.string()).nullish(),
    currencyCodes: z.array(CurrencyCodeSchema).nullish(),
    statuses: z.array(LoyaltyMonetaryWalletStatusSchema).nullish(),
    walletTypes: z.array(LoyaltyMonetaryWalletTypeSchema).nullish()
  })
}

export function LoyaltyPointsAdjustInputSchema(): z.ZodObject<Properties<LoyaltyPointsAdjustInput>> {
  return z.object({
    accountId: z.string(),
    description: z.string(),
    direction: LoyaltyPointsAdjustmentDirectionSchema,
    expiresAt: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    points: z.string(),
    reasonCode: z.string()
  })
}

export function LoyaltyPointsAdjustmentOperationInputSchema(): z.ZodObject<Properties<LoyaltyPointsAdjustmentOperationInput>> {
  return z.object({
    description: z.string(),
    direction: LoyaltyPointsAdjustmentDirectionSchema,
    expiresAt: z.string().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    points: z.string(),
    reasonCode: z.string()
  })
}

export function LoyaltyPointsConvertToMonetaryInputSchema(): z.ZodObject<Properties<LoyaltyPointsConvertToMonetaryInput>> {
  return z.object({
    accountId: z.string(),
    currencyCode: CurrencyCodeSchema,
    occurredAt: z.string().nullish(),
    points: z.string(),
    programVersionId: z.string(),
    walletType: LoyaltyMonetaryWalletTypeSchema
  })
}

export function LoyaltyPointsToMonetaryOperationInputSchema(): z.ZodObject<Properties<LoyaltyPointsToMonetaryOperationInput>> {
  return z.object({
    currencyCode: CurrencyCodeSchema,
    occurredAt: z.string().nullish(),
    points: z.string(),
    programVersionId: z.string(),
    walletType: LoyaltyMonetaryWalletTypeSchema
  })
}

export function LoyaltyProgramCreateInputSchema(): z.ZodObject<Properties<LoyaltyProgramCreateInput>> {
  return z.object({
    code: z.string(),
    defaultCurrencyCode: CurrencyCodeSchema,
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

export function LoyaltyProgramFieldsInputSchema(): z.ZodObject<Properties<LoyaltyProgramFieldsInput>> {
  return z.object({
    isDefault: z.boolean().nullish(),
    metadata: z.record(z.unknown()).nullish(),
    name: z.string().nullish(),
    status: LoyaltyProgramStatusSchema.nullish()
  })
}

export function LoyaltyProgramOrderByInputSchema(): z.ZodObject<Properties<LoyaltyProgramOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyProgramOrderFieldSchema
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
    fields: z.lazy(() => LoyaltyProgramFieldsInputSchema().nullish()),
    versions: z.array(z.lazy(() => LoyaltyProgramVersionOperationInputSchema())).nullish()
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

export function LoyaltyProgramVersionCreateOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionCreateOperationValuesInput>> {
  return z.object({
    activationDelaySeconds: z.number().default(0).nullish(),
    debtPolicy: LoyaltyDebtPolicySchema.default("TRACK_DEBT").nullish(),
    earnAmountMinor: z.string(),
    earnPoints: z.string(),
    earningEnabled: z.boolean().default(true).nullish(),
    earningRules: z.array(z.lazy(() => LoyaltyEarningRuleInputSchema())),
    effectiveFrom: z.string().nullish(),
    effectiveTo: z.string().nullish(),
    maximumOrderPercentageBps: z.number().default(10000).nullish(),
    maximumRedeemPointsPerOrder: z.string().nullish(),
    minimumEligibleAmountMinor: z.string().default("0").nullish(),
    minimumRedeemPoints: z.string().default("1").nullish(),
    pointsExpiryDays: z.number().nullish(),
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

export function LoyaltyProgramVersionDeleteInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionDeleteInput>> {
  return z.object({
    programVersionId: z.string()
  })
}

export function LoyaltyProgramVersionOperationInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionOperationInput>> {
  return z.object({
    action: LoyaltyProgramVersionOperationActionSchema,
    create: z.lazy(() => LoyaltyProgramVersionCreateOperationValuesInputSchema().nullish()),
    programVersionId: z.string().nullish(),
    publish: z.lazy(() => LoyaltyProgramVersionPublishOperationValuesInputSchema().nullish()),
    update: z.lazy(() => LoyaltyProgramVersionUpdateOperationValuesInputSchema().nullish())
  })
}

export function LoyaltyProgramVersionPublishInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionPublishInput>> {
  return z.object({
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullish(),
    programVersionId: z.string()
  })
}

export function LoyaltyProgramVersionPublishOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionPublishOperationValuesInput>> {
  return z.object({
    effectiveFrom: z.string(),
    effectiveTo: z.string().nullish()
  })
}

export function LoyaltyProgramVersionUpdateInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionUpdateInput>> {
  return z.object({
    activationDelaySeconds: z.number().nullish(),
    clearEffectiveTo: z.boolean().default(false).nullish(),
    clearMaximumRedeemPointsPerOrder: z.boolean().default(false).nullish(),
    clearPointsExpiryDays: z.boolean().default(false).nullish(),
    debtPolicy: LoyaltyDebtPolicySchema.nullish(),
    earnAmountMinor: z.string().nullish(),
    earnPoints: z.string().nullish(),
    earningEnabled: z.boolean().nullish(),
    effectiveFrom: z.string().nullish(),
    effectiveTo: z.string().nullish(),
    maximumOrderPercentageBps: z.number().nullish(),
    maximumRedeemPointsPerOrder: z.string().nullish(),
    minimumEligibleAmountMinor: z.string().nullish(),
    minimumRedeemPoints: z.string().nullish(),
    pointsExpiryDays: z.number().nullish(),
    programVersionId: z.string(),
    redeemAmountMinor: z.string().nullish(),
    redeemPoints: z.string().nullish(),
    redemptionEnabled: z.boolean().nullish(),
    refundPolicy: LoyaltyRefundPolicySchema.nullish(),
    restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicySchema.nullish(),
    roundingMode: LoyaltyRoundingModeSchema.nullish(),
    rules: z.lazy(() => LoyaltyProgramRulesInputSchema().nullish())
  })
}

export function LoyaltyProgramVersionUpdateOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyProgramVersionUpdateOperationValuesInput>> {
  return z.object({
    activationDelaySeconds: z.number().nullish(),
    clearEffectiveTo: z.boolean().default(false).nullish(),
    clearMaximumRedeemPointsPerOrder: z.boolean().default(false).nullish(),
    clearPointsExpiryDays: z.boolean().default(false).nullish(),
    debtPolicy: LoyaltyDebtPolicySchema.nullish(),
    earnAmountMinor: z.string().nullish(),
    earnPoints: z.string().nullish(),
    earningEnabled: z.boolean().nullish(),
    earningRules: z.array(z.lazy(() => LoyaltyEarningRuleOperationInputSchema())).nullish(),
    effectiveFrom: z.string().nullish(),
    effectiveTo: z.string().nullish(),
    maximumOrderPercentageBps: z.number().nullish(),
    maximumRedeemPointsPerOrder: z.string().nullish(),
    minimumEligibleAmountMinor: z.string().nullish(),
    minimumRedeemPoints: z.string().nullish(),
    pointsExpiryDays: z.number().nullish(),
    redeemAmountMinor: z.string().nullish(),
    redeemPoints: z.string().nullish(),
    redemptionEnabled: z.boolean().nullish(),
    refundPolicy: LoyaltyRefundPolicySchema.nullish(),
    restoredPointsExpiryPolicy: LoyaltyRestoredPointsExpiryPolicySchema.nullish(),
    rewardDefinitions: z.array(z.lazy(() => LoyaltyRewardDefinitionOperationInputSchema())).nullish(),
    roundingMode: LoyaltyRoundingModeSchema.nullish(),
    rules: z.lazy(() => LoyaltyProgramRulesInputSchema().nullish()),
    tierPolicy: z.lazy(() => LoyaltyTierPolicyOperationInputSchema().nullish()),
    tiers: z.array(z.lazy(() => LoyaltyTierOperationInputSchema())).nullish()
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

export function LoyaltyReservationOrderByInputSchema(): z.ZodObject<Properties<LoyaltyReservationOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyReservationOrderFieldSchema
  })
}

export function LoyaltyReservationReleaseOperationInputSchema(): z.ZodObject<Properties<LoyaltyReservationReleaseOperationInput>> {
  return z.object({
    action: LoyaltyReservationOperationActionSchema,
    reasonCode: z.string()
  })
}

export function LoyaltyReservationUpdateInputSchema(): z.ZodObject<Properties<LoyaltyReservationUpdateInput>> {
  return z.object({
    releases: z.array(z.lazy(() => LoyaltyReservationReleaseOperationInputSchema())).nullish()
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

export function LoyaltyRewardDefinitionCreateInputSchema(): z.ZodObject<Properties<LoyaltyRewardDefinitionCreateInput>> {
  return z.object({
    code: z.string(),
    configuration: z.record(z.unknown()),
    configurationSchemaVersion: z.number().default(1).nullish(),
    endsAt: z.string().nullish(),
    issuanceLimit: z.string().nullish(),
    name: z.string(),
    perAccountLimit: z.string().nullish(),
    programVersionId: z.string(),
    rewardType: LoyaltyRewardTypeSchema,
    startsAt: z.string().nullish(),
    validityDays: z.number().nullish()
  })
}

export function LoyaltyRewardDefinitionDeleteInputSchema(): z.ZodObject<Properties<LoyaltyRewardDefinitionDeleteInput>> {
  return z.object({
    rewardDefinitionId: z.string()
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

export function LoyaltyRewardDefinitionOperationInputSchema(): z.ZodObject<Properties<LoyaltyRewardDefinitionOperationInput>> {
  return z.object({
    action: LoyaltyOwnedEntityOperationActionSchema,
    create: z.lazy(() => LoyaltyRewardDefinitionInputSchema().nullish()),
    rewardDefinitionId: z.string().nullish(),
    update: z.lazy(() => LoyaltyRewardDefinitionUpdateOperationValuesInputSchema().nullish())
  })
}

export function LoyaltyRewardDefinitionUpdateInputSchema(): z.ZodObject<Properties<LoyaltyRewardDefinitionUpdateInput>> {
  return z.object({
    clearEndsAt: z.boolean().default(false).nullish(),
    clearIssuanceLimit: z.boolean().default(false).nullish(),
    clearPerAccountLimit: z.boolean().default(false).nullish(),
    clearStartsAt: z.boolean().default(false).nullish(),
    clearValidityDays: z.boolean().default(false).nullish(),
    configuration: z.record(z.unknown()).nullish(),
    configurationSchemaVersion: z.number().nullish(),
    endsAt: z.string().nullish(),
    issuanceLimit: z.string().nullish(),
    name: z.string().nullish(),
    perAccountLimit: z.string().nullish(),
    rewardDefinitionId: z.string(),
    rewardType: LoyaltyRewardTypeSchema.nullish(),
    startsAt: z.string().nullish(),
    validityDays: z.number().nullish()
  })
}

export function LoyaltyRewardDefinitionUpdateOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyRewardDefinitionUpdateOperationValuesInput>> {
  return z.object({
    clearEndsAt: z.boolean().default(false).nullish(),
    clearIssuanceLimit: z.boolean().default(false).nullish(),
    clearPerAccountLimit: z.boolean().default(false).nullish(),
    clearStartsAt: z.boolean().default(false).nullish(),
    clearValidityDays: z.boolean().default(false).nullish(),
    configuration: z.record(z.unknown()).nullish(),
    configurationSchemaVersion: z.number().nullish(),
    endsAt: z.string().nullish(),
    issuanceLimit: z.string().nullish(),
    name: z.string().nullish(),
    perAccountLimit: z.string().nullish(),
    rewardType: LoyaltyRewardTypeSchema.nullish(),
    startsAt: z.string().nullish(),
    validityDays: z.number().nullish()
  })
}

export function LoyaltyRewardEntitlementIssueInputSchema(): z.ZodObject<Properties<LoyaltyRewardEntitlementIssueInput>> {
  return z.object({
    accountId: z.string(),
    externalReference: z.string().nullish(),
    occurredAt: z.string().nullish(),
    quantity: z.string().default("1").nullish(),
    rewardDefinitionId: z.string()
  })
}

export function LoyaltyRewardEntitlementOperationInputSchema(): z.ZodObject<Properties<LoyaltyRewardEntitlementOperationInput>> {
  return z.object({
    action: LoyaltyRewardEntitlementOperationActionSchema,
    externalReference: z.string().nullish(),
    occurredAt: z.string().nullish(),
    quantity: z.string().default("1").nullish(),
    reasonCode: z.string().nullish(),
    rewardDefinitionId: z.string().nullish(),
    rewardEntitlementId: z.string().nullish()
  })
}

export function LoyaltyRewardEntitlementOrderByInputSchema(): z.ZodObject<Properties<LoyaltyRewardEntitlementOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyRewardEntitlementOrderFieldSchema
  })
}

export function LoyaltyRewardEntitlementTransitionInputSchema(): z.ZodObject<Properties<LoyaltyRewardEntitlementTransitionInput>> {
  return z.object({
    entitlementId: z.string(),
    occurredAt: z.string().nullish(),
    reasonCode: z.string()
  })
}

export function LoyaltyRewardEntitlementWhereInputSchema(): z.ZodObject<Properties<LoyaltyRewardEntitlementWhereInput>> {
  return z.object({
    accountIds: z.array(z.string()).nullish(),
    rewardDefinitionIds: z.array(z.string()).nullish(),
    statuses: z.array(LoyaltyRewardEntitlementStatusSchema).nullish(),
    validAt: z.string().nullish()
  })
}

export function LoyaltyTierCreateInputSchema(): z.ZodObject<Properties<LoyaltyTierCreateInput>> {
  return z.object({
    code: z.string(),
    maintenance: z.record(z.unknown()).nullish(),
    name: z.string(),
    programVersionId: z.string(),
    qualification: z.record(z.unknown()),
    qualificationSchemaVersion: z.number().default(1).nullish(),
    rank: z.number()
  })
}

export function LoyaltyTierDeleteInputSchema(): z.ZodObject<Properties<LoyaltyTierDeleteInput>> {
  return z.object({
    tierId: z.string()
  })
}

export function LoyaltyTierEvaluateInputSchema(): z.ZodObject<Properties<LoyaltyTierEvaluateInput>> {
  return z.object({
    accountId: z.string(),
    effectiveAt: z.string().nullish(),
    forceRequalification: z.boolean().default(false).nullish(),
    programVersionId: z.string().nullish(),
    reasonCode: z.string()
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

export function LoyaltyTierMembershipOperationInputSchema(): z.ZodObject<Properties<LoyaltyTierMembershipOperationInput>> {
  return z.object({
    action: LoyaltyTierMembershipOperationActionSchema,
    effectiveAt: z.string().nullish(),
    forceRequalification: z.boolean().default(false).nullish(),
    programVersionId: z.string().nullish(),
    reasonCode: z.string(),
    tierMembershipId: z.string().nullish()
  })
}

export function LoyaltyTierMembershipOrderByInputSchema(): z.ZodObject<Properties<LoyaltyTierMembershipOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyTierMembershipOrderFieldSchema
  })
}

export function LoyaltyTierMembershipRevokeInputSchema(): z.ZodObject<Properties<LoyaltyTierMembershipRevokeInput>> {
  return z.object({
    effectiveAt: z.string().nullish(),
    membershipId: z.string(),
    reasonCode: z.string()
  })
}

export function LoyaltyTierOperationInputSchema(): z.ZodObject<Properties<LoyaltyTierOperationInput>> {
  return z.object({
    action: LoyaltyOwnedEntityOperationActionSchema,
    create: z.lazy(() => LoyaltyTierInputSchema().nullish()),
    tierId: z.string().nullish(),
    update: z.lazy(() => LoyaltyTierUpdateOperationValuesInputSchema().nullish())
  })
}

export function LoyaltyTierPolicyDeleteInputSchema(): z.ZodObject<Properties<LoyaltyTierPolicyDeleteInput>> {
  return z.object({
    programVersionId: z.string()
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

export function LoyaltyTierPolicyOperationInputSchema(): z.ZodObject<Properties<LoyaltyTierPolicyOperationInput>> {
  return z.object({
    action: LoyaltyTierPolicyOperationActionSchema,
    values: z.lazy(() => LoyaltyTierPolicyInputSchema().nullish())
  })
}

export function LoyaltyTierPolicyUpsertInputSchema(): z.ZodObject<Properties<LoyaltyTierPolicyUpsertInput>> {
  return z.object({
    calendarPeriod: LoyaltyTierCalendarPeriodSchema.nullish(),
    downgradePolicy: LoyaltyTierDowngradePolicySchema.default("IMMEDIATE").nullish(),
    gracePeriodDays: z.number().default(0).nullish(),
    membershipDurationDays: z.number().nullish(),
    metricSchemaVersion: z.number().default(1).nullish(),
    programVersionId: z.string(),
    programYearStartsMonth: z.number().nullish(),
    requalificationPolicy: LoyaltyTierRequalificationPolicySchema.default("AUTOMATIC").nullish(),
    rollingWindowDays: z.number().nullish(),
    windowType: LoyaltyTierEvaluationWindowTypeSchema
  })
}

export function LoyaltyTierRewardBenefitCreateInputSchema(): z.ZodObject<Properties<LoyaltyTierRewardBenefitCreateInput>> {
  return z.object({
    grantPolicy: z.record(z.unknown()),
    grantPolicySchemaVersion: z.number().default(1).nullish(),
    rewardDefinitionId: z.string(),
    tierId: z.string()
  })
}

export function LoyaltyTierRewardBenefitCreateOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyTierRewardBenefitCreateOperationValuesInput>> {
  return z.object({
    grantPolicy: z.record(z.unknown()),
    grantPolicySchemaVersion: z.number().default(1).nullish(),
    rewardDefinitionId: z.string()
  })
}

export function LoyaltyTierRewardBenefitDeleteInputSchema(): z.ZodObject<Properties<LoyaltyTierRewardBenefitDeleteInput>> {
  return z.object({
    tierRewardBenefitId: z.string()
  })
}

export function LoyaltyTierRewardBenefitOperationInputSchema(): z.ZodObject<Properties<LoyaltyTierRewardBenefitOperationInput>> {
  return z.object({
    action: LoyaltyTierRewardBenefitOperationActionSchema,
    create: z.lazy(() => LoyaltyTierRewardBenefitCreateOperationValuesInputSchema().nullish()),
    tierRewardBenefitId: z.string().nullish()
  })
}

export function LoyaltyTierUpdateInputSchema(): z.ZodObject<Properties<LoyaltyTierUpdateInput>> {
  return z.object({
    clearMaintenance: z.boolean().default(false).nullish(),
    maintenance: z.record(z.unknown()).nullish(),
    name: z.string().nullish(),
    qualification: z.record(z.unknown()).nullish(),
    qualificationSchemaVersion: z.number().nullish(),
    rank: z.number().nullish(),
    tierId: z.string()
  })
}

export function LoyaltyTierUpdateOperationValuesInputSchema(): z.ZodObject<Properties<LoyaltyTierUpdateOperationValuesInput>> {
  return z.object({
    clearMaintenance: z.boolean().default(false).nullish(),
    maintenance: z.record(z.unknown()).nullish(),
    name: z.string().nullish(),
    qualification: z.record(z.unknown()).nullish(),
    qualificationSchemaVersion: z.number().nullish(),
    rank: z.number().nullish(),
    rewardBenefits: z.array(z.lazy(() => LoyaltyTierRewardBenefitOperationInputSchema())).nullish()
  })
}

export function LoyaltyTransactionOrderByInputSchema(): z.ZodObject<Properties<LoyaltyTransactionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: LoyaltyTransactionOrderFieldSchema
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
