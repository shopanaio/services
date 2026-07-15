import { z } from 'zod'
import { BigIntFilter, BooleanFilter, CurrencyCode, CustomerAccountStatus, CustomerAccountStatusFilter, CustomerAddressCreateInput, CustomerAddressDefaultsUpdateInput, CustomerAddressDeleteInput, CustomerAddressOrderByInput, CustomerAddressOrderField, CustomerAddressUpdateInput, CustomerAddressValidationStatus, CustomerAddressValidationStatusFilter, CustomerAddressWhereInput, CustomerAssignmentSource, CustomerAssignmentSourceFilter, CustomerConsentAdminState, CustomerConsentChannel, CustomerConsentEventOrderByInput, CustomerConsentEventOrderField, CustomerConsentOptInLevel, CustomerConsentSetInput, CustomerConsentState, CustomerCreateInput, CustomerDataRequestCancelInput, CustomerDataRequestCreateInput, CustomerDataRequestOrderByInput, CustomerDataRequestOrderField, CustomerDataRequestStatus, CustomerDataRequestStatusFilter, CustomerDataRequestType, CustomerDataRequestTypeFilter, CustomerDataRequestWhereInput, CustomerGroupCreateInput, CustomerGroupDeleteInput, CustomerGroupMembershipDeleteInput, CustomerGroupMembershipOrderByInput, CustomerGroupMembershipOrderField, CustomerGroupMembershipSetInput, CustomerGroupMembershipWhereInput, CustomerGroupOrderByInput, CustomerGroupOrderField, CustomerGroupUpdateInput, CustomerGroupWhereInput, CustomerLifecycleStatus, CustomerLifecycleStatusFilter, CustomerMergeOrderByInput, CustomerMergeOrderField, CustomerMergeRequestInput, CustomerMergeStatus, CustomerMergeStatusFilter, CustomerMergeWhereInput, CustomerMonetaryStatisticsOrderByInput, CustomerMonetaryStatisticsOrderField, CustomerMonetaryStatisticsWhereInput, CustomerOrderByInput, CustomerOrderField, CustomerSegmentCreateInput, CustomerSegmentCustomersAddInput, CustomerSegmentCustomersRemoveInput, CustomerSegmentDeleteInput, CustomerSegmentMembershipOrderByInput, CustomerSegmentMembershipOrderField, CustomerSegmentMembershipWhereInput, CustomerSegmentOrderByInput, CustomerSegmentOrderField, CustomerSegmentStatus, CustomerSegmentStatusFilter, CustomerSegmentType, CustomerSegmentTypeFilter, CustomerSegmentUpdateInput, CustomerSegmentWhereInput, CustomerTagAssignInput, CustomerTagAssignmentOrderByInput, CustomerTagAssignmentOrderField, CustomerTagAssignmentWhereInput, CustomerTagCreateInput, CustomerTagDeleteInput, CustomerTagOrderByInput, CustomerTagOrderField, CustomerTagUnassignInput, CustomerTagUpdateInput, CustomerTagWhereInput, CustomerTaxExemptionCreateInput, CustomerTaxExemptionDeleteInput, CustomerTaxExemptionOrderByInput, CustomerTaxExemptionOrderField, CustomerTaxExemptionStatus, CustomerTaxExemptionStatusFilter, CustomerTaxExemptionUpdateInput, CustomerTaxExemptionWhereInput, CustomerTaxIdentifierCreateInput, CustomerTaxIdentifierDeleteInput, CustomerTaxIdentifierOrderByInput, CustomerTaxIdentifierOrderField, CustomerTaxIdentifierStatus, CustomerTaxIdentifierStatusFilter, CustomerTaxIdentifierUpdateInput, CustomerTaxIdentifierWhereInput, CustomerUpdateInput, CustomerWhereInput, DateFilter, DateTimeFilter, DimensionUnit, FloatFilter, IdFilter, IntFilter, LocaleCode, SortDirection, StringFilter, WeightUnit } from './types.js'

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

export function CustomerAddressCreateInputSchema(): z.ZodObject<Properties<CustomerAddressCreateInput>> {
  return z.object({
    address1: z.string(),
    address2: z.string().nullish(),
    city: z.string(),
    companyName: z.string().nullish(),
    countryCode: z.string(),
    customerId: z.string(),
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

export function CustomerAddressDefaultsUpdateInputSchema(): z.ZodObject<Properties<CustomerAddressDefaultsUpdateInput>> {
  return z.object({
    billingAddressId: z.string().nullish(),
    customerId: z.string(),
    shippingAddressId: z.string().nullish()
  })
}

export function CustomerAddressDeleteInputSchema(): z.ZodObject<Properties<CustomerAddressDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerAddressOrderByInputSchema(): z.ZodObject<Properties<CustomerAddressOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerAddressOrderFieldSchema
  })
}

