import type { Listing } from "@shopana/broker-types";
import { BaseScript } from "../../kernel/BaseScript.js";
import { Kernel } from "../../kernel/Kernel.js";
import type { RunScriptContext } from "../../kernel/types.js";
import type {
  ListingIndexItemStateKey,
  ListingIndexItemStateRow,
} from "../../repositories/listing/ListingIndexItemStateRepository.js";
import type {
  ProductListingIndexBootstrapInput,
  ProductListingIndexUpsertInput,
  ProductListingPriceRowInput,
  ProductSortRowInput,
  ProductTitleBm25RowInput,
  RuntimeVariantPriceRowInput,
  VariantListingIndexUpsertInput,
  VariantListingPriceRowInput,
} from "../../repositories/listing/listingRepositoryTypes.js";
import type { VariantListingIndex } from "../../repositories/models/index.js";
import type {
  ListingPreparedSyncAction,
  ListingSyncWriteModelJson,
} from "../../scripts/listingIndexActionTypes.js";
import { ListingIndexActionScriptError } from "../../scripts/listingIndexActionTypes.js";
import type { ListingBatchWriteModelItem } from "./stepBuildListingSyncWriteModelsBatch.js";

export type ListingBatchWriteIndexActionInput = {
  items: ListingBatchWriteModelItem[];
};

export type ListingBatchWriteIndexActionResult = {
  results: Listing.ListingUpdateResult[];
  appliedProductIds: string[];
};

type BatchWriteDecisionStatus = Exclude<
  Listing.ListingUpdateResult["status"],
  "accepted"
>;

type BatchWriteDecision = {
  item: ListingBatchWriteModelItem;
  payloadHash: string;
  status: BatchWriteDecisionStatus;
};

type ProductMembershipReplacement = {
  productDocId: number;
  field: "category" | "vendor" | "facet";
  nextValueKeys: readonly string[];
};

type VariantMembershipReplacement = {
  variantDocId: number;
  field: "facet" | "variant_product";
  nextValueKeys: readonly string[];
};

type StaleVariant = {
  variantId: string;
  variantDocId: number;
};

type MergedBatchSyncPayload = {
  productBootstrapRows: ProductListingIndexBootstrapInput[];
  productRows: ProductListingIndexUpsertInput[];
  productPricesByProductId: Map<string, ProductListingPriceRowInput[]>;
  productTitleRowsByProductId: Map<string, ProductTitleBm25RowInput[]>;
  productSortRowsByProductDocId: Map<number, ProductSortRowInput[]>;
  productMemberships: ProductMembershipReplacement[];
  variantRows: VariantListingIndexUpsertInput[];
  sourcePriceRowsByVariantId: Map<string, VariantListingPriceRowInput[]>;
  runtimePriceRowsByVariantDocId: Map<number, RuntimeVariantPriceRowInput[]>;
  variantMemberships: VariantMembershipReplacement[];
  staleVariants: StaleVariant[];
  projectionRefreshVariantDocIds: number[];
  stateRows: ListingIndexItemStateRow[];
};

export async function writeListingBatchSyncIndexAction(
  input: ListingBatchWriteIndexActionInput
): Promise<ListingBatchWriteIndexActionResult> {
  if (input.items.length === 0) {
    return {
      results: [],
      appliedProductIds: [],
    };
  }

  const kernel = Kernel.getInstance();
  return kernel.runScript(
    ListingBatchWriteIndexActionScript,
    input,
    buildRunScriptContext(input.items[0].action)
  );
}

class ListingBatchWriteIndexActionScript extends BaseScript<
  ListingBatchWriteIndexActionInput,
  ListingBatchWriteIndexActionResult
