import type { Catalog, Delivery } from "@shopana/broker-types";

export type CalculateDeliveryOptionsParams =
  Delivery.CalculateCheckoutDeliveryOptionsParams;
export type CalculateDeliveryOptionsResult =
  Delivery.CalculateCheckoutDeliveryOptionsResult;

/** Delivery-owned application boundary consumed by its broker adapter. */
export interface DeliveryCheckoutOptionsPort {
  calculateOptions(
    params: CalculateDeliveryOptionsParams,
  ): Promise<CalculateDeliveryOptionsResult>;
}

/** Provider-ready physical grouping produced before rate fan-out. */
export interface DeliveryCheckoutRateGroupPlan {
  groupId: string;
  destinationId: string;
  lineIds: readonly string[];
  origin: Delivery.DeliveryProviderOrigin;
  destination: Delivery.DeliveryProviderDestination;
  packages: readonly [
    Delivery.DeliveryProviderPackage,
    ...Delivery.DeliveryProviderPackage[],
  ];
  /** Hash of every provider-visible physical and monetary rating fact. */
  ratedFactsHash: string;
}

export interface DeliveryCheckoutRatePlan {
  revision: string;
  basedOnPreliminaryRevision: string;
  groups: readonly DeliveryCheckoutRateGroupPlan[];
  issues: readonly Readonly<{
    severity: "WARNING" | "ERROR";
    code: string;
    message: string;
    lineId: string | null;
    destinationId: string | null;
    retryable: boolean;
  }>[];
}

/** Catalog/fulfillment boundary responsible for origins, packages and measurements. */
export interface DeliveryCheckoutPlanningPort {
  plan(
    params: CalculateDeliveryOptionsParams,
  ): Promise<DeliveryCheckoutRatePlan>;
}

export interface DeliveryCheckoutFactsPort {
  resolve(
    params: Catalog.ResolveCheckoutDeliveryFactsParams,
  ): Promise<Catalog.ResolveCheckoutDeliveryFactsResult>;
}

/** Provider-side handler surface for DeliveryCheckoutActions. */
export interface DeliveryCheckoutActionsContract {
  calculateCheckoutDeliveryOptions(
    params: CalculateDeliveryOptionsParams,
  ): Promise<CalculateDeliveryOptionsResult>;
}
