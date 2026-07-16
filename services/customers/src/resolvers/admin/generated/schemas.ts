import { z } from 'zod'
import { BigIntFilter, BooleanFilter, CurrencyCode, CustomerAccountStatus, CustomerAccountStatusFilter, CustomerAddressCreateOperationInput, CustomerAddressOrderByInput, CustomerAddressOrderField, CustomerAddressPatchInput, CustomerAddressUpdateOperationInput, CustomerAddressValidationStatus, CustomerAddressValidationStatusFilter, CustomerAddressWhereInput, CustomerAddressesUpdateInput, CustomerAdminLifecycleStatus, CustomerAssignmentSource, CustomerAssignmentSourceFilter, CustomerCompanyUpdateInput, CustomerConsentAdminState, CustomerConsentChannel, CustomerConsentEventOrderByInput, CustomerConsentEventOrderField, CustomerConsentOptInLevel, CustomerConsentState, CustomerConsentStateFilter, CustomerConsentUpdateOperationInput, CustomerConsentsUpdateInput, CustomerContactUpdateInput, CustomerCreateInput, CustomerDataRequestCancelOperationInput, CustomerDataRequestCreateInput, CustomerDataRequestDeleteInput, CustomerDataRequestOrderByInput, CustomerDataRequestOrderField, CustomerDataRequestStatus, CustomerDataRequestStatusFilter, CustomerDataRequestType, CustomerDataRequestTypeFilter, CustomerDataRequestUpdateInput, CustomerDataRequestWhereInput, CustomerDeleteInput, CustomerGroupCreateInput, CustomerGroupDefinitionUpdateInput, CustomerGroupDeleteInput, CustomerGroupMembershipOrderByInput, CustomerGroupMembershipOrderField, CustomerGroupMembershipRelationCreateInput, CustomerGroupMembershipRelationUpdateInput, CustomerGroupMembershipRelationsUpdateInput, CustomerGroupMembershipUpdateOperationInput, CustomerGroupMembershipWhereInput, CustomerGroupMembershipsUpdateInput, CustomerGroupOrderByInput, CustomerGroupOrderField, CustomerGroupStateUpdateInput, CustomerGroupUpdateInput, CustomerGroupWhereInput, CustomerLifecycleStatus, CustomerLifecycleStatusFilter, CustomerMergeCreateInput, CustomerMergeDeleteInput, CustomerMergeOrderByInput, CustomerMergeOrderField, CustomerMergeStatus, CustomerMergeStatusFilter, CustomerMergeUpdateInput, CustomerMergeWhereInput, CustomerModerationUpdateInput, CustomerMonetaryStatisticsOrderByInput, CustomerMonetaryStatisticsOrderField, CustomerMonetaryStatisticsWhereInput, CustomerNoteUpdateInput, CustomerOperationType, CustomerOrderByInput, CustomerOrderField, CustomerProfileUpdateInput, CustomerSegmentCreateInput, CustomerSegmentDefinitionUpdateInput, CustomerSegmentDeleteInput, CustomerSegmentDetailsUpdateInput, CustomerSegmentMembershipOrderByInput, CustomerSegmentMembershipOrderField, CustomerSegmentMembershipRelationCreateInput, CustomerSegmentMembershipRelationUpdateInput, CustomerSegmentMembershipRelationsUpdateInput, CustomerSegmentMembershipWhereInput, CustomerSegmentMembershipsUpdateInput, CustomerSegmentOrderByInput, CustomerSegmentOrderField, CustomerSegmentStateUpdateInput, CustomerSegmentStatus, CustomerSegmentStatusFilter, CustomerSegmentType, CustomerSegmentTypeFilter, CustomerSegmentUpdateInput, CustomerSegmentWhereInput, CustomerStatusUpdateInput, CustomerTagAssignmentOrderByInput, CustomerTagAssignmentOrderField, CustomerTagAssignmentRelationCreateInput, CustomerTagAssignmentRelationsUpdateInput, CustomerTagAssignmentWhereInput, CustomerTagAssignmentsUpdateInput, CustomerTagCreateInput, CustomerTagDeleteInput, CustomerTagOrderByInput, CustomerTagOrderField, CustomerTagUpdateInput, CustomerTagWhereInput, CustomerTaxExemptionCreateOperationInput, CustomerTaxExemptionOrderByInput, CustomerTaxExemptionOrderField, CustomerTaxExemptionPatchInput, CustomerTaxExemptionStatus, CustomerTaxExemptionStatusFilter, CustomerTaxExemptionUpdateOperationInput, CustomerTaxExemptionWhereInput, CustomerTaxExemptionsUpdateInput, CustomerTaxIdentifierCreateOperationInput, CustomerTaxIdentifierOrderByInput, CustomerTaxIdentifierOrderField, CustomerTaxIdentifierPatchInput, CustomerTaxIdentifierStatus, CustomerTaxIdentifierStatusFilter, CustomerTaxIdentifierUpdateOperationInput, CustomerTaxIdentifierWhereInput, CustomerTaxIdentifiersUpdateInput, CustomerUpdateInput, CustomerWhereInput, DateFilter, DateTimeFilter, DimensionUnit, FloatFilter, IdFilter, IntFilter, LocaleCode, SortDirection, StringFilter, WeightUnit } from './types.js'

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny => v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const CurrencyCodeSchema = z.nativeEnum(CurrencyCode);

