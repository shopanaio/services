export const CustomersCheckoutActionNames = {
  resolveBuyerEligibility: "resolveCheckoutBuyerEligibility",
} as const;

export const CustomersCheckoutActions = {
  resolveBuyerEligibility:
    `customers.${CustomersCheckoutActionNames.resolveBuyerEligibility}`,
} as const;

export const CustomersComparisonActionNames = {
  getSelection: "getCustomerComparisonSelection",
} as const;

export const CustomersComparisonActions = {
  getSelection:
    `customers.${CustomersComparisonActionNames.getSelection}`,
} as const;

export const CustomersAdministrationActionNames = {
  rebuildStatistics: "rebuildCustomerStatistics",
  rebuildDynamicSegments: "rebuildCustomerDynamicSegments",
} as const;

export const CustomersAdministrationActions = {
  rebuildStatistics:
    `customers.${CustomersAdministrationActionNames.rebuildStatistics}`,
  rebuildDynamicSegments:
    `customers.${CustomersAdministrationActionNames.rebuildDynamicSegments}`,
} as const;

export interface RebuildCustomerStatisticsParams {
  storeId: string;
  customerId?: string;
}

export type RebuildCustomerStatisticsResult =
  | Readonly<{ ok: true; rebuiltCustomers: number }>
  | CustomersAdministrationActionFailure;

export interface RebuildCustomerDynamicSegmentsParams {
  storeId: string;
  customerId?: string;
}

export type RebuildCustomerDynamicSegmentsResult =
  | Readonly<{ ok: true; invalidatedMemberships: number }>
  | CustomersAdministrationActionFailure;

export type CustomersAdministrationActionFailure = Readonly<{
  ok: false;
  code:
    | "CUSTOMERS_ADMIN_CALLER_FORBIDDEN"
    | "CUSTOMER_NOT_FOUND"
    | "CUSTOMERS_REBUILD_FAILED";
  message: string;
  retryable: boolean;
}>;

export const CustomerExternalReferenceActionNames = {
  lookup: "lookupCustomerExternalReference",
  upsert: "upsertCustomerExternalReference",
  delete: "deleteCustomerExternalReference",
  sync: "syncCustomerExternalReferences",
} as const;

export const CustomerExternalReferenceActions = {
  lookup:
    `customers.${CustomerExternalReferenceActionNames.lookup}`,
  upsert:
    `customers.${CustomerExternalReferenceActionNames.upsert}`,
  delete:
    `customers.${CustomerExternalReferenceActionNames.delete}`,
  sync:
    `customers.${CustomerExternalReferenceActionNames.sync}`,
} as const;

export const CustomerExternalReferenceAppScopes = {
  read: "customers.external-references:read",
  write: "customers.external-references:write",
} as const;

export type CustomerExternalReferenceConflictPolicy = "REJECT" | "REASSIGN";
export type CustomerExternalReferenceUpsertOutcome =
  | "CREATED"
  | "UPDATED"
  | "REASSIGNED";

