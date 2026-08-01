import type { DeliveryCheckoutOption } from "./delivery.js";
import type {
  PricingCheckoutJsonObject,
  PricingCheckoutMoney,
} from "./pricing.js";

export const DELIVERY_CUSTOMIZATION_FUNCTION_TARGET =
  "cart.delivery-options.transform.run" as const;

export interface DeliveryCustomizationAppManifestCapability {
  key: "commerce.function";
  assignmentMode: "store";
  routingMode: "broadcast";
  operations: Readonly<{
    "cart.delivery-options.transform.run": string;
  }>;
}

export interface DeliveryCustomizationBuyerContext {
  customerId: string | null;
  isAuthenticated: boolean;
  segmentIds: readonly string[];
  companyId: string | null;
}

export interface DeliveryCustomizationLine {
  lineId: string;
  variantId: string;
  quantity: number;
  subtotal: PricingCheckoutMoney;
  attributes: PricingCheckoutJsonObject;
}

export interface DeliveryCustomizationDestination {
  countryCode: string;
  provinceCode: string | null;
  city: string;
  postalCode: string | null;
  /** Exposed for address-shape rules such as PO box restrictions. */
  addressLine1: string | null;
}

export interface DeliveryCustomizationGroup {
  groupId: string;
  destination: DeliveryCustomizationDestination;
  lines: readonly DeliveryCustomizationLine[];
  options: readonly DeliveryCheckoutOption[];
}

/** Deterministic, PII-minimized input exposed to delivery customization functions. */
export interface DeliveryCustomizationFunctionInput {
  schemaVersion: 1;
  executionId: string;
  storeId: string;
  checkoutId: string;
  checkoutVersion: number;
  currencyCode: string;
  localeCode: string | null;
  channelCode: string;
  effectiveAt: string;
  buyer: DeliveryCustomizationBuyerContext;
  groups: readonly DeliveryCustomizationGroup[];
  cartAttributes: PricingCheckoutJsonObject;
}

export type DeliveryCustomizationOperation =
  | Readonly<{
      type: "HIDE";
      groupId: string;
      optionHandle: string;
      reasonCode: string;
    }>
  | Readonly<{
      type: "MOVE";
      groupId: string;
      optionHandle: string;
      index: number;
    }>
  | Readonly<{
      type: "RENAME";
      groupId: string;
      optionHandle: string;
      title: string;
    }>;

export interface DeliveryCustomizationFunctionResult {
  operations: readonly DeliveryCustomizationOperation[];
}

export interface DeliveryCustomizationExecutionSnapshot {
  sequence: number;
  functionBindingId: string;
  capabilityRouteId: string;
  appCode: string;
  appVersion: string;
  configurationRevision: string;
  status: "APPLIED" | "SKIPPED" | "FAILED";
  operationsHash: string | null;
  failureCode: string | null;
}

export interface DeliveryCustomizationResult {
  revision: string;
  basedOnRateOptionsRevision: string;
  groups: readonly Readonly<{
    groupId: string;
    options: readonly DeliveryCheckoutOption[];
  }>[];
  executions: readonly DeliveryCustomizationExecutionSnapshot[];
  issues: readonly Readonly<{
    code: string;
    message: string;
    functionBindingId: string | null;
  }>[];
}