export const CustomerAccountStatusSchema = z.nativeEnum(CustomerAccountStatus);

export const CustomerAddressOrderFieldSchema = z.nativeEnum(CustomerAddressOrderField);

export const CustomerAddressValidationStatusSchema = z.nativeEnum(CustomerAddressValidationStatus);

export const CustomerAdminLifecycleStatusSchema = z.nativeEnum(CustomerAdminLifecycleStatus);

export const CustomerAssignmentSourceSchema = z.nativeEnum(CustomerAssignmentSource);

export const CustomerConsentAdminStateSchema = z.nativeEnum(CustomerConsentAdminState);

export const CustomerConsentChannelSchema = z.nativeEnum(CustomerConsentChannel);

export const CustomerConsentEventOrderFieldSchema = z.nativeEnum(CustomerConsentEventOrderField);

export const CustomerConsentOptInLevelSchema = z.nativeEnum(CustomerConsentOptInLevel);

export const CustomerConsentStateSchema = z.nativeEnum(CustomerConsentState);

export const CustomerDataRequestOrderFieldSchema = z.nativeEnum(CustomerDataRequestOrderField);

export const CustomerDataRequestStatusSchema = z.nativeEnum(CustomerDataRequestStatus);

export const CustomerDataRequestTypeSchema = z.nativeEnum(CustomerDataRequestType);

export const CustomerGroupMembershipOrderFieldSchema = z.nativeEnum(CustomerGroupMembershipOrderField);

export const CustomerGroupOrderFieldSchema = z.nativeEnum(CustomerGroupOrderField);

export const CustomerLifecycleStatusSchema = z.nativeEnum(CustomerLifecycleStatus);

export const CustomerMergeOrderFieldSchema = z.nativeEnum(CustomerMergeOrderField);

export const CustomerMergeStatusSchema = z.nativeEnum(CustomerMergeStatus);

export const CustomerMonetaryStatisticsOrderFieldSchema = z.nativeEnum(CustomerMonetaryStatisticsOrderField);

export const CustomerOperationTypeSchema = z.nativeEnum(CustomerOperationType);

export const CustomerOrderFieldSchema = z.nativeEnum(CustomerOrderField);

export const CustomerSegmentMembershipOrderFieldSchema = z.nativeEnum(CustomerSegmentMembershipOrderField);

export const CustomerSegmentOrderFieldSchema = z.nativeEnum(CustomerSegmentOrderField);

export const CustomerSegmentStatusSchema = z.nativeEnum(CustomerSegmentStatus);

export const CustomerSegmentTypeSchema = z.nativeEnum(CustomerSegmentType);

export const CustomerTagAssignmentOrderFieldSchema = z.nativeEnum(CustomerTagAssignmentOrderField);

export const CustomerTagOrderFieldSchema = z.nativeEnum(CustomerTagOrderField);

export const CustomerTaxExemptionOrderFieldSchema = z.nativeEnum(CustomerTaxExemptionOrderField);

export const CustomerTaxExemptionStatusSchema = z.nativeEnum(CustomerTaxExemptionStatus);

export const CustomerTaxIdentifierOrderFieldSchema = z.nativeEnum(CustomerTaxIdentifierOrderField);

export const CustomerTaxIdentifierStatusSchema = z.nativeEnum(CustomerTaxIdentifierStatus);

export const DimensionUnitSchema = z.nativeEnum(DimensionUnit);

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

export function CustomerAccountStatusFilterSchema(): z.ZodObject<Properties<CustomerAccountStatusFilter>> {
  return z.object({
    _eq: CustomerAccountStatusSchema.nullish(),
    _in: z.array(CustomerAccountStatusSchema).nullish(),
    _neq: CustomerAccountStatusSchema.nullish(),
    _notIn: z.array(CustomerAccountStatusSchema).nullish()
  })
}

export function CustomerAddressCreateOperationInputSchema(): z.ZodObject<Properties<CustomerAddressCreateOperationInput>> {
  return z.object({
    address1: z.string(),
    address2: z.string().nullish(),
    city: z.string(),
    companyName: z.string().nullish(),
    countryCode: z.string(),
    firstName: z.string().nullish(),
    isDefaultBilling: z.boolean().default(false).nullish(),
    isDefaultShipping: z.boolean().default(false).nullish(),
    label: z.string().nullish(),
    lastName: z.string().nullish(),
    latitude: z.number().nullish(),
    longitude: z.number().nullish(),
    middleName: z.string().nullish(),
    phoneE164: z.string().nullish(),
    postalCode: z.string().nullish(),
    prefix: z.string().nullish(),
    regionCode: z.string().nullish(),
    regionName: z.string().nullish(),
    suffix: z.string().nullish()
  })
}

export function CustomerAddressOrderByInputSchema(): z.ZodObject<Properties<CustomerAddressOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerAddressOrderFieldSchema
  })
}

