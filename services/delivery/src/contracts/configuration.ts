import type { Delivery } from "@shopana/broker-types";
import type {
  CalculateDeliveryOptionsParams,
  DeliveryCheckoutRatePlan,
} from "../checkout-pipeline/contracts.js";

/** Persistence boundary for merchant-owned delivery profiles. */
export interface DeliveryProfilesPort {
  listActiveForStore(storeId: string): Promise<Delivery.DeliveryProfileSetSnapshot>;
  getById(storeId: string, profileId: string): Promise<Delivery.DeliveryProfileSnapshot | null>;
  saveInactiveProfile(
    input: Readonly<{
      profile: Delivery.DeliveryProfileSnapshot & Readonly<{ status: "INACTIVE" }>;
    }>,
  ): Promise<
    Readonly<{
      status: "SAVED";
      profile: Delivery.DeliveryProfileSnapshot & Readonly<{ status: "INACTIVE" }>;
    }>
  >;
  /** Replaces the complete active graph in one transaction. */
  replaceActiveProfileSet(
    input: Readonly<{
      profileSet: Delivery.DeliveryProfileSetSnapshot;
      memberships: readonly Delivery.DeliveryProfileAssignmentMembershipInput[];
    }>,
  ): Promise<Readonly<{ status: "SAVED"; profileSet: Delivery.DeliveryProfileSetSnapshot }>>;
}

/** Indexed lookup boundary for assignment sets that may contain millions of variants. */
export interface DeliveryProfileAssignmentsPort {
  resolve(
    input: Readonly<{
      storeId: string;
      variantId: string;
      sellingPlanGroupId: string | null;
      activeProfileSetRevision: string;
    }>,
  ): Promise<
    | Readonly<{
        status: "MATCHED";
        profileId: string;
        assignmentSetId: string | null;
        assignmentRevision: string | null;
        matchedBy: "SELLING_PLAN" | "VARIANT" | "DEFAULT";
      }>
    | Readonly<{
        status: "PROFILE_SET_REVISION_MISMATCH";
        currentProfileSetRevision: string;
      }>
  >;
}

/** Resolves profiles, locations, zones, methods and failure policies before fan-out. */
export interface DeliveryEligibilityPort {
  resolve(
    input: Readonly<{
      request: CalculateDeliveryOptionsParams;
      ratePlan: DeliveryCheckoutRatePlan;
    }>,
  ): Promise<
    readonly Readonly<{
      groupId: string;
      eligibility: Delivery.DeliveryEligibilitySnapshot;
    }>[]
  >;
}
