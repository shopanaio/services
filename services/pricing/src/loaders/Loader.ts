import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";
import { DiscountLoader } from "./DiscountLoader.js";

/** Request-scoped DataLoader registry for Pricing reads. */
export class Loader {
  public readonly discount;
  public readonly discountRule;
  public readonly discountMinimumRequirement;
  public readonly discountTargetSelections;
  public readonly discountTargets;
  public readonly discountBuyerContext;
  public readonly discountEligibleCustomers;
  public readonly discountEligibleSegments;
  public readonly discountChannels;
  public readonly discountCombinations;
  public readonly discountUsageSummary;
  public readonly discountCode;
  public readonly discountUsageReservation;
  public readonly discountRedemption;
  public readonly discountRedemptionAllocation;
  public readonly discountRedemptionAllocations;
  public readonly discountExternalReference;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: DataLoader<any, any>;

  constructor(repository: Repository) {
    const discountLoader = new DiscountLoader(repository);

    this.discount = discountLoader.discount;
    this.discountRule = discountLoader.discountRule;
    this.discountMinimumRequirement = discountLoader.discountMinimumRequirement;
    this.discountTargetSelections = discountLoader.discountTargetSelections;
    this.discountTargets = discountLoader.discountTargets;
    this.discountBuyerContext = discountLoader.discountBuyerContext;
    this.discountEligibleCustomers = discountLoader.discountEligibleCustomers;
    this.discountEligibleSegments = discountLoader.discountEligibleSegments;
    this.discountChannels = discountLoader.discountChannels;
    this.discountCombinations = discountLoader.discountCombinations;
    this.discountUsageSummary = discountLoader.discountUsageSummary;
    this.discountCode = discountLoader.discountCode;
    this.discountUsageReservation = discountLoader.discountUsageReservation;
    this.discountRedemption = discountLoader.discountRedemption;
    this.discountRedemptionAllocation = discountLoader.discountRedemptionAllocation;
    this.discountRedemptionAllocations = discountLoader.discountRedemptionAllocations;
    this.discountExternalReference = discountLoader.discountExternalReference;
  }
}