export function CustomerAddressPatchInputSchema(): z.ZodObject<Properties<CustomerAddressPatchInput>> {
  return z.object({
    address1: z.string().nullish(),
    address2: z.string().nullish(),
    city: z.string().nullish(),
    companyName: z.string().nullish(),
    countryCode: z.string().nullish(),
    firstName: z.string().nullish(),
    isDefaultBilling: z.boolean().nullish(),
    isDefaultShipping: z.boolean().nullish(),
    label: z.string().nullish(),
    lastName: z.string().nullish(),
    latitude: z.number().nullish(),
    longitude: z.number().nullish(),
    middleName: z.string().nullish(),
    phoneE164: z.string().nullish(),
    postalCode: z.string().nullish(),
    prefix: z.string().nullish(),
    regionCode: z.string().nullish(),
    regionName: z.string().nullish(),
    suffix: z.string().nullish()
  })
}

export function CustomerAddressUpdateOperationInputSchema(): z.ZodObject<Properties<CustomerAddressUpdateOperationInput>> {
  return z.object({
    addressId: z.string(),
    operations: z.lazy(() => CustomerAddressPatchInputSchema())
  })
}

export function CustomerAddressValidationStatusFilterSchema(): z.ZodObject<Properties<CustomerAddressValidationStatusFilter>> {
  return z.object({
    _eq: CustomerAddressValidationStatusSchema.nullish(),
    _in: z.array(CustomerAddressValidationStatusSchema).nullish(),
    _neq: CustomerAddressValidationStatusSchema.nullish(),
    _notIn: z.array(CustomerAddressValidationStatusSchema).nullish()
  })
}

export function CustomerAddressWhereInputSchema(): z.ZodObject<Properties<CustomerAddressWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerAddressWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerAddressWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerAddressWhereInputSchema())).nullish(),
    city: z.lazy(() => StringFilterSchema().nullish()),
    companyName: z.lazy(() => StringFilterSchema().nullish()),
    countryCode: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    firstName: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isDefaultBilling: z.lazy(() => BooleanFilterSchema().nullish()),
    isDefaultShipping: z.lazy(() => BooleanFilterSchema().nullish()),
    label: z.lazy(() => StringFilterSchema().nullish()),
    lastName: z.lazy(() => StringFilterSchema().nullish()),
    phoneE164: z.lazy(() => StringFilterSchema().nullish()),
    postalCode: z.lazy(() => StringFilterSchema().nullish()),
    regionCode: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    validationStatus: z.lazy(() => CustomerAddressValidationStatusFilterSchema().nullish())
  })
}

export function CustomerAddressesUpdateInputSchema(): z.ZodObject<Properties<CustomerAddressesUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => CustomerAddressCreateOperationInputSchema())).nullish(),
    defaultBillingAddressId: z.string().nullish(),
    defaultShippingAddressId: z.string().nullish(),
    deleteIds: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => CustomerAddressUpdateOperationInputSchema())).nullish()
  })
}

export function CustomerAssignmentSourceFilterSchema(): z.ZodObject<Properties<CustomerAssignmentSourceFilter>> {
  return z.object({
    _eq: CustomerAssignmentSourceSchema.nullish(),
    _in: z.array(CustomerAssignmentSourceSchema).nullish(),
    _neq: CustomerAssignmentSourceSchema.nullish(),
    _notIn: z.array(CustomerAssignmentSourceSchema).nullish()
  })
}

export function CustomerCompanyUpdateInputSchema(): z.ZodObject<Properties<CustomerCompanyUpdateInput>> {
  return z.object({
    companyName: z.string().nullish(),
    jobTitle: z.string().nullish()
  })
}

export function CustomerConsentEventOrderByInputSchema(): z.ZodObject<Properties<CustomerConsentEventOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerConsentEventOrderFieldSchema
  })
}

export function CustomerConsentStateFilterSchema(): z.ZodObject<Properties<CustomerConsentStateFilter>> {
  return z.object({
    _eq: CustomerConsentStateSchema.nullish(),
    _in: z.array(CustomerConsentStateSchema).nullish(),
    _neq: CustomerConsentStateSchema.nullish(),
    _notIn: z.array(CustomerConsentStateSchema).nullish()
  })
}

export function CustomerConsentUpdateOperationInputSchema(): z.ZodObject<Properties<CustomerConsentUpdateOperationInput>> {
  return z.object({
    channel: CustomerConsentChannelSchema,
    contactPoint: z.string(),
    evidence: z.record(z.unknown()).nullish(),
    optInLevel: CustomerConsentOptInLevelSchema.nullish(),
    sourceLocationId: z.string().nullish(),
    state: CustomerConsentAdminStateSchema
  })
}

export function CustomerConsentsUpdateInputSchema(): z.ZodObject<Properties<CustomerConsentsUpdateInput>> {
  return z.object({
    set: z.array(z.lazy(() => CustomerConsentUpdateOperationInputSchema()))
  })
}

export function CustomerContactUpdateInputSchema(): z.ZodObject<Properties<CustomerContactUpdateInput>> {
  return z.object({
    email: z.string().email().nullish(),
    phoneE164: z.string().nullish()
  })
}

