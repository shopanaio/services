import type { Delivery } from "@shopana/broker-types";
import type {
  CalculateDeliveryOptionsParams,
  DeliveryCheckoutRatePlan,
} from "../checkout-pipeline/contracts.js";

/** Persistence boundary for merchant-owned delivery profiles. */
export interface DeliveryProfilesPort {
  listActiveForStore(
    storeId: string,
  ): Promise<readonly Delivery.DeliveryProfileSnapshot[]>;
  getById(
    storeId: string,
    profileId: string,
  ): Promise<Delivery.DeliveryProfileSnapshot | null>;
  save(
    profile: Delivery.DeliveryProfileSnapshot,
    expectedRevision: number | null,
  ): Promise<
    | Readonly<{ status: "SAVED"; profile: Delivery.DeliveryProfileSnapshot }>
    | Readonly<{
        status: "REVISION_CONFLICT";
        current: Delivery.DeliveryProfileSnapshot;
      }>
  >;
}

/** Resolves profiles, locations, zones, methods and failure policies before fan-out. */
export interface DeliveryEligibilityPort {
  resolve(input: Readonly<{
    request: CalculateDeliveryOptionsParams;
    ratePlan: DeliveryCheckoutRatePlan;
  }>): Promise<
    readonly Readonly<{
      groupId: string;
      eligibility: Delivery.DeliveryEligibilitySnapshot;
    }>[]
  >;
}