> {
  protected async execute(
    input: ListingBatchWriteIndexActionInput
  ): Promise<ListingBatchWriteIndexActionResult> {
    validateBatchInput(input.items);

    return this.repository.runListingIndexItemTransaction(async () => {
      const stateRowsByKey =
        await this.repository.listingIndexItemState.lockByItems(
          input.items.map((item) => item.action.itemKey)
        );
      const processedAt = new Date().toISOString();
      const decisions = input.items.map((item) =>
        this.classifyItem(item, stateRowsByKey.get(itemStateKey(item.action)))
      );
      const appliedDecisions = decisions.filter(
        (decision) => decision.status === "applied"
      );

      if (appliedDecisions.length > 0) {
        await this.applySyncBatch(appliedDecisions, processedAt);
      }

      return {
        results: decisions.map((decision) =>
          this.buildResult(decision.item.action, decision.status, processedAt)
        ),
        appliedProductIds: appliedDecisions
          .map((decision) => decision.item.action.itemKey.itemId)
          .sort(compareStrings),
      };
    });
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private classifyItem(
    item: ListingBatchWriteModelItem,
    current: ListingIndexItemStateRow | undefined
  ): BatchWriteDecision {
    const action = item.action;
    const payloadHash = item.syncWriteModel.writeModelHash;

    if (current && action.sourceSequence < current.sourceSequence) {
      return {
        item,
        payloadHash,
        status: "ignored_stale",
      };
    }

    if (current && action.sourceSequence === current.sourceSequence) {
      if (action.effectiveIdempotencyKey !== current.lastEffectiveIdempotencyKey) {
        throw new ListingIndexActionScriptError([
          {
            code: "REVISION_CONFLICT",
            field: ["sourceSequence"],
            message:
              "Listing index action reused a sourceSequence with a different idempotency key",
          },
        ]);
      }

      if (payloadHash === current.payloadHash) {
        return {
          item,
          payloadHash,
          status: "noop",
        };
      }

      throw new ListingIndexActionScriptError([
        {
          code: "REVISION_CONFLICT",
          field: ["sourceSequence"],
          message:
            "Listing sync action reused a sourceSequence with a different payload",
        },
      ]);
    }

    return {
      item,
      payloadHash,
      status: "applied",
    };
  }

  private async applySyncBatch(
    decisions: readonly BatchWriteDecision[],
    processedAt: string
  ): Promise<void> {
    const appliedItems = decisions
      .map((decision) => decision.item)
      .sort(compareBatchWriteItems);
    const productIds = appliedItems.map((item) => item.action.itemKey.itemId);
    const productDocIds =
      await this.repository.listingDocIdAllocator.allocateProductDocIds(
        productIds
      );
    const variantIds = uniqueSortedStrings(
      appliedItems.flatMap((item) =>
        item.syncWriteModel.writeModelJson.variants.map(
          (variant) => variant.variantId
        )
      )
    );
    const variantDocIds =
      await this.repository.listingDocIdAllocator.allocateVariantDocIds(
        variantIds
      );
    const existingVariants =
      await this.repository.variantListingIndex.getByProductIds(productIds);
    const payload = this.buildMergedPayload({
      decisions,
      appliedItems,
      productDocIds,
      variantDocIds,
      existingVariants,
      processedAt,
    });

    await this.repository.productListingIndex.ensureBootstrapRows(
      payload.productBootstrapRows
    );
    await this.repository.productListingIndex.upsertMany(payload.productRows);
    await this.repository.productListingPriceIndex.replaceForProducts(
      payload.productPricesByProductId
    );
    await this.repository.productTitleBm25SearchIndex.replaceForProducts(
      payload.productTitleRowsByProductId
    );
    await this.repository.listingPostingProductSort.replaceForProducts(
      payload.productSortRowsByProductDocId
    );
    await this.replaceProductMemberships(payload.productMemberships);
    await this.repository.variantListingIndex.upsertMany(payload.variantRows);
    await this.repository.variantListingPriceIndex.replaceForVariants(
      payload.sourcePriceRowsByVariantId
    );
    await this.repository.listingPostingVariantPrice.replaceForVariants(
      payload.runtimePriceRowsByVariantDocId
    );
    await this.replaceVariantMemberships(payload.variantMemberships);
    await this.deleteStaleVariantDependencies(payload.staleVariants);
    await this.repository.variantListingIndex.deleteByVariantIds(
      payload.staleVariants.map((variant) => variant.variantId)
    );
    await this.repository.listingPostingVariantProjectionBlock.refreshBlocksForVariantDocIds(
      payload.projectionRefreshVariantDocIds
    );
    await this.repository.listingIndexItemState.upsertLatestStates(
      payload.stateRows
    );
  }

  private buildMergedPayload(input: {
    decisions: readonly BatchWriteDecision[];
    appliedItems: readonly ListingBatchWriteModelItem[];
    productDocIds: ReadonlyMap<string, number>;
    variantDocIds: ReadonlyMap<string, number>;
    existingVariants: readonly VariantListingIndex[];
    processedAt: string;
  }): MergedBatchSyncPayload {
    const productBootstrapRows: ProductListingIndexBootstrapInput[] = [];
    const productRows: ProductListingIndexUpsertInput[] = [];
    const productPricesByProductId = new Map<
      string,
      ProductListingPriceRowInput[]
    >();
    const productTitleRowsByProductId = new Map<
      string,
      ProductTitleBm25RowInput[]
    >();
    const productSortRowsByProductDocId = new Map<
      number,
      ProductSortRowInput[]
    >();
    const productMemberships: ProductMembershipReplacement[] = [];
    const variantRows: VariantListingIndexUpsertInput[] = [];
    const sourcePriceRowsByVariantId = new Map<
      string,
      VariantListingPriceRowInput[]
    >();
    const runtimePriceRowsByVariantDocId = new Map<
      number,
      RuntimeVariantPriceRowInput[]
    >();
    const variantMemberships: VariantMembershipReplacement[] = [];
    const currentVariantIdsByProductId = new Map<string, Set<string>>();

    for (const item of input.appliedItems) {
      const action = item.action;
      const productId = action.itemKey.itemId;
      const writeModel = item.syncWriteModel.writeModelJson;
      const productDocId = getRequiredMapValue(
        input.productDocIds,
        productId,
        "product doc id"
      );
      const currentVariantIds = new Set(
        writeModel.variants.map((variant) => variant.variantId)
      );

      currentVariantIdsByProductId.set(productId, currentVariantIds);
      productBootstrapRows.push({
        productId,
        productDocId,
        kind: writeModel.productKind,
        productCreatedAt: writeModel.product.productCreatedAt,
        productUpdatedAt: writeModel.product.productUpdatedAt,
      });
      productRows.push({
        ...writeModel.product,
        productDocId,
      });
      productPricesByProductId.set(
        productId,
        [...writeModel.productPrices].sort(compareCurrencyRows)
      );
      productTitleRowsByProductId.set(
        productId,
        [...writeModel.productTitleRows].sort(compareProductTitleRows)
      );
      productSortRowsByProductDocId.set(
        productDocId,
        writeModel.productSortRows
          .map((row) => ({
            ...row,
            productDocId,
          }))
          .sort(compareProductSortRows)
      );
      productMemberships.push(
        buildProductMembership(productDocId, "category", writeModel),
        buildProductMembership(productDocId, "vendor", writeModel),
        buildProductMembership(productDocId, "facet", writeModel)
      );

      for (const variant of writeModel.variants) {
        const variantDocId = getRequiredMapValue(
          input.variantDocIds,
          variant.variantId,
          "variant doc id"
        );
        const variantRow: VariantListingIndexUpsertInput = {
          ...variant,
          productDocId,
          variantDocId,
        };

        variantRows.push(variantRow);
        sourcePriceRowsByVariantId.set(
          variant.variantId,
          (writeModel.variantPricesByVariantId[variant.variantId] ?? [])
            .map((row) => ({
              ...row,
              productDocId,
              variantDocId,
            }))
            .sort(compareCurrencyRows)
        );
        runtimePriceRowsByVariantDocId.set(
          variantDocId,
          (writeModel.runtimePricesByVariantId[variant.variantId] ?? [])
            .map((row) => ({
              ...row,
              productDocId,
              variantDocId,
            }))
            .sort(compareCurrencyRows)
        );
        variantMemberships.push(
          {
            variantDocId,
            field: "facet",
            nextValueKeys: sortedValueKeys(
              writeModel.variantFacetValueKeysByVariantId[variant.variantId] ?? []
            ),
          },
          {
            variantDocId,
            field: "variant_product",
            nextValueKeys: sortedValueKeys(
              writeModel.variantProductValueKeysByVariantId[variant.variantId] ??
                []
            ),
          }
        );
      }
    }

    const staleVariants = input.existingVariants
      .filter((variant) => {
        const currentVariantIds = currentVariantIdsByProductId.get(
          variant.productId
        );
        return currentVariantIds ? !currentVariantIds.has(variant.variantId) : false;
      })
      .map((variant) => ({
        variantId: variant.variantId,
        variantDocId: variant.variantDocId,
      }))
      .sort(compareStaleVariants);
    const projectionRefreshVariantDocIds = uniqueSortedNumbers([
      ...variantRows.map((variant) => variant.variantDocId),
      ...staleVariants.map((variant) => variant.variantDocId),
    ]);
    const payloadHashByProductId = new Map(
      input.decisions.map((decision) => [
        decision.item.action.itemKey.itemId,
        decision.payloadHash,
      ])
    );
    const stateRows = input.appliedItems.map((item) => {
      const action = item.action;
      const payloadHash = payloadHashByProductId.get(action.itemKey.itemId);
      if (!payloadHash) {
        throw new Error(
          `Failed to resolve payload hash for product: ${action.itemKey.itemId}`
        );
      }

      return {
        storeId: action.itemKey.storeId,
        itemId: action.itemKey.itemId,
        sourceSequence: action.sourceSequence,
        payloadHash,
        lifecycleStatus: "indexed",
        lastEffectiveIdempotencyKey: action.effectiveIdempotencyKey,
        lastOperationId: action.params.meta.operationId,
        updatedAt: input.processedAt,
      } satisfies ListingIndexItemStateRow;
    });

    return {
      productBootstrapRows: productBootstrapRows.sort(compareProductBootstrapRows),
      productRows: productRows.sort(compareProductRows),
      productPricesByProductId: sortStringMap(productPricesByProductId),
      productTitleRowsByProductId: sortStringMap(productTitleRowsByProductId),
      productSortRowsByProductDocId: sortNumberMap(productSortRowsByProductDocId),
      productMemberships: productMemberships.sort(compareProductMemberships),
      variantRows: variantRows.sort(compareVariantRows),
      sourcePriceRowsByVariantId: sortStringMap(sourcePriceRowsByVariantId),
      runtimePriceRowsByVariantDocId: sortNumberMap(
        runtimePriceRowsByVariantDocId
      ),
      variantMemberships: variantMemberships.sort(compareVariantMemberships),
      staleVariants,
      projectionRefreshVariantDocIds,
      stateRows,
    };
  }

  private async replaceProductMemberships(
    replacements: readonly ProductMembershipReplacement[]
  ): Promise<void> {
    for (const replacement of replacements) {
      await this.repository.listingPostingBitmap.replaceProductMemberships(
        replacement
      );
    }
  }

  private async replaceVariantMemberships(
    replacements: readonly VariantMembershipReplacement[]
  ): Promise<void> {
    for (const replacement of replacements) {
      await this.repository.listingPostingBitmap.replaceVariantMemberships(
        replacement
      );
    }
  }

  private async deleteStaleVariantDependencies(
    variants: readonly StaleVariant[]
  ): Promise<void> {
    for (const variant of variants) {
      await this.repository.listingPostingBitmap.deleteVariantMemberships(
        variant.variantDocId
      );
    }

    await this.repository.listingPostingVariantPrice.deleteByVariantDocIds(
      variants.map((variant) => variant.variantDocId)
    );
    await this.repository.variantListingPriceIndex.deleteByVariantIds(
      variants.map((variant) => variant.variantId)
    );
  }

  private buildResult(
    action: ListingPreparedSyncAction,
    status: BatchWriteDecisionStatus,
    processedAt: string
  ): Listing.ListingUpdateResult {
    const result: Listing.ListingUpdateResult = {
      operationId: action.params.meta.operationId,
      storeId: action.itemKey.storeId,
      itemRef: {
        entityType: action.itemKey.entityType,
        id: action.itemKey.itemId,
      },
      sourceSequence: action.sourceSequence,
      status,
      processedAt,
    };

    if (action.warnings && action.warnings.length > 0) {
      result.warnings = action.warnings;
    }

    return result;
  }
}

function buildRunScriptContext(action: ListingPreparedSyncAction): RunScriptContext {
  const locale = action.params.item.content.defaultLocale;

  return {
    storeId: action.itemKey.storeId,
    organizationId: action.organizationId,
    requestId: action.params.meta.source.requestId ?? action.params.meta.operationId,
    locale,
    defaultLocale: locale,
  };
}

function validateBatchInput(items: readonly ListingBatchWriteModelItem[]): void {
  const seen = new Set<string>();
  const first = items[0]?.action;
  if (!first) {
    return;
  }

  for (const [index, item] of items.entries()) {
    const action = item.action;
    const key = itemStateKey(action);

    if (action.itemKey.storeId !== first.itemKey.storeId) {
      throw new ListingIndexActionScriptError([
        {
          code: "PROJECT_MISMATCH",
          field: ["items", String(index), "storeId"],
          message: "Batch write items must belong to one store",
        },
      ]);
    }

    if (action.organizationId !== first.organizationId) {
      throw new ListingIndexActionScriptError([
        {
          code: "PROJECT_MISMATCH",
          field: ["items", String(index), "organizationId"],
          message: "Batch write items must belong to one organization",
        },
      ]);
    }

    if (seen.has(key)) {
      throw new ListingIndexActionScriptError([
        {
          code: "VALIDATION_FAILED",
          field: ["items", String(index), "itemRef"],
          message: "Batch write contains duplicate item refs",
        },
      ]);
    }

    seen.add(key);
  }
}

function itemStateKey(action: ListingPreparedSyncAction): string {
  return stateKey(action.itemKey);
}

function stateKey(key: ListingIndexItemStateKey): string {
  return `${key.storeId}:${key.itemId}`;
}

function buildProductMembership(
  productDocId: number,
  field: ProductMembershipReplacement["field"],
  writeModel: ListingSyncWriteModelJson
): ProductMembershipReplacement {
  return {
    productDocId,
    field,
    nextValueKeys: sortedValueKeys(writeModel.productPostingValueKeys[field]),
  };
}

function getRequiredMapValue<TKey, TValue>(
  map: ReadonlyMap<TKey, TValue>,
  key: TKey,
  label: string
): TValue {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Failed to allocate ${label}: ${String(key)}`);
  }
  return value;
}

function sortedValueKeys(valueKeys: readonly string[]): string[] {
  return uniqueSortedStrings(valueKeys);
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function uniqueSortedNumbers(values: readonly number[]): number[] {
  return [...new Set(values)].sort(compareNumbers);
}

function sortStringMap<T>(map: Map<string, T[]>): Map<string, T[]> {
  return new Map(
    [...map.entries()].sort(([left], [right]) => compareStrings(left, right))
  );
}

function sortNumberMap<T>(map: Map<number, T[]>): Map<number, T[]> {
  return new Map(
    [...map.entries()].sort(([left], [right]) => compareNumbers(left, right))
  );
}

function compareBatchWriteItems(
  left: ListingBatchWriteModelItem,
  right: ListingBatchWriteModelItem
): number {
  return compareStrings(left.action.itemKey.itemId, right.action.itemKey.itemId);
}

function compareProductBootstrapRows(
  left: ProductListingIndexBootstrapInput,
  right: ProductListingIndexBootstrapInput
): number {
  return compareStrings(left.productId, right.productId);
}

function compareProductRows(
  left: ProductListingIndexUpsertInput,
  right: ProductListingIndexUpsertInput
): number {
  return compareStrings(left.productId, right.productId);
}

function compareProductSortRows(
  left: ProductSortRowInput,
  right: ProductSortRowInput
): number {
  return (
    compareStrings(left.productId, right.productId) ||
    compareStrings(left.sortKind, right.sortKind) ||
    compareStrings(left.locale ?? "", right.locale ?? "") ||
    compareStrings(left.currency ?? "", right.currency ?? "") ||
    compareStrings(left.manualScopeId ?? "", right.manualScopeId ?? "")
  );
}

function compareProductTitleRows(
  left: ProductTitleBm25RowInput,
  right: ProductTitleBm25RowInput
): number {
  return (
    compareStrings(left.productId, right.productId) ||
    compareStrings(left.locale, right.locale)
  );
}

function compareProductMemberships(
  left: ProductMembershipReplacement,
  right: ProductMembershipReplacement
): number {
  return (
    compareNumbers(left.productDocId, right.productDocId) ||
    compareStrings(left.field, right.field)
  );
}

function compareVariantRows(
  left: VariantListingIndexUpsertInput,
  right: VariantListingIndexUpsertInput
): number {
  return compareStrings(left.variantId, right.variantId);
}

function compareVariantMemberships(
  left: VariantMembershipReplacement,
  right: VariantMembershipReplacement
): number {
  return (
    compareNumbers(left.variantDocId, right.variantDocId) ||
    compareStrings(left.field, right.field)
  );
}

function compareStaleVariants(left: StaleVariant, right: StaleVariant): number {
  return (
    compareStrings(left.variantId, right.variantId) ||
    compareNumbers(left.variantDocId, right.variantDocId)
  );
}

function compareCurrencyRows(
  left: { currency: string },
  right: { currency: string }
): number {
  return compareStrings(left.currency, right.currency);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}