export function CustomerCreateInputSchema(): z.ZodObject<Properties<CustomerCreateInput>> {
  return z.object({
    companyName: z.string().nullish(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    email: z.string().email().nullish(),
    firstName: z.string().nullish(),
    gender: z.string().nullish(),
    jobTitle: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    moderationNote: z.string().nullish(),
    note: z.string().nullish(),
    phoneE164: z.string().nullish(),
    preferredLocale: z.string().nullish(),
    prefix: z.string().nullish(),
    suffix: z.string().nullish()
  })
}

export function CustomerDataRequestCancelOperationInputSchema(): z.ZodObject<Properties<CustomerDataRequestCancelOperationInput>> {
  return z.object({
    reason: z.string().nullish()
  })
}

export function CustomerDataRequestCreateInputSchema(): z.ZodObject<Properties<CustomerDataRequestCreateInput>> {
  return z.object({
    customerId: z.string(),
    dueAt: z.string().nullish(),
    legalBasis: z.string().nullish(),
    requestMetadata: z.record(z.unknown()).nullish(),
    type: CustomerDataRequestTypeSchema
  })
}

export function CustomerDataRequestDeleteInputSchema(): z.ZodObject<Properties<CustomerDataRequestDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerDataRequestOrderByInputSchema(): z.ZodObject<Properties<CustomerDataRequestOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerDataRequestOrderFieldSchema
  })
}

export function CustomerDataRequestStatusFilterSchema(): z.ZodObject<Properties<CustomerDataRequestStatusFilter>> {
  return z.object({
    _eq: CustomerDataRequestStatusSchema.nullish(),
    _in: z.array(CustomerDataRequestStatusSchema).nullish(),
    _neq: CustomerDataRequestStatusSchema.nullish(),
    _notIn: z.array(CustomerDataRequestStatusSchema).nullish()
  })
}

export function CustomerDataRequestTypeFilterSchema(): z.ZodObject<Properties<CustomerDataRequestTypeFilter>> {
  return z.object({
    _eq: CustomerDataRequestTypeSchema.nullish(),
    _in: z.array(CustomerDataRequestTypeSchema).nullish(),
    _neq: CustomerDataRequestTypeSchema.nullish(),
    _notIn: z.array(CustomerDataRequestTypeSchema).nullish()
  })
}

export function CustomerDataRequestUpdateInputSchema(): z.ZodObject<Properties<CustomerDataRequestUpdateInput>> {
  return z.object({
    cancel: z.lazy(() => CustomerDataRequestCancelOperationInputSchema().nullish()),
    customerId: z.string().nullish(),
    dueAt: z.string().nullish(),
    legalBasis: z.string().nullish(),
    requestMetadata: z.record(z.unknown()).nullish(),
    type: CustomerDataRequestTypeSchema.nullish()
  })
}

export function CustomerDataRequestWhereInputSchema(): z.ZodObject<Properties<CustomerDataRequestWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerDataRequestWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerDataRequestWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerDataRequestWhereInputSchema())).nullish(),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    dueAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    finishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    legalBasis: z.lazy(() => StringFilterSchema().nullish()),
    requestedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    requestedById: z.lazy(() => StringFilterSchema().nullish()),
    requestedByType: z.lazy(() => StringFilterSchema().nullish()),
    startedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    status: z.lazy(() => CustomerDataRequestStatusFilterSchema().nullish()),
    type: z.lazy(() => CustomerDataRequestTypeFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerDeleteInputSchema(): z.ZodObject<Properties<CustomerDeleteInput>> {
  return z.object({
    expectedRevision: z.number().nullish(),
    id: z.string()
  })
}

export function CustomerGroupCreateInputSchema(): z.ZodObject<Properties<CustomerGroupCreateInput>> {
  return z.object({
    code: z.string(),
    description: z.string().nullish(),
    isActive: z.boolean().default(true).nullish(),
    isDefault: z.boolean().default(false).nullish(),
    name: z.string()
  })
}

export function CustomerGroupDefinitionUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupDefinitionUpdateInput>> {
  return z.object({
    code: z.string().nullish(),
    description: z.string().nullish(),
    name: z.string().nullish()
  })
}

export function CustomerGroupDeleteInputSchema(): z.ZodObject<Properties<CustomerGroupDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerGroupMembershipOrderByInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerGroupMembershipOrderFieldSchema
  })
}

export function CustomerGroupMembershipRelationCreateInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipRelationCreateInput>> {
  return z.object({
    customerId: z.string(),
    expiresAt: z.string().nullish(),
    isPrimary: z.boolean().default(false).nullish()
  })
}

export function CustomerGroupMembershipRelationUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipRelationUpdateInput>> {
  return z.object({
    expiresAt: z.string().nullish(),
    isPrimary: z.boolean().nullish(),
    membershipId: z.string()
  })
}

export function CustomerGroupMembershipRelationsUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipRelationsUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => CustomerGroupMembershipRelationCreateInputSchema())).nullish(),
    deleteIds: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => CustomerGroupMembershipRelationUpdateInputSchema())).nullish()
  })
}

export function CustomerGroupMembershipUpdateOperationInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipUpdateOperationInput>> {
  return z.object({
    expiresAt: z.string().nullish(),
    groupId: z.string(),
    isPrimary: z.boolean().default(false).nullish()
  })
}

export function CustomerGroupMembershipWhereInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerGroupMembershipWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerGroupMembershipWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerGroupMembershipWhereInputSchema())).nullish(),
    assignedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    expiresAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    groupId: z.lazy(() => IdFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isPrimary: z.lazy(() => BooleanFilterSchema().nullish()),
    source: z.lazy(() => CustomerAssignmentSourceFilterSchema().nullish())
  })
}

export function CustomerGroupMembershipsUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipsUpdateInput>> {
  return z.object({
    memberships: z.array(z.lazy(() => CustomerGroupMembershipUpdateOperationInputSchema()))
  })
}

export function CustomerGroupOrderByInputSchema(): z.ZodObject<Properties<CustomerGroupOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerGroupOrderFieldSchema
  })
}

export function CustomerGroupStateUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupStateUpdateInput>> {
  return z.object({
    isActive: z.boolean().nullish(),
    isDefault: z.boolean().nullish()
  })
}

export function CustomerGroupUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupUpdateInput>> {
  return z.object({
    definition: z.lazy(() => CustomerGroupDefinitionUpdateInputSchema().nullish()),
    memberships: z.lazy(() => CustomerGroupMembershipRelationsUpdateInputSchema().nullish()),
    state: z.lazy(() => CustomerGroupStateUpdateInputSchema().nullish())
  })
}

export function CustomerGroupWhereInputSchema(): z.ZodObject<Properties<CustomerGroupWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerGroupWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerGroupWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerGroupWhereInputSchema())).nullish(),
    code: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    isActive: z.lazy(() => BooleanFilterSchema().nullish()),
    isDefault: z.lazy(() => BooleanFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    revision: z.lazy(() => IntFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerLifecycleStatusFilterSchema(): z.ZodObject<Properties<CustomerLifecycleStatusFilter>> {
  return z.object({
    _eq: CustomerLifecycleStatusSchema.nullish(),
    _in: z.array(CustomerLifecycleStatusSchema).nullish(),
    _neq: CustomerLifecycleStatusSchema.nullish(),
    _notIn: z.array(CustomerLifecycleStatusSchema).nullish()
  })
}

export function CustomerMergeCreateInputSchema(): z.ZodObject<Properties<CustomerMergeCreateInput>> {
  return z.object({
    reason: z.string().nullish(),
    sourceCustomerId: z.string(),
    targetCustomerId: z.string()
  })
}

export function CustomerMergeDeleteInputSchema(): z.ZodObject<Properties<CustomerMergeDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerMergeOrderByInputSchema(): z.ZodObject<Properties<CustomerMergeOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerMergeOrderFieldSchema
  })
}

export function CustomerMergeStatusFilterSchema(): z.ZodObject<Properties<CustomerMergeStatusFilter>> {
  return z.object({
    _eq: CustomerMergeStatusSchema.nullish(),
    _in: z.array(CustomerMergeStatusSchema).nullish(),
    _neq: CustomerMergeStatusSchema.nullish(),
    _notIn: z.array(CustomerMergeStatusSchema).nullish()
  })
}

export function CustomerMergeUpdateInputSchema(): z.ZodObject<Properties<CustomerMergeUpdateInput>> {
  return z.object({
    reason: z.string().nullish(),
    sourceCustomerId: z.string().nullish(),
    targetCustomerId: z.string().nullish()
  })
}

export function CustomerMergeWhereInputSchema(): z.ZodObject<Properties<CustomerMergeWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerMergeWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerMergeWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerMergeWhereInputSchema())).nullish(),
    errorCode: z.lazy(() => StringFilterSchema().nullish()),
    finishedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    idempotencyKey: z.lazy(() => StringFilterSchema().nullish()),
    requestedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    requestedById: z.lazy(() => StringFilterSchema().nullish()),
    requestedByType: z.lazy(() => StringFilterSchema().nullish()),
    sourceCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    startedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    status: z.lazy(() => CustomerMergeStatusFilterSchema().nullish()),
    targetCustomerId: z.lazy(() => IdFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerModerationUpdateInputSchema(): z.ZodObject<Properties<CustomerModerationUpdateInput>> {
  return z.object({
    moderationNote: z.string().nullish()
  })
}

export function CustomerMonetaryStatisticsOrderByInputSchema(): z.ZodObject<Properties<CustomerMonetaryStatisticsOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerMonetaryStatisticsOrderFieldSchema
  })
}

export function CustomerMonetaryStatisticsWhereInputSchema(): z.ZodObject<Properties<CustomerMonetaryStatisticsWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerMonetaryStatisticsWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerMonetaryStatisticsWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerMonetaryStatisticsWhereInputSchema())).nullish(),
    averageOrderValueMinor: z.lazy(() => BigIntFilterSchema().nullish()),
    currencyCode: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    netSpentMinor: z.lazy(() => BigIntFilterSchema().nullish()),
    ordersCount: z.lazy(() => IntFilterSchema().nullish()),
    totalRefundedMinor: z.lazy(() => BigIntFilterSchema().nullish()),
    totalSpentMinor: z.lazy(() => BigIntFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerNoteUpdateInputSchema(): z.ZodObject<Properties<CustomerNoteUpdateInput>> {
  return z.object({
    note: z.string().nullish()
  })
}

export function CustomerOrderByInputSchema(): z.ZodObject<Properties<CustomerOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerOrderFieldSchema
  })
}

