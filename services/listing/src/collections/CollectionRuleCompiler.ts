import {
  encodeCollectionRuleTerm,
  hashCanonicalCollectionRulesV1,
  type CanonicalCollectionRule,
} from "@shopana/broker-types";
import {
  buildAvailabilityVariantTerm,
  encodeListingVariantTerm,
} from "../listing/variantTerms/index.js";

export type CollectionRuleDefinitionKey =
  | { kind: "persisted"; listingRevision: number; rulesHash: string }
  | { kind: "transient"; rulesHash: string };

export interface CollectionPostingGroup {
  field: "category" | "vendor" | "rule_term" | "term";
  operator: "and" | "or";
  valueKeys: readonly string[];
}

export interface CollectionPricePredicate {
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "between";
  currencyCode: string;
  value: string;
  maxValue?: string;
}

export interface CollectionCreatedAtPredicate {
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "between";
  value: string;
  maxValue?: string;
}

export interface CollectionRulePlan {
  definitionKey: CollectionRuleDefinitionKey;
  matchesNothing: boolean;
  productPostingGroups: readonly CollectionPostingGroup[];
  productCreatedAtPredicates: readonly CollectionCreatedAtPredicate[];
  variantPostingGroups: readonly CollectionPostingGroup[];
  variantPricePredicates: readonly CollectionPricePredicate[];
  hasVariantPredicates: boolean;
}

export function compileCollectionRules(input: {
  definitionKey?: CollectionRuleDefinitionKey;
  rules: readonly CanonicalCollectionRule[];
}): CollectionRulePlan {
  const definitionKey = input.definitionKey ?? {
    kind: "transient" as const,
    rulesHash: hashCanonicalCollectionRulesV1(input.rules),
  };
  const productPostingGroups: CollectionPostingGroup[] = [];
  const productCreatedAtPredicates: CollectionCreatedAtPredicate[] = [];
  const variantPostingGroups: CollectionPostingGroup[] = [];
  const variantPricePredicates: CollectionPricePredicate[] = [];

  for (const rule of input.rules) {
    if (rule.field === "category" || rule.field === "vendor") {
      productPostingGroups.push({
        field: rule.field,
        operator: rule.operator === "all" ? "and" : "or",
        valueKeys: rule.value.ids,
      });
      continue;
    }
    if (rule.field === "tag") {
      productPostingGroups.push({
        field: "rule_term",
        operator: rule.operator === "all" ? "and" : "or",
        valueKeys: rule.value.ids.map((tagId) =>
          encodeCollectionRuleTerm({
            entityType: "product",
            kind: "tag",
            tagId,
          }),
        ),
      });
      continue;
    }
    if (rule.field === "feature") {
      productPostingGroups.push({
        field: "rule_term",
        operator: rule.operator === "all" ? "and" : "or",
        valueKeys: rule.value.values.map((value) =>
          encodeCollectionRuleTerm({
            entityType: "product",
            kind: "feature",
            sourceHandle: value.sourceHandle,
            valueHandle: value.valueHandle,
          }),
        ),
      });
      continue;
    }
    if (rule.field === "option") {
      variantPostingGroups.push({
        field: "rule_term",
        operator: rule.operator === "all" ? "and" : "or",
        valueKeys: rule.value.values.map((value) =>
          encodeCollectionRuleTerm({
            entityType: "variant",
            kind: "option",
            sourceHandle: value.sourceHandle,
            valueHandle: value.valueHandle,
          }),
        ),
      });
      continue;
    }
    if (rule.field === "in_stock") {
      variantPostingGroups.push({
        field: "term",
        operator: "and",
        valueKeys: [encodeListingVariantTerm(buildAvailabilityVariantTerm(rule.value.value))],
      });
      continue;
    }
    if (rule.field === "price") {
      variantPricePredicates.push(
        rule.operator === "between"
          ? {
              operator: rule.operator,
              currencyCode: rule.value.currencyCode,
              value: rule.value.minAmountMinor,
              maxValue: rule.value.maxAmountMinor,
            }
          : {
              operator: rule.operator,
              currencyCode: rule.value.currencyCode,
              value: rule.value.amountMinor,
            },
      );
      continue;
    }
    if (rule.field !== "created_at") {
      throw new Error("Unsupported collection rule field");
    }
    productCreatedAtPredicates.push(
      rule.operator === "between"
        ? {
            operator: rule.operator,
            value: rule.value.from,
            maxValue: rule.value.to,
          }
        : {
            operator: rule.operator,
            value: rule.value.instant,
          },
    );
  }

  return Object.freeze({
    definitionKey,
    matchesNothing: input.rules.length === 0,
    productPostingGroups: Object.freeze(productPostingGroups),
    productCreatedAtPredicates: Object.freeze(productCreatedAtPredicates),
    variantPostingGroups: Object.freeze(variantPostingGroups),
    variantPricePredicates: Object.freeze(variantPricePredicates),
    hasVariantPredicates: variantPostingGroups.length > 0 || variantPricePredicates.length > 0,
  });
}