export interface CustomerExternalReferenceSnapshot {
  id: string;
  storeId: string;
  customerId: string;
  externalSystem: string;
  externalType: string;
  externalId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LookupCustomerExternalReferenceParams {
  storeId: string;
  externalType?: string;
  externalId: string;
}

export type CustomerExternalReferenceActionFailure = Readonly<{
  ok: false;
  code:
    | "CUSTOMER_EXTERNAL_REFERENCE_APP_REQUIRED"
    | "CUSTOMER_EXTERNAL_REFERENCE_SCOPE_FORBIDDEN"
    | "CUSTOMER_EXTERNAL_REFERENCE_STORE_FORBIDDEN"
    | "CUSTOMER_EXTERNAL_REFERENCE_NOT_FOUND"
    | "CUSTOMER_NOT_FOUND"
    | "EXTERNAL_REFERENCE_CONFLICT"
    | "CUSTOMER_EXTERNAL_REFERENCE_CONFLICT"
    | "INVALID_EXTERNAL_REFERENCE"
    | "CUSTOMER_EXTERNAL_REFERENCE_SYNC_FAILED";
  message: string;
  retryable: boolean;
}>;

export type LookupCustomerExternalReferenceResult =
  | Readonly<{
      ok: true;
      reference: CustomerExternalReferenceSnapshot | null;
    }>
  | CustomerExternalReferenceActionFailure;

export interface UpsertCustomerExternalReferenceParams {
  storeId: string;
  customerId: string;
  externalType?: string;
  externalId: string;
  metadata?: Record<string, unknown>;
  conflictPolicy?: CustomerExternalReferenceConflictPolicy;
  idempotencyKey: string;
}

export type UpsertCustomerExternalReferenceResult =
  | Readonly<{
      ok: true;
      reference: CustomerExternalReferenceSnapshot;
      outcome: CustomerExternalReferenceUpsertOutcome;
      previousCustomerId?: string;
    }>
  | CustomerExternalReferenceActionFailure;

export interface DeleteCustomerExternalReferenceParams {
  storeId: string;
  externalType?: string;
  externalId: string;
  idempotencyKey: string;
}

export type DeleteCustomerExternalReferenceResult =
  | Readonly<{
      ok: true;
      deletedReferenceId: string | null;
      customerId: string | null;
    }>
  | CustomerExternalReferenceActionFailure;

export type CustomerExternalReferenceSyncOperation =
  | Readonly<{
      type: "UPSERT";
      customerId: string;
      externalType?: string;
      externalId: string;
      metadata?: Record<string, unknown>;
      conflictPolicy?: CustomerExternalReferenceConflictPolicy;
    }>
  | Readonly<{
      type: "DELETE";
      externalType?: string;
      externalId: string;
    }>;

export interface SyncCustomerExternalReferencesParams {
  storeId: string;
  syncId: string;
  operations: readonly CustomerExternalReferenceSyncOperation[];
}

export interface CustomerExternalReferenceSyncOperationResult {
  index: number;
  type: CustomerExternalReferenceSyncOperation["type"];
  applied: boolean;
  reference?: CustomerExternalReferenceSnapshot;
  deletedReferenceId?: string;
  customerId?: string;
  outcome?: CustomerExternalReferenceUpsertOutcome;
  previousCustomerId?: string;
  userErrors: readonly Readonly<{
    message: string;
    field?: string[];
    code?: string;
  }>[];
}

export type SyncCustomerExternalReferencesResult =
  | Readonly<{
      ok: true;
      results: readonly CustomerExternalReferenceSyncOperationResult[];
      appliedCount: number;
      failedCount: number;
    }>
  | CustomerExternalReferenceActionFailure;

export interface GetCustomerComparisonSelectionParams {
  storeId: string;
  customerId: string;
}

export type GetCustomerComparisonSelectionResult =
  | Readonly<{
      ok: true;
      revision: number;
      items: readonly Readonly<{
        productId: string;
        variantId: string;
        position: number;
      }>[];
    }>
  | Readonly<{
      ok: false;
      code:
        | "CUSTOMER_NOT_FOUND"
        | "CUSTOMER_COMPARISON_CALLER_FORBIDDEN"
        | "CUSTOMER_COMPARISON_READ_FAILED";
      message: string;
      retryable: boolean;
    }>;

export interface ResolveCheckoutBuyerEligibilityParams {
  storeId: string;
  customerId: string;
  /** Membership expiry/dynamic evaluation boundary. */
  effectiveAt: string;
}

export type CustomerCheckoutIneligibilityReason =
  | "DISABLED"
  | "BLOCKED"
  | "MERGED"
  | "REDACTED";

export type ResolveCheckoutBuyerEligibilityResult =
  | Readonly<{
      ok: true;
      storeId: string;
      customerId: string;
      effectiveAt: string;
      segmentIds: readonly string[];
      /** Revision of memberships and segment definitions used by the read. */
      segmentMembershipRevision: string;
    }>
  | Readonly<{
      ok: false;
      code: "CUSTOMER_NOT_FOUND";
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "CUSTOMER_NOT_ELIGIBLE";
      reason: CustomerCheckoutIneligibilityReason;
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "BUYER_ELIGIBILITY_LIMIT_EXCEEDED";
      message: string;
      retryable: false;
    }>
  | Readonly<{
      ok: false;
      code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED";
      message: string;
      retryable: true;
    }>;