export function CustomerProfileUpdateInputSchema(): z.ZodObject<Properties<CustomerProfileUpdateInput>> {
  return z.object({
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    firstName: z.string().nullish(),
    gender: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    preferredLocale: z.string().nullish(),
    prefix: z.string().nullish(),
    suffix: z.string().nullish()
  })
}

export function CustomerSegmentCreateInputSchema(): z.ZodObject<Properties<CustomerSegmentCreateInput>> {
  return z.object({
    color: z.string().nullish(),
    definition: z.record(z.unknown()).nullish(),
    description: z.string().nullish(),
    name: z.string(),
    query: z.string().nullish(),
    status: CustomerSegmentStatusSchema.nullish(),
    type: CustomerSegmentTypeSchema
  })
}

export function CustomerSegmentDefinitionUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentDefinitionUpdateInput>> {
  return z.object({
    definition: z.record(z.unknown()).nullish(),
    query: z.string().nullish(),
    type: CustomerSegmentTypeSchema.nullish()
  })
}

export function CustomerSegmentDeleteInputSchema(): z.ZodObject<Properties<CustomerSegmentDeleteInput>> {
  return z.object({
    expectedRevision: z.number().nullish(),
    id: z.string()
  })
}

export function CustomerSegmentDetailsUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentDetailsUpdateInput>> {
  return z.object({
    color: z.string().nullish(),
    description: z.string().nullish(),
    name: z.string().nullish()
  })
}

export function CustomerSegmentMembershipOrderByInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerSegmentMembershipOrderFieldSchema
  })
}

export function CustomerSegmentMembershipRelationCreateInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipRelationCreateInput>> {
  return z.object({
    customerId: z.string(),
    expiresAt: z.string().nullish()
  })
}

export function CustomerSegmentMembershipRelationUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipRelationUpdateInput>> {
  return z.object({
    expiresAt: z.string().nullish(),
    membershipId: z.string()
  })
}

export function CustomerSegmentMembershipRelationsUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipRelationsUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => CustomerSegmentMembershipRelationCreateInputSchema())).nullish(),
    deleteIds: z.array(z.string()).nullish(),
    setCustomerIds: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => CustomerSegmentMembershipRelationUpdateInputSchema())).nullish()
  })
}

export function CustomerSegmentMembershipWhereInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerSegmentMembershipWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerSegmentMembershipWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerSegmentMembershipWhereInputSchema())).nullish(),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    evaluatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    expiresAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    segmentId: z.lazy(() => IdFilterSchema().nullish()),
    source: z.lazy(() => CustomerAssignmentSourceFilterSchema().nullish())
  })
}

export function CustomerSegmentMembershipsUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipsUpdateInput>> {
  return z.object({
    segmentIds: z.array(z.string())
  })
}

export function CustomerSegmentOrderByInputSchema(): z.ZodObject<Properties<CustomerSegmentOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerSegmentOrderFieldSchema
  })
}

export function CustomerSegmentStateUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentStateUpdateInput>> {
  return z.object({
    status: CustomerSegmentStatusSchema.nullish()
  })
}

export function CustomerSegmentStatusFilterSchema(): z.ZodObject<Properties<CustomerSegmentStatusFilter>> {
  return z.object({
    _eq: CustomerSegmentStatusSchema.nullish(),
    _in: z.array(CustomerSegmentStatusSchema).nullish(),
    _neq: CustomerSegmentStatusSchema.nullish(),
    _notIn: z.array(CustomerSegmentStatusSchema).nullish()
  })
}

export function CustomerSegmentTypeFilterSchema(): z.ZodObject<Properties<CustomerSegmentTypeFilter>> {
  return z.object({
    _eq: CustomerSegmentTypeSchema.nullish(),
    _in: z.array(CustomerSegmentTypeSchema).nullish(),
    _neq: CustomerSegmentTypeSchema.nullish(),
    _notIn: z.array(CustomerSegmentTypeSchema).nullish()
  })
}

export function CustomerSegmentUpdateInputSchema(): z.ZodObject<Properties<CustomerSegmentUpdateInput>> {
  return z.object({
    definition: z.lazy(() => CustomerSegmentDefinitionUpdateInputSchema().nullish()),
    details: z.lazy(() => CustomerSegmentDetailsUpdateInputSchema().nullish()),
    memberships: z.lazy(() => CustomerSegmentMembershipRelationsUpdateInputSchema().nullish()),
    state: z.lazy(() => CustomerSegmentStateUpdateInputSchema().nullish())
  })
}

export function CustomerSegmentWhereInputSchema(): z.ZodObject<Properties<CustomerSegmentWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerSegmentWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerSegmentWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerSegmentWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    createdById: z.lazy(() => StringFilterSchema().nullish()),
    customersCount: z.lazy(() => IntFilterSchema().nullish()),
    description: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => CustomerSegmentStatusFilterSchema().nullish()),
    type: z.lazy(() => CustomerSegmentTypeFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerStatusUpdateInputSchema(): z.ZodObject<Properties<CustomerStatusUpdateInput>> {
  return z.object({
    blockedReason: z.string().nullish(),
    status: CustomerAdminLifecycleStatusSchema
  })
}

export function CustomerTagAssignmentOrderByInputSchema(): z.ZodObject<Properties<CustomerTagAssignmentOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTagAssignmentOrderFieldSchema
  })
}

