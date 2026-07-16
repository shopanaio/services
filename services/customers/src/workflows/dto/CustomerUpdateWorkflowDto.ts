import type { UserError } from "../../kernel/BaseScript.js";

export interface CustomerUpdateWorkflowContext {
  organizationId: string;
  storeId: string;
  userId?: string;
  locale?: string;
  requestId: string;
}

export interface CustomerUpdateOperationMeta {
  fieldPrefix: string[];
}

export interface CustomerUpdateWorkflowInput {
  customerId: string;
  expectedRevision?: number;
  operations: CustomerUpdateOperation[];
  context: CustomerUpdateWorkflowContext;
}

export type CustomerUpdateOperation =
  | CustomerProfileUpdateOperation
  | CustomerContactUpdateOperation
  | CustomerCompanyUpdateOperation
  | CustomerStatusUpdateOperation
  | CustomerNoteUpdateOperation
  | CustomerModerationUpdateOperation
  | CustomerAddressesUpdateOperation
  | CustomerConsentsUpdateOperation
  | CustomerTaxIdentifiersUpdateOperation
  | CustomerTaxExemptionsUpdateOperation
  | CustomerGroupsUpdateOperation
  | CustomerTagsUpdateOperation
  | CustomerSegmentsUpdateOperation;

export type CustomerUpdateOperationType = CustomerUpdateOperation["type"];

export interface CustomerProfileUpdateOperation {
  type: "profileUpdate";
  params: {
    prefix?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    suffix?: string | null;
    preferredLocale?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
  };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerContactUpdateOperation {
  type: "contactUpdate";
  params: {
    email?: string | null;
    phoneE164?: string | null;
  };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerCompanyUpdateOperation {
  type: "companyUpdate";
  params: {
    companyName?: string | null;
    jobTitle?: string | null;
  };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerStatusUpdateOperation {
  type: "statusUpdate";
  params: {
    status: "ACTIVE" | "BLOCKED" | "DISABLED";
    blockedReason?: string | null;
  };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerNoteUpdateOperation {
  type: "noteUpdate";
  params: { note?: string | null };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerModerationUpdateOperation {
  type: "moderationUpdate";
  params: { moderationNote?: string | null };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerAddressCreateParams {
  label?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  companyName?: string | null;
  phoneE164?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  regionName?: string | null;
  regionCode?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CustomerAddressPatchParams {
  label?: string | null;
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  suffix?: string | null;
  companyName?: string | null;
  phoneE164?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  regionName?: string | null;
  regionCode?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CustomerAddressesUpdateOperation {
  type: "addressUpdate";
  params: {
    create: CustomerAddressCreateParams[];
    update: Array<{
      addressId: string;
      operations: CustomerAddressPatchParams;
    }>;
    deleteIds: string[];
    defaultShippingAddressId?: string | null;
    defaultBillingAddressId?: string | null;
  };
  meta: CustomerUpdateOperationMeta;
}

export type CustomerConsentChannel = "EMAIL" | "SMS" | "WHATSAPP" | "PUSH";
export type CustomerConsentAdminState =
  | "NOT_SUBSCRIBED"
  | "PENDING"
  | "SUBSCRIBED"
  | "UNSUBSCRIBED";
export type CustomerConsentOptInLevel =
  | "UNKNOWN"
  | "SINGLE_OPT_IN"
  | "CONFIRMED_OPT_IN";

export interface CustomerConsentsUpdateOperation {
  type: "consentUpdate";
  params: {
    set: Array<{
      channel: CustomerConsentChannel;
      state: CustomerConsentAdminState;
      optInLevel?: CustomerConsentOptInLevel | null;
      contactPoint: string;
      sourceLocationId?: string | null;
      evidence?: Record<string, unknown> | null;
    }>;
  };
  meta: CustomerUpdateOperationMeta;
}

export type CustomerTaxIdentifierStatus =
  | "UNVERIFIED"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export interface CustomerTaxIdentifierCreateParams {
  identifierType: string;
  countryCode?: string | null;
  value: string;
  status?: CustomerTaxIdentifierStatus | null;
  isPrimary?: boolean | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface CustomerTaxIdentifierPatchParams {
  identifierType?: string | null;
  countryCode?: string | null;
  value?: string | null;
  status?: CustomerTaxIdentifierStatus | null;
  isPrimary?: boolean | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface CustomerTaxIdentifiersUpdateOperation {
  type: "taxIdentifierUpdate";
  params: {
    create: CustomerTaxIdentifierCreateParams[];
    update: Array<{
      taxIdentifierId: string;
      operations: CustomerTaxIdentifierPatchParams;
    }>;
    deleteIds: string[];
  };
  meta: CustomerUpdateOperationMeta;
}

export type CustomerTaxExemptionStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface CustomerTaxExemptionCreateParams {
  code: string;
  countryCode?: string | null;
  regionCode?: string | null;
  reason?: string | null;
  status?: CustomerTaxExemptionStatus | null;
  certificateFileId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface CustomerTaxExemptionPatchParams {
  code?: string | null;
  countryCode?: string | null;
  regionCode?: string | null;
  reason?: string | null;
  status?: CustomerTaxExemptionStatus | null;
  certificateFileId?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}

export interface CustomerTaxExemptionsUpdateOperation {
  type: "taxExemptionUpdate";
  params: {
    create: CustomerTaxExemptionCreateParams[];
    update: Array<{
      taxExemptionId: string;
      operations: CustomerTaxExemptionPatchParams;
    }>;
    deleteIds: string[];
  };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerGroupsUpdateOperation {
  type: "groupUpdate";
  params: {
    memberships: Array<{
      groupId: string;
      isPrimary?: boolean | null;
      expiresAt?: string | null;
    }>;
  };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerTagsUpdateOperation {
  type: "tagUpdate";
  params: { tagIds: string[] };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerSegmentsUpdateOperation {
  type: "segmentUpdate";
  params: { segmentIds: string[] };
  meta: CustomerUpdateOperationMeta;
}

export interface CustomerUpdateOperationResult {
  type: CustomerUpdateOperationType;
  applied: boolean;
  errors: UserError[];
}

export interface CustomerUpdateWorkflowResult {
  customer: { id: string; revision: number } | null;
  operationResults: CustomerUpdateOperationResult[];
  userErrors: UserError[];
}