export function CustomerAddressUpdateInputSchema(): z.ZodObject<Properties<CustomerAddressUpdateInput>> {
  return z.object({
    address1: z.string().nullish(),
    address2: z.string().nullish(),
    city: z.string().nullish(),
    companyName: z.string().nullish(),
    countryCode: z.string().nullish(),
    firstName: z.string().nullish(),
    id: z.string(),
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

export function CustomerAssignmentSourceFilterSchema(): z.ZodObject<Properties<CustomerAssignmentSourceFilter>> {
  return z.object({
    _eq: CustomerAssignmentSourceSchema.nullish(),
    _in: z.array(CustomerAssignmentSourceSchema).nullish(),
    _neq: CustomerAssignmentSourceSchema.nullish(),
    _notIn: z.array(CustomerAssignmentSourceSchema).nullish()
  })
}

export function CustomerConsentEventOrderByInputSchema(): z.ZodObject<Properties<CustomerConsentEventOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerConsentEventOrderFieldSchema
  })
}

export function CustomerConsentSetInputSchema(): z.ZodObject<Properties<CustomerConsentSetInput>> {
  return z.object({
    channel: CustomerConsentChannelSchema,
    contactPoint: z.string(),
    customerId: z.string(),
    evidence: z.record(z.unknown()).nullish(),
    optInLevel: CustomerConsentOptInLevelSchema.nullish(),
    sourceLocationId: z.string().nullish(),
    state: CustomerConsentAdminStateSchema
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
    note: z.string().nullish(),
    phoneE164: z.string().nullish(),
    preferredLocale: z.string().nullish(),
    prefix: z.string().nullish(),
    suffix: z.string().nullish()
  })
}

export function CustomerDataRequestCancelInputSchema(): z.ZodObject<Properties<CustomerDataRequestCancelInput>> {
  return z.object({
    id: z.string(),
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

export function CustomerGroupCreateInputSchema(): z.ZodObject<Properties<CustomerGroupCreateInput>> {
  return z.object({
    code: z.string(),
    description: z.string().nullish(),
    isActive: z.boolean().default(true).nullish(),
    isDefault: z.boolean().default(false).nullish(),
    name: z.string()
  })
}

export function CustomerGroupDeleteInputSchema(): z.ZodObject<Properties<CustomerGroupDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerGroupMembershipDeleteInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipDeleteInput>> {
  return z.object({
    customerId: z.string(),
    groupId: z.string()
  })
}

export function CustomerGroupMembershipOrderByInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerGroupMembershipOrderFieldSchema
  })
}

export function CustomerGroupMembershipSetInputSchema(): z.ZodObject<Properties<CustomerGroupMembershipSetInput>> {
  return z.object({
    customerId: z.string(),
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

export function CustomerGroupOrderByInputSchema(): z.ZodObject<Properties<CustomerGroupOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerGroupOrderFieldSchema
  })
}

export function CustomerGroupUpdateInputSchema(): z.ZodObject<Properties<CustomerGroupUpdateInput>> {
  return z.object({
    code: z.string().nullish(),
    description: z.string().nullish(),
    id: z.string(),
    isActive: z.boolean().nullish(),
    isDefault: z.boolean().nullish(),
    name: z.string().nullish()
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

export function CustomerMergeOrderByInputSchema(): z.ZodObject<Properties<CustomerMergeOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerMergeOrderFieldSchema
  })
}

export function CustomerMergeRequestInputSchema(): z.ZodObject<Properties<CustomerMergeRequestInput>> {
  return z.object({
    reason: z.string().nullish(),
    sourceCustomerId: z.string(),
    targetCustomerId: z.string()
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

export function CustomerOrderByInputSchema(): z.ZodObject<Properties<CustomerOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerOrderFieldSchema
  })
}

export function CustomerSegmentCreateInputSchema(): z.ZodObject<Properties<CustomerSegmentCreateInput>> {
  return z.object({
    definition: z.record(z.unknown()).nullish(),
    description: z.string().nullish(),
    name: z.string(),
    query: z.string().nullish(),
    status: CustomerSegmentStatusSchema.nullish(),
    type: CustomerSegmentTypeSchema
  })
}

export function CustomerSegmentCustomersAddInputSchema(): z.ZodObject<Properties<CustomerSegmentCustomersAddInput>> {
  return z.object({
    customerIds: z.array(z.string()),
    segmentId: z.string()
  })
}

export function CustomerSegmentCustomersRemoveInputSchema(): z.ZodObject<Properties<CustomerSegmentCustomersRemoveInput>> {
  return z.object({
    customerIds: z.array(z.string()),
    segmentId: z.string()
  })
}

export function CustomerSegmentDeleteInputSchema(): z.ZodObject<Properties<CustomerSegmentDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerSegmentMembershipOrderByInputSchema(): z.ZodObject<Properties<CustomerSegmentMembershipOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerSegmentMembershipOrderFieldSchema
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

export function CustomerSegmentOrderByInputSchema(): z.ZodObject<Properties<CustomerSegmentOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerSegmentOrderFieldSchema
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
    definition: z.record(z.unknown()).nullish(),
    description: z.string().nullish(),
    id: z.string(),
    name: z.string().nullish(),
    query: z.string().nullish(),
    status: CustomerSegmentStatusSchema.nullish(),
    type: CustomerSegmentTypeSchema.nullish()
  })
}

