import type {
  PricingCheckoutJsonObject,
  PricingCheckoutMoney,
} from "./pricing.js";
import type { DeliveryCheckoutMethodType } from "./delivery.js";

/** Merchant-owned configuration deciding which delivery methods are eligible. */
export type DeliveryProfileStatus = "ACTIVE" | "INACTIVE";

export type DeliveryPurchaseType =
  | "ONE_TIME"
  | "SUBSCRIPTION"
  | "PRE_ORDER";

export type DeliveryProfileAssignment =
  | Readonly<{
      /** The default profile covers every variant not assigned elsewhere. */
      scope: "ALL_UNASSIGNED";
      assignmentSetId: null;
      assignmentRevision: null;
      variantCount: 0;
      sellingPlanGroupCount: 0;
    }>
  | Readonly<{
      scope: "ASSIGNED";
      /** Immutable, indexed membership set stored outside the configuration snapshot. */
      assignmentSetId: string;
      assignmentRevision: string;
      variantCount: number;
      sellingPlanGroupCount: number;
    }>;

export type DeliveryPostalCodeRule =
  | Readonly<{
      effect: "INCLUDE" | "EXCLUDE";
      match: "EXACT" | "PREFIX";
      value: string;
    }>
  | Readonly<{
      effect: "INCLUDE" | "EXCLUDE";
      match: "NUMERIC_RANGE";
      start: string;
      end: string;
    }>;

export interface DeliveryPostalCodeRuleSet {
  schemaVersion: 1;
  normalization: "UPPERCASE_REMOVE_ASCII_WHITESPACE";
  /** Exclusions win; when no INCLUDE exists, the remaining territory is included. */
  rules: readonly DeliveryPostalCodeRule[];
}

export type DeliveryZoneTerritory =
  | Readonly<{
      scope: "COUNTRY";
      countryCode: string;
      /** Empty means the whole country. */
      provinceCodes: readonly string[];
      postalCodeRuleSet: DeliveryPostalCodeRuleSet;
    }>
  | Readonly<{
      /** Matches countries not explicitly claimed by a higher-priority zone. */
      scope: "REST_OF_WORLD";
    }>;

export interface DeliveryZoneSnapshot {
  zoneId: string;
  name: string;
  /** Lower values win when territories overlap. */
  priority: number;
  territories: readonly [DeliveryZoneTerritory, ...DeliveryZoneTerritory[]];
  revision: number;
}

export type DeliveryRateCondition =
  | Readonly<{
      type: "CART_SUBTOTAL";
      operator: "GTE" | "LTE";
      amount: PricingCheckoutMoney;
    }>
  | Readonly<{
      type: "PACKAGE_WEIGHT_GRAMS";
      operator: "GTE" | "LTE";
      value: number;
    }>
  | Readonly<{
      type: "PACKAGE_ITEM_COUNT";
      operator: "GTE" | "LTE";
      value: number;
    }>
  | Readonly<{
      type: "CHANNEL";
      values: readonly string[];
    }>
  | Readonly<{
      type: "CUSTOMER_SEGMENT";
      values: readonly string[];
    }>
  | Readonly<{
      type: "PURCHASE_TYPE";
      values: readonly DeliveryPurchaseType[];
    }>;

export interface DeliveryRateConditionSet {
  match: "ALL" | "ANY";
  conditions: readonly DeliveryRateCondition[];
}

export type DeliveryMethodRateSource =
  | Readonly<{
      type: "MANUAL";
      price: PricingCheckoutMoney;
    }>
  | Readonly<{
      type: "CARRIER_SERVICE";
      carrierServiceAccountIds: readonly [string, ...string[]];
      /** Empty means every service returned by an eligible account. */
      allowedServiceCodes: readonly string[];
      /** Optional merchant-owned rate used only under the declared failure policy. */
      backupRate: PricingCheckoutMoney | null;
    }>;

export interface DeliveryMethodDefinitionSnapshot {
  methodDefinitionId: string;
  code: string;
  title: string;
  description: string | null;
  active: boolean;
  deliveryMethodType: DeliveryCheckoutMethodType;
  rateSource: DeliveryMethodRateSource;
  conditions: DeliveryRateConditionSet;
  /** Merchant-visible method metadata; never forwarded to a provider implicitly. */
  metadata: PricingCheckoutJsonObject | null;
  revision: number;
}

export interface DeliveryLocationGroupSnapshot {
  locationGroupId: string;
  name: string;
  fulfillmentLocationIds: readonly [string, ...string[]];
  zones: readonly [
    Readonly<{
      zone: DeliveryZoneSnapshot;
      methods: readonly DeliveryMethodDefinitionSnapshot[];
    }>,
    ...Readonly<{
      zone: DeliveryZoneSnapshot;
      methods: readonly DeliveryMethodDefinitionSnapshot[];
    }>[],
  ];
  revision: number;
}

export interface DeliveryProfileSnapshotBase {
  profileId: string;
  organizationId: string;
  storeId: string;
  name: string;
  status: DeliveryProfileStatus;
  locationGroups: readonly [
    DeliveryLocationGroupSnapshot,
    ...DeliveryLocationGroupSnapshot[],
  ];
  failurePolicy: DeliveryRateFailurePolicy;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryProfileSnapshot =
  | Readonly<
      DeliveryProfileSnapshotBase & {
        isDefault: true;
        assignment: Extract<
          DeliveryProfileAssignment,
          Readonly<{ scope: "ALL_UNASSIGNED" }>
        >;
      }
    >
  | Readonly<
      DeliveryProfileSnapshotBase & {
        isDefault: false;
        assignment: Extract<
          DeliveryProfileAssignment,
          Readonly<{ scope: "ASSIGNED" }>
        >;
      }
    >;

/** Atomic store configuration used to derive one checkout eligibility revision. */
export interface DeliveryProfileSetSnapshot {
  organizationId: string;
  storeId: string;
  /** Canonical store currency for every monetary field in the profile set. */
  currencyCode: string;
  assignmentResolution: "SELLING_PLAN_THEN_VARIANT_THEN_DEFAULT";
  revision: string;
  profiles: readonly [
    DeliveryProfileSnapshot & Readonly<{ status: "ACTIVE" }>,
    ...(DeliveryProfileSnapshot & Readonly<{ status: "ACTIVE" }>)[],
  ];
}

export type DeliveryRateFallbackCategory =
  | "PROVIDER_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED";

export type DeliveryRateFailurePolicy =
  | Readonly<{ mode: "OMIT_PROVIDER_RATES" }>
  | Readonly<{ mode: "FAIL_GROUP" }>
  | Readonly<{
      mode: "USE_BACKUP_RATE";
      categories: readonly [
        DeliveryRateFallbackCategory,
        ...DeliveryRateFallbackCategory[],
      ];
    }>;

/** Immutable configuration selected before provider fan-out. */
export interface DeliveryEligibilitySnapshot {
  eligibilityRevision: string;
  organizationId: string;
  storeId: string;
  currencyCode: string;
  profileSetRevision: string;
  profileId: string;
  profileRevision: number;
  assignmentMatch:
    | Readonly<{
        matchedBy: "DEFAULT";
        assignmentSetId: null;
        assignmentRevision: null;
      }>
    | Readonly<{
        matchedBy: "SELLING_PLAN" | "VARIANT";
        assignmentSetId: string;
        assignmentRevision: string;
      }>;
  locationGroupId: string;
  locationGroupRevision: number;
  zoneId: string;
  zoneRevision: number;
  methodDefinitions: readonly DeliveryMethodDefinitionSnapshot[];
  failurePolicy: DeliveryRateFailurePolicy;
}