export function CustomerTagAssignmentRelationCreateInputSchema(): z.ZodObject<Properties<CustomerTagAssignmentRelationCreateInput>> {
  return z.object({
    customerId: z.string()
  })
}

export function CustomerTagAssignmentRelationsUpdateInputSchema(): z.ZodObject<Properties<CustomerTagAssignmentRelationsUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => CustomerTagAssignmentRelationCreateInputSchema())).nullish(),
    deleteIds: z.array(z.string()).nullish()
  })
}

export function CustomerTagAssignmentWhereInputSchema(): z.ZodObject<Properties<CustomerTagAssignmentWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerTagAssignmentWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerTagAssignmentWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerTagAssignmentWhereInputSchema())).nullish(),
    assignedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    assignedById: z.lazy(() => StringFilterSchema().nullish()),
    customerId: z.lazy(() => IdFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    tagId: z.lazy(() => IdFilterSchema().nullish())
  })
}

export function CustomerTagAssignmentsUpdateInputSchema(): z.ZodObject<Properties<CustomerTagAssignmentsUpdateInput>> {
  return z.object({
    tagIds: z.array(z.string())
  })
}

export function CustomerTagCreateInputSchema(): z.ZodObject<Properties<CustomerTagCreateInput>> {
  return z.object({
    name: z.string()
  })
}

export function CustomerTagDeleteInputSchema(): z.ZodObject<Properties<CustomerTagDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerTagOrderByInputSchema(): z.ZodObject<Properties<CustomerTagOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTagOrderFieldSchema
  })
}

export function CustomerTagUpdateInputSchema(): z.ZodObject<Properties<CustomerTagUpdateInput>> {
  return z.object({
    assignments: z.lazy(() => CustomerTagAssignmentRelationsUpdateInputSchema().nullish()),
    name: z.string().nullish()
  })
}

export function CustomerTagWhereInputSchema(): z.ZodObject<Properties<CustomerTagWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerTagWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerTagWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerTagWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    normalizedName: z.lazy(() => StringFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerTaxExemptionCreateOperationInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionCreateOperationInput>> {
  return z.object({
    certificateFileId: z.string().nullish(),
    code: z.string(),
    countryCode: z.string().nullish(),
    reason: z.string().nullish(),
    regionCode: z.string().nullish(),
    status: CustomerTaxExemptionStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish()
  })
}

export function CustomerTaxExemptionOrderByInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTaxExemptionOrderFieldSchema
  })
}

export function CustomerTaxExemptionPatchInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionPatchInput>> {
  return z.object({
    certificateFileId: z.string().nullish(),
    code: z.string().nullish(),
    countryCode: z.string().nullish(),
    reason: z.string().nullish(),
    regionCode: z.string().nullish(),
    status: CustomerTaxExemptionStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish()
  })
}

export function CustomerTaxExemptionStatusFilterSchema(): z.ZodObject<Properties<CustomerTaxExemptionStatusFilter>> {
  return z.object({
    _eq: CustomerTaxExemptionStatusSchema.nullish(),
    _in: z.array(CustomerTaxExemptionStatusSchema).nullish(),
    _neq: CustomerTaxExemptionStatusSchema.nullish(),
    _notIn: z.array(CustomerTaxExemptionStatusSchema).nullish()
  })
}

export function CustomerTaxExemptionUpdateOperationInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionUpdateOperationInput>> {
  return z.object({
    operations: z.lazy(() => CustomerTaxExemptionPatchInputSchema()),
    taxExemptionId: z.string()
  })
}

export function CustomerTaxExemptionWhereInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerTaxExemptionWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerTaxExemptionWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerTaxExemptionWhereInputSchema())).nullish(),
    code: z.lazy(() => StringFilterSchema().nullish()),
    countryCode: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    regionCode: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => CustomerTaxExemptionStatusFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    validFrom: z.lazy(() => DateFilterSchema().nullish()),
    validTo: z.lazy(() => DateFilterSchema().nullish())
  })
}

export function CustomerTaxExemptionsUpdateInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionsUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => CustomerTaxExemptionCreateOperationInputSchema())).nullish(),
    deleteIds: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => CustomerTaxExemptionUpdateOperationInputSchema())).nullish()
  })
}

export function CustomerTaxIdentifierCreateOperationInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierCreateOperationInput>> {
  return z.object({
    countryCode: z.string().nullish(),
    identifierType: z.string(),
    isPrimary: z.boolean().default(false).nullish(),
    status: CustomerTaxIdentifierStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    value: z.string()
  })
}

export function CustomerTaxIdentifierOrderByInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTaxIdentifierOrderFieldSchema
  })
}

export function CustomerTaxIdentifierPatchInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierPatchInput>> {
  return z.object({
    countryCode: z.string().nullish(),
    identifierType: z.string().nullish(),
    isPrimary: z.boolean().nullish(),
    status: CustomerTaxIdentifierStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    value: z.string().nullish()
  })
}

