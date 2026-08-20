import DataLoader from "dataloader";
import type {
  DiscountReadModel,
  DiscountRuleReadModel,
} from "../repositories/DiscountRepository.js";
import type {
  DiscountBuyerContext,
  DiscountChannel,
  DiscountCodeListView,
  DiscountCombinationClass,
  DiscountEligibleCustomer,
  DiscountEligibleSegment,
  DiscountExternalReference,
  DiscountMinimumRequirement,
  DiscountRedemption,
  DiscountRedemptionAllocation,
  DiscountTarget,
  DiscountTargetSelection,
  DiscountUsageReservation,
  DiscountUsageSummaryView,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class DiscountLoader {
  public readonly discount: DataLoader<string, DiscountReadModel | null>;
  public readonly discountRule: DataLoader<string, DiscountRuleReadModel | null>;
  public readonly discountMinimumRequirement: DataLoader<string, DiscountMinimumRequirement | null>;
  public readonly discountTargetSelections: DataLoader<string, DiscountTargetSelection[]>;
  public readonly discountTargets: DataLoader<string, DiscountTarget[]>;
  public readonly discountBuyerContext: DataLoader<string, DiscountBuyerContext | null>;
  public readonly discountEligibleCustomers: DataLoader<string, DiscountEligibleCustomer[]>;
  public readonly discountEligibleSegments: DataLoader<string, DiscountEligibleSegment[]>;
  public readonly discountChannels: DataLoader<string, DiscountChannel[]>;
  public readonly discountCombinations: DataLoader<string, DiscountCombinationClass[]>;
  public readonly discountUsageSummary: DataLoader<string, DiscountUsageSummaryView | null>;
  public readonly discountCode: DataLoader<string, DiscountCodeListView | null>;
  public readonly discountUsageReservation: DataLoader<string, DiscountUsageReservation | null>;
  public readonly discountRedemption: DataLoader<string, DiscountRedemption | null>;
  public readonly discountRedemptionAllocation: DataLoader<
    string,
    DiscountRedemptionAllocation | null
  >;
  public readonly discountRedemptionAllocations: DataLoader<string, DiscountRedemptionAllocation[]>;
  public readonly discountExternalReference: DataLoader<string, DiscountExternalReference | null>;

  constructor(repository: Repository) {
    this.discount = new DataLoader(async (ids) => {
      const rows = await repository.discount.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.discountRule = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getRulesByDiscountIds(discountIds);
      return discountIds.map((id) => rows.find((row) => row.value.discountId === id) ?? null);
    });

    this.discountMinimumRequirement = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getMinimumRequirementsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.find((row) => row.discountId === id) ?? null);
    });

    this.discountTargetSelections = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getTargetSelectionsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.filter((row) => row.discountId === id));
    });

    this.discountTargets = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getTargetsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.filter((row) => row.discountId === id));
    });

    this.discountBuyerContext = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getBuyerContextsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.find((row) => row.discountId === id) ?? null);
    });

    this.discountEligibleCustomers = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getEligibleCustomersByDiscountIds(discountIds);
      return discountIds.map((id) => rows.filter((row) => row.discountId === id));
    });

    this.discountEligibleSegments = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getEligibleSegmentsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.filter((row) => row.discountId === id));
    });

    this.discountChannels = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getChannelsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.filter((row) => row.discountId === id));
    });

    this.discountCombinations = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getCombinationsByDiscountIds(discountIds);
      return discountIds.map((id) => rows.filter((row) => row.discountId === id));
    });

    this.discountUsageSummary = new DataLoader(async (discountIds) => {
      const rows = await repository.discount.getUsageSummariesByDiscountIds(discountIds);
      return discountIds.map((id) => rows.find((row) => row.discountId === id) ?? null);
    });

    this.discountCode = new DataLoader(async (ids) => {
      const rows = await repository.discount.getCodesByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.discountUsageReservation = new DataLoader(async (ids) => {
      const rows = await repository.discount.getUsageReservationsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.discountRedemption = new DataLoader(async (ids) => {
      const rows = await repository.discount.getRedemptionsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.discountRedemptionAllocation = new DataLoader(async (ids) => {
      const rows = await repository.discount.getRedemptionAllocationsByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.discountRedemptionAllocations = new DataLoader(async (redemptionIds) => {
      const rows = await repository.discount.getRedemptionAllocationsByRedemptionIds(redemptionIds);
      return redemptionIds.map((id) => rows.filter((row) => row.redemptionId === id));
    });

    this.discountExternalReference = new DataLoader(async (ids) => {
      const rows = await repository.discount.getExternalReferencesByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });
  }
}
