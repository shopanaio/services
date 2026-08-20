import {
  CatalogLoyaltyActions,
  CustomersLoyaltyActions,
  PricingLoyaltyActions,
  type Catalog,
  type Customers,
  type Pricing,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type {
  LoyaltyCatalogSelector,
  LoyaltyProgramRulesV1,
  LoyaltyRewardType,
} from "../../contracts/types.js";
import type { LoyaltyReferenceValidator } from "./ProgramLifecycleService.js";
import { rewardExternalDiscountId } from "./policySchemas.js";
import { LoyaltyDomainError } from "../errors.js";

export class BrokerLoyaltyReferenceValidator implements LoyaltyReferenceValidator {
  constructor(private readonly broker: ServiceBroker) {}

  async validate(input: {
    storeId: string;
    rules: Readonly<Record<string, unknown>>;
    rewardDefinitions?: readonly Readonly<{
      rewardType: LoyaltyRewardType;
      configuration: unknown;
    }>[];
    earningRules?: readonly Readonly<{ conditions: unknown }>[];
  }) {
    const rules = input.rules as unknown as LoyaltyProgramRulesV1;
    const issues: Array<{ field: readonly (string | number)[]; message: string }> = [];
    const segmentIds = new Set<string>([
      ...rules.eligibility.segmentIds,
      ...rules.eligibility.excludedSegmentIds,
      ...rules.earning.modifiers.flatMap(({ segmentIds }) => segmentIds),
    ]);
    const selectors: Exclude<LoyaltyCatalogSelector, { type: "ALL" }>[] = [
      ...rules.earning.excludedSelectors,
      ...rules.earning.modifiers.map(({ selector }) => selector),
    ].filter(
      (selector): selector is Exclude<LoyaltyCatalogSelector, { type: "ALL" }> =>
        selector.type !== "ALL",
    );
    for (const rule of input.earningRules ?? []) {
      collectConditionReferences(rule.conditions, segmentIds, selectors);
    }
    const segments: Customers.ValidateLoyaltySegmentReferencesResult =
      segmentIds.size === 0
        ? { ok: true, missingSegmentIds: [] }
        : await this.broker.call<
            Customers.ValidateLoyaltySegmentReferencesResult,
            Customers.ValidateLoyaltySegmentReferencesParams
          >(CustomersLoyaltyActions.validateSegments, {
            storeId: input.storeId,
            segmentIds: [...segmentIds],
          });
    if (!segments.ok)
      throw new LoyaltyDomainError(segments.code, segments.message, segments.retryable);
    for (const id of segments.missingSegmentIds)
      issues.push({
        field: ["eligibility", "segmentIds"],
        message: `Customer segment ${id} was not found`,
      });

    const catalog: Catalog.ValidateLoyaltyCatalogReferencesResult =
      selectors.length === 0
        ? { ok: true, missing: [] }
        : await this.broker.call<
            Catalog.ValidateLoyaltyCatalogReferencesResult,
            Catalog.ValidateLoyaltyCatalogReferencesParams
          >(CatalogLoyaltyActions.validateReferences, {
            storeId: input.storeId,
            references: selectors,
          });
    if (!catalog.ok) throw new LoyaltyDomainError(catalog.code, catalog.message, catalog.retryable);
    for (const missing of catalog.missing)
      for (const id of missing.ids)
        issues.push({
          field: ["earning", "selectors"],
          message: `${missing.type} ${id} was not found`,
        });

    const discountIds = (input.rewardDefinitions ?? []).flatMap((definition) => {
      const id = rewardExternalDiscountId(definition.rewardType, definition.configuration);
      return id ? [id] : [];
    });
    const pricing: Pricing.ValidateLoyaltyRewardReferencesResult =
      discountIds.length === 0
        ? { ok: true, missingDiscountIds: [] }
        : await this.broker.call<
            Pricing.ValidateLoyaltyRewardReferencesResult,
            Pricing.ValidateLoyaltyRewardReferencesParams
          >(PricingLoyaltyActions.validateRewardReferences, {
            storeId: input.storeId,
            discountIds,
          });
    if (!pricing.ok) throw new LoyaltyDomainError(pricing.code, pricing.message, pricing.retryable);
    for (const id of pricing.missingDiscountIds)
      issues.push({
        field: ["rewardDefinitions"],
        message: `Pricing discount ${id} was not found`,
      });
    return issues;
  }
}

function collectConditionReferences(
  condition: unknown,
  segmentIds: Set<string>,
  selectors: Exclude<LoyaltyCatalogSelector, { type: "ALL" }>[],
): void {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) return;
  const value = condition as Record<string, unknown>;
  if (value.type === "SEGMENT" && Array.isArray(value.segmentIds)) {
    for (const id of value.segmentIds) if (typeof id === "string") segmentIds.add(id);
  }
  if (value.type === "CATALOG" && value.selector && typeof value.selector === "object") {
    const selector = value.selector as LoyaltyCatalogSelector;
    if (selector.type !== "ALL") selectors.push(selector);
  }
  if (Array.isArray(value.conditions)) {
    for (const child of value.conditions) collectConditionReferences(child, segmentIds, selectors);
  }
  if (value.condition) collectConditionReferences(value.condition, segmentIds, selectors);
}