export function CustomerTaxIdentifierStatusFilterSchema(): z.ZodObject<Properties<CustomerTaxIdentifierStatusFilter>> {
  return z.object({
    _eq: CustomerTaxIdentifierStatusSchema.nullish(),
    _in: z.array(CustomerTaxIdentifierStatusSchema).nullish(),
    _neq: CustomerTaxIdentifierStatusSchema.nullish(),
    _notIn: z.array(CustomerTaxIdentifierStatusSchema).nullish()
  })
}

export function CustomerTaxIdentifierUpdateOperationInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierUpdateOperationInput>> {
  return z.object({
    operations: z.lazy(() => CustomerTaxIdentifierPatchInputSchema()),
    taxIdentifierId: z.string()
  })
}

export function CustomerTaxIdentifierWhereInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerTaxIdentifierWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerTaxIdentifierWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerTaxIdentifierWhereInputSchema())).nullish(),
    countryCode: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    identifierType: z.lazy(() => StringFilterSchema().nullish()),
    isPrimary: z.lazy(() => BooleanFilterSchema().nullish()),
    status: z.lazy(() => CustomerTaxIdentifierStatusFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    validFrom: z.lazy(() => DateFilterSchema().nullish()),
    validTo: z.lazy(() => DateFilterSchema().nullish()),
    value: z.lazy(() => StringFilterSchema().nullish())
  })
}

export function CustomerTaxIdentifiersUpdateInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifiersUpdateInput>> {
  return z.object({
    create: z.array(z.lazy(() => CustomerTaxIdentifierCreateOperationInputSchema())).nullish(),
    deleteIds: z.array(z.string()).nullish(),
    update: z.array(z.lazy(() => CustomerTaxIdentifierUpdateOperationInputSchema())).nullish()
  })
}

export function CustomerUpdateInputSchema(): z.ZodObject<Properties<CustomerUpdateInput>> {
  return z.object({
    addresses: z.lazy(() => CustomerAddressesUpdateInputSchema().nullish()),
    company: z.lazy(() => CustomerCompanyUpdateInputSchema().nullish()),
    consents: z.lazy(() => CustomerConsentsUpdateInputSchema().nullish()),
    contact: z.lazy(() => CustomerContactUpdateInputSchema().nullish()),
    groups: z.lazy(() => CustomerGroupMembershipsUpdateInputSchema().nullish()),
    moderation: z.lazy(() => CustomerModerationUpdateInputSchema().nullish()),
    note: z.lazy(() => CustomerNoteUpdateInputSchema().nullish()),
    profile: z.lazy(() => CustomerProfileUpdateInputSchema().nullish()),
    segments: z.lazy(() => CustomerSegmentMembershipsUpdateInputSchema().nullish()),
    status: z.lazy(() => CustomerStatusUpdateInputSchema().nullish()),
    tags: z.lazy(() => CustomerTagAssignmentsUpdateInputSchema().nullish()),
    taxExemptions: z.lazy(() => CustomerTaxExemptionsUpdateInputSchema().nullish()),
    taxIdentifiers: z.lazy(() => CustomerTaxIdentifiersUpdateInputSchema().nullish())
  })
}

export function CustomerWhereInputSchema(): z.ZodObject<Properties<CustomerWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerWhereInputSchema())).nullish(),
    accountStatus: z.lazy(() => CustomerAccountStatusFilterSchema().nullish()),
    companyName: z.lazy(() => StringFilterSchema().nullish()),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    dateOfBirth: z.lazy(() => DateFilterSchema().nullish()),
    defaultShippingCity: z.lazy(() => StringFilterSchema().nullish()),
    defaultShippingCountryCode: z.lazy(() => StringFilterSchema().nullish()),
    defaultShippingRegionCode: z.lazy(() => StringFilterSchema().nullish()),
    displayName: z.lazy(() => StringFilterSchema().nullish()),
    email: z.lazy(() => StringFilterSchema().nullish()),
    emailMarketingState: z.lazy(() => CustomerConsentStateFilterSchema().nullish()),
    emailVerified: z.lazy(() => BooleanFilterSchema().nullish()),
    firstName: z.lazy(() => StringFilterSchema().nullish()),
    iamPrincipalId: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    lastActivityAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    lastName: z.lazy(() => StringFilterSchema().nullish()),
    lastOrderAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    lifecycleStatus: z.lazy(() => CustomerLifecycleStatusFilterSchema().nullish()),
    ordersCount: z.lazy(() => IntFilterSchema().nullish()),
    phoneE164: z.lazy(() => StringFilterSchema().nullish()),
    phoneVerified: z.lazy(() => BooleanFilterSchema().nullish()),
    preferredLocale: z.lazy(() => StringFilterSchema().nullish()),
    segmentId: z.lazy(() => IdFilterSchema().nullish()),
    source: z.lazy(() => StringFilterSchema().nullish()),
    totalSpentMinor: z.lazy(() => BigIntFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function DateFilterSchema(): z.ZodObject<Properties<DateFilter>> {
  return z.object({
    _between: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish(),
    _eq: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    _gt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    _gte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    _in: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish(),
    _is: z.boolean().nullish(),
    _isNot: z.boolean().nullish(),
    _lt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    _lte: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    _neq: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    _notIn: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullish()
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

export function FloatFilterSchema(): z.ZodObject<Properties<FloatFilter>> {
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