export function CustomerSegmentWhereInputSchema(): z.ZodObject<Properties<CustomerSegmentWhereInput>> {
  return z.object({
    _and: z.array(z.lazy(() => CustomerSegmentWhereInputSchema())).nullish(),
    _not: z.lazy(() => CustomerSegmentWhereInputSchema().nullish()),
    _or: z.array(z.lazy(() => CustomerSegmentWhereInputSchema())).nullish(),
    createdAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    createdById: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    name: z.lazy(() => StringFilterSchema().nullish()),
    status: z.lazy(() => CustomerSegmentStatusFilterSchema().nullish()),
    type: z.lazy(() => CustomerSegmentTypeFilterSchema().nullish()),
    updatedAt: z.lazy(() => DateTimeFilterSchema().nullish())
  })
}

export function CustomerTagAssignInputSchema(): z.ZodObject<Properties<CustomerTagAssignInput>> {
  return z.object({
    customerId: z.string(),
    tagId: z.string()
  })
}

export function CustomerTagAssignmentOrderByInputSchema(): z.ZodObject<Properties<CustomerTagAssignmentOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTagAssignmentOrderFieldSchema
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

export function CustomerTagUnassignInputSchema(): z.ZodObject<Properties<CustomerTagUnassignInput>> {
  return z.object({
    customerId: z.string(),
    tagId: z.string()
  })
}

export function CustomerTagUpdateInputSchema(): z.ZodObject<Properties<CustomerTagUpdateInput>> {
  return z.object({
    id: z.string(),
    name: z.string()
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

export function CustomerTaxExemptionCreateInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionCreateInput>> {
  return z.object({
    certificateFileId: z.string().nullish(),
    code: z.string(),
    countryCode: z.string().nullish(),
    customerId: z.string(),
    reason: z.string().nullish(),
    regionCode: z.string().nullish(),
    status: CustomerTaxExemptionStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish()
  })
}

export function CustomerTaxExemptionDeleteInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerTaxExemptionOrderByInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTaxExemptionOrderFieldSchema
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

export function CustomerTaxExemptionUpdateInputSchema(): z.ZodObject<Properties<CustomerTaxExemptionUpdateInput>> {
  return z.object({
    certificateFileId: z.string().nullish(),
    code: z.string().nullish(),
    countryCode: z.string().nullish(),
    id: z.string(),
    reason: z.string().nullish(),
    regionCode: z.string().nullish(),
    status: CustomerTaxExemptionStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish()
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

export function CustomerTaxIdentifierCreateInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierCreateInput>> {
  return z.object({
    countryCode: z.string().nullish(),
    customerId: z.string(),
    identifierType: z.string(),
    isPrimary: z.boolean().default(false).nullish(),
    status: CustomerTaxIdentifierStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    value: z.string()
  })
}

export function CustomerTaxIdentifierDeleteInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierDeleteInput>> {
  return z.object({
    id: z.string()
  })
}

export function CustomerTaxIdentifierOrderByInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierOrderByInput>> {
  return z.object({
    direction: SortDirectionSchema,
    field: CustomerTaxIdentifierOrderFieldSchema
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

export function CustomerTaxIdentifierUpdateInputSchema(): z.ZodObject<Properties<CustomerTaxIdentifierUpdateInput>> {
  return z.object({
    countryCode: z.string().nullish(),
    id: z.string(),
    identifierType: z.string().nullish(),
    isPrimary: z.boolean().nullish(),
    status: CustomerTaxIdentifierStatusSchema.nullish(),
    validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    value: z.string().nullish()
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

export function CustomerUpdateInputSchema(): z.ZodObject<Properties<CustomerUpdateInput>> {
  return z.object({
    companyName: z.string().nullish(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    disabled: z.boolean().nullish(),
    email: z.string().email().nullish(),
    expectedRevision: z.number(),
    firstName: z.string().nullish(),
    gender: z.string().nullish(),
    id: z.string(),
    jobTitle: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    note: z.string().nullish(),
    phoneE164: z.string().nullish(),
    preferredLocale: z.string().nullish(),
    prefix: z.string().nullish(),
    suffix: z.string().nullish()
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
    email: z.lazy(() => StringFilterSchema().nullish()),
    emailVerified: z.lazy(() => BooleanFilterSchema().nullish()),
    firstName: z.lazy(() => StringFilterSchema().nullish()),
    iamPrincipalId: z.lazy(() => StringFilterSchema().nullish()),
    id: z.lazy(() => IdFilterSchema().nullish()),
    lastActivityAt: z.lazy(() => DateTimeFilterSchema().nullish()),
    lastName: z.lazy(() => StringFilterSchema().nullish()),
    lifecycleStatus: z.lazy(() => CustomerLifecycleStatusFilterSchema().nullish()),
    phoneE164: z.lazy(() => StringFilterSchema().nullish()),
    phoneVerified: z.lazy(() => BooleanFilterSchema().nullish()),
    preferredLocale: z.lazy(() => StringFilterSchema().nullish()),
    source: z.lazy(() => StringFilterSchema().nullish()),
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
