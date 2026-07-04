import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ListingIndexItemKey,
  ListingIndexPreparedDeleteAction,
  ListingIndexPreparedSyncAction,
  ListingIndexQueuedAction,
  ListingIndexValidationIssue,
} from "./listingIndexActionTypes.js";
import { ListingIndexActionScriptError } from "./listingIndexActionTypes.js";

export class ListingPrepareIndexActionScript extends BaseScript<
  ListingIndexQueuedAction,
  ListingIndexPreparedSyncAction | ListingIndexPreparedDeleteAction
> {
  protected async execute(
    action: ListingIndexQueuedAction
  ): Promise<ListingIndexPreparedSyncAction | ListingIndexPreparedDeleteAction> {
    const issues = validateAction(action);
    if (issues.length > 0) {
      throw new ListingIndexActionScriptError(issues);
    }

    if (action.type === "syncSellableItem") {
      const itemKey: ListingIndexItemKey = {
        projectId: action.params.projectId,
        entityType: action.params.item.entityType,
        itemId: action.params.item.id,
      };

      return {
        kind: "continue",
        action: {
          ...action,
          actionType: "syncSellableItem",
          sourceRevision: action.params.item.sourceRevision,
          itemKey,
        },
      };
    }

    const itemKey: ListingIndexItemKey = {
      projectId: action.params.projectId,
      entityType: action.params.itemRef.entityType,
      itemId: action.params.itemRef.id,
    };

    return {
      kind: "continue",
      action: {
        ...action,
        actionType: "deleteSellableItem",
        sourceRevision: action.params.sourceRevision,
        itemKey,
      },
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function validateAction(
  action: ListingIndexQueuedAction
): ListingIndexValidationIssue[] {
  const issues: ListingIndexValidationIssue[] = [];
  const { meta, projectId } = action.params;

  if (meta.contractVersion !== "2026-07-04") {
    issues.push({
      code: "UNSUPPORTED_CONTRACT_VERSION",
      field: ["meta", "contractVersion"],
      message: `Unsupported listing update contract version: ${meta.contractVersion}`,
    });
  }
  if (!projectId) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["projectId"],
      message: "projectId is required",
    });
  }
  if (!meta.operationId) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["meta", "operationId"],
      message: "operationId is required",
    });
  }
  if (!meta.idempotencyKey) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["meta", "idempotencyKey"],
      message: "idempotencyKey is required",
    });
  }
  if (Number.isNaN(Date.parse(meta.occurredAt))) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["meta", "occurredAt"],
      message: "occurredAt must be an ISO timestamp",
    });
  }

  if (action.type === "syncSellableItem") {
    validateSyncAction(action, issues);
  } else {
    validateDeleteAction(action, issues);
  }

  return issues;
}

function validateSyncAction(
  action: Extract<ListingIndexQueuedAction, { type: "syncSellableItem" }>,
  issues: ListingIndexValidationIssue[]
): void {
  const { projectId, item } = action.params;
  if (item.id.length === 0) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["item", "id"],
      message: "item.id is required",
    });
  }
  if (!Number.isInteger(item.sourceRevision) || item.sourceRevision < 0) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["item", "sourceRevision"],
      message: "sourceRevision must be a non-negative integer",
    });
  }
  if (item.entityType !== "product" && item.entityType !== "bundle") {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["item", "entityType"],
      message: "Unsupported sellable item entityType",
    });
  }
  if (!item.content.defaultLocale) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["item", "content", "defaultLocale"],
      message: "content.defaultLocale is required",
    });
  }
  if (Number.isNaN(Date.parse(item.sourceUpdatedAt))) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["item", "sourceUpdatedAt"],
      message: "sourceUpdatedAt must be an ISO timestamp",
    });
  }

  validateDuplicateValues(
    item.variants.map((variant) => variant.id),
    ["item", "variants"],
    "Duplicate variant id",
    issues
  );

  for (const [variantIndex, variant] of item.variants.entries()) {
    validateCurrencies(
      variant.prices.map((price) => price.currencyCode),
      ["item", "variants", String(variantIndex), "prices"],
      issues
    );
    for (const [facetIndex, facet] of variant.facets.entries()) {
      if (facet.scope !== "variant") {
        issues.push({
          code: "VALIDATION_FAILED",
          field: [
            "item",
            "variants",
            String(variantIndex),
            "facets",
            String(facetIndex),
            "scope",
          ],
          message: "Variant facets must use scope=variant",
        });
      }
      validateDuplicateValues(
        facet.values.map((value) => value.handle),
        [
          "item",
          "variants",
          String(variantIndex),
          "facets",
          String(facetIndex),
          "values",
        ],
        "Duplicate variant facet value handle",
        issues
      );
    }
  }

  validateCurrencies(
    item.priceRanges.map((price) => price.currencyCode),
    ["item", "priceRanges"],
    issues
  );
  for (const [facetIndex, facet] of item.productFacets.entries()) {
    if (facet.scope !== "product") {
      issues.push({
        code: "VALIDATION_FAILED",
        field: ["item", "productFacets", String(facetIndex), "scope"],
        message: "Product facets must use scope=product",
      });
    }
    validateDuplicateValues(
      facet.values.map((value) => value.handle),
      ["item", "productFacets", String(facetIndex), "values"],
      "Duplicate product facet value handle",
      issues
    );
  }

  if (projectId !== action.params.projectId) {
    issues.push({
      code: "PROJECT_MISMATCH",
      field: ["projectId"],
      message: "Project mismatch",
    });
  }
}

function validateDeleteAction(
  action: Extract<ListingIndexQueuedAction, { type: "deleteSellableItem" }>,
  issues: ListingIndexValidationIssue[]
): void {
  if (!action.params.itemRef.id) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["itemRef", "id"],
      message: "itemRef.id is required",
    });
  }
  if (
    !Number.isInteger(action.params.sourceRevision) ||
    action.params.sourceRevision < 0
  ) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["sourceRevision"],
      message: "sourceRevision must be a non-negative integer",
    });
  }
  if (Number.isNaN(Date.parse(action.params.deletedAt))) {
    issues.push({
      code: "VALIDATION_FAILED",
      field: ["deletedAt"],
      message: "deletedAt must be an ISO timestamp",
    });
  }
}

function validateCurrencies(
  currencies: readonly string[],
  field: string[],
  issues: ListingIndexValidationIssue[]
): void {
  validateDuplicateValues(currencies, field, "Duplicate currency", issues);
  for (const [index, currency] of currencies.entries()) {
    if (!/^[A-Z]{3}$/.test(currency)) {
      issues.push({
        code: "VALIDATION_FAILED",
        field: [...field, String(index), "currencyCode"],
        message: "Currency must be a 3-letter uppercase code",
      });
    }
  }
}

function validateDuplicateValues(
  values: readonly string[],
  field: string[],
  message: string,
  issues: ListingIndexValidationIssue[]
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      issues.push({
        code: "VALIDATION_FAILED",
        field: [...field, String(index)],
        message,
      });
    }
    seen.add(value);
  }
}
