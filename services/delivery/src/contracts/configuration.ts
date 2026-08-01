import type { Delivery } from "@shopana/broker-types";
import type {
  CalculateDeliveryOptionsParams,
  DeliveryCheckoutRatePlan,
} from "../checkout-pipeline/contracts.js";

/** Persistence boundary for merchant-owned delivery profiles. */
export interface DeliveryProfilesPort {
  listActiveForStore(
    storeId: string,
  ): Promise<Delivery.DeliveryProfileSetSnapshot>;
  getById(
    storeId: string,
    profileId: string,
  ): Promise<Delivery.DeliveryProfileSnapshot | null>;
  save(input: Readonly<{
    profile: Delivery.DeliveryProfileSnapshot;
    expectedProfileRevision: number | null;
    expectedProfileSetRevision: string;
  }>): Promise<
    | Readonly<{
        status: "SAVED";
        profile: Delivery.DeliveryProfileSnapshot;
        profileSetRevision: string;
      }>
    | Readonly<{
        status: "PROFILE_REVISION_CONFLICT";
        current: Delivery.DeliveryProfileSnapshot;
      }>
    | Readonly<{
        status: "PROFILE_SET_REVISION_CONFLICT";
        currentProfileSetRevision: string;
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
