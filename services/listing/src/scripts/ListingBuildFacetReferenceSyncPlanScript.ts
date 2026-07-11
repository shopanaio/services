import { hashContent } from "@shopana/shared-kernel";
import { BaseScript } from "../kernel/BaseScript.js";
import type {
  ListingPreparedDeleteAction,
  ListingPreparedSyncAction,
  ListingSyncWriteModel,
} from "./listingIndexActionTypes.js";
import type {
  FacetReferenceStateSyncReason,
  FacetSourceRef,
} from "../workflows/FacetReferenceStateSyncWorkflow.js";
import {
  decodeListingVariantTerm,
  isOptionFieldKey,
} from "../listing/variantTerms/index.js";

export interface ListingFacetReferenceSyncPlan {
  organizationId: string;
  storeId: string;
  productId: string;
  actionType: "syncSellableItem" | "deleteSellableItem";
  reason: FacetReferenceStateSyncReason;
  eventSequence: number;
  operationId: string;
  refs: FacetSourceRef[];
  refsHash: string;
}

export type ListingBuildFacetReferenceSyncPlanInput =
  | {
      action: ListingPreparedSyncAction;
      syncWriteModel: ListingSyncWriteModel;
    }
  | {
      action: ListingPreparedDeleteAction;
    };

export class ListingBuildFacetReferenceSyncPlanScript extends BaseScript<
  ListingBuildFacetReferenceSyncPlanInput,
  ListingFacetReferenceSyncPlan
> {
  protected async execute(
    input: ListingBuildFacetReferenceSyncPlanInput
  ): Promise<ListingFacetReferenceSyncPlan> {
    return "syncWriteModel" in input
      ? this.buildSyncPlan(input.action, input.syncWriteModel)
      : this.buildDeletePlan(input.action);
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async buildSyncPlan(
    action: ListingPreparedSyncAction,
    syncWriteModel: ListingSyncWriteModel
  ): Promise<ListingFacetReferenceSyncPlan> {
    const productId = action.itemKey.itemId;
    const existingProduct =
      await this.repository.productListingIndex.findByProductId(productId);
    const existingVariants =
      await this.repository.variantListingIndex.getByProductIds([productId]);
    const oldValueKeys = await this.collectOldValueKeys({
      productDocId: existingProduct?.productDocId,
      variantDocIds: existingVariants.map((variant) => variant.variantDocId),
    });
    const writeModel = syncWriteModel.writeModelJson;
    const newValueKeys = [
      ...writeModel.productPostingValueKeys.facet,
      ...Object.values(writeModel.variantTermsByVariantId)
        .flat()
        .filter((term) => isOptionFieldKey(term.fieldKey))
        .map(optionTermFacetValueKey),
    ];

    return this.buildPlan({
      action,
      actionType: "syncSellableItem",
      reason: existingProduct ? "productUpdated" : "productCreated",
      valueKeys: [...oldValueKeys, ...newValueKeys],
    });
  }

  private async buildDeletePlan(
    action: ListingPreparedDeleteAction
  ): Promise<ListingFacetReferenceSyncPlan> {
    const productId = action.itemKey.itemId;
    const [existingProduct, existingVariants] = await Promise.all([
      this.repository.productListingIndex.findByProductId(productId),
      this.repository.variantListingIndex.getByProductIds([productId]),
    ]);
    const oldValueKeys = await this.collectOldValueKeys({
      productDocId: existingProduct?.productDocId,
      variantDocIds: existingVariants.map((variant) => variant.variantDocId),
    });

    return this.buildPlan({
      action,
      actionType: "deleteSellableItem",
      reason: "productDeleted",
      valueKeys: oldValueKeys,
    });
  }

  private async collectOldValueKeys(input: {
    productDocId?: number;
    variantDocIds: readonly number[];
  }): Promise<string[]> {
    const valueKeys: string[] = [];
    if (input.productDocId !== undefined) {
      const keys = await this.repository.listingPostingBitmap.getMembershipKeys({
        entityType: "product",
        docId: input.productDocId,
        field: "facet",
      });
      valueKeys.push(...keys.map((key) => key.valueKey));
    }

    for (const variantDocId of input.variantDocIds) {
      const keys = await this.repository.listingPostingBitmap.getMembershipKeys({
        entityType: "variant",
        docId: variantDocId,
        field: "term",
      });
      valueKeys.push(
        ...keys
          .map((key) => decodeListingVariantTerm(key.valueKey))
          .filter((term) => isOptionFieldKey(term.fieldKey))
          .map(optionTermFacetValueKey)
      );
    }

    return valueKeys;
  }

  private async buildPlan(input: {
    action: ListingPreparedSyncAction | ListingPreparedDeleteAction;
    actionType: "syncSellableItem" | "deleteSellableItem";
    reason: FacetReferenceStateSyncReason;
    valueKeys: readonly string[];
  }): Promise<ListingFacetReferenceSyncPlan> {
    const refs = await this.repository.facet.getSourceRefsByPostingValueKeys(
      input.valueKeys
    );

    return {
      organizationId: input.action.organizationId,
      storeId: input.action.itemKey.storeId,
      productId: input.action.itemKey.itemId,
      actionType: input.actionType,
      reason: input.reason,
      eventSequence: input.action.eventSequence,
      operationId: input.action.params.meta.operationId,
      refs,
      refsHash: hashContent({ v: 1, refs }),
    };
  }
}

function optionTermFacetValueKey(term: {
  fieldKey: string;
  valueKey: string;
}): string {
  return `${term.fieldKey.slice("option:".length)}:${term.valueKey}`;
}
