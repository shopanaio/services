import { BaseScript } from "../kernel/BaseScript.js";
import { hashContent } from "@shopana/shared-kernel";
import type {
  ListingPreparedSyncAction,
  ListingSyncWriteModelJson,
  ListingSyncWriteModel,
} from "./listingIndexActionTypes.js";
import type {
  ProductKind,
  ProductSortRowInput,
} from "../repositories/listing/listingRepositoryTypes.js";
import {
  buildVariantSignatureKey as buildOptionVariantSignatureKey,
} from "../repositories/listing/listingRepositoryTypes.js";

export class ListingBuildSyncWriteModelScript extends BaseScript<
  { action: ListingPreparedSyncAction },
  ListingSyncWriteModel
> {
  protected async execute(input: {
    action: ListingPreparedSyncAction;
  }): Promise<ListingSyncWriteModel> {
    const item = input.action.params.item;
    const productKind: ProductKind =
      item.entityType === "bundle" ? "BUNDLE" : "BASE";
    const listingStatus: "published" | "draft" =
      item.status === "published" ? "published" : "draft";
    const totalStock = item.availability.totalQuantity ?? sumVariantStock(item);
    const inStock =
      item.availability.availableForSale &&
      (totalStock > 0 || item.variants.some((variant) => variant.availability.availableForSale));

    const writeModelJson: ListingSyncWriteModelJson = {
      product: {
        productId: item.id,
        kind: productKind,
        vendorId: item.vendorId ?? null,
        handle: item.content.translations[item.content.defaultLocale]?.title ?? item.id,
        status: listingStatus,
        publishedAt: item.publishedAt,
        productCreatedAt: item.createdAt,
        productUpdatedAt: item.updatedAt,
        productRevision: item.productRevision,
        inStock,
        totalStock,
      },
      productKind,
      productPrices: item.priceRanges
        .map((price) => ({
          productId: item.id,
          currency: price.currencyCode,
          hasPrice: price.minAmountMinor !== null || price.maxAmountMinor !== null,
          minPriceMinor: price.minAmountMinor,
          maxPriceMinor: price.maxAmountMinor,
        }))
        .sort((left, right) => left.currency.localeCompare(right.currency)),
      productSortRows: buildProductSortRows(item),
      productTitleRows: Object.entries(item.content.translations)
        .filter(([, translation]) => translation.title.trim().length > 0)
        .map(([locale, translation]) => ({
          productId: item.id,
          locale,
          kind: productKind,
          status: listingStatus,
          publishedAt: item.publishedAt,
          productCreatedAt: item.createdAt,
          productUpdatedAt: item.updatedAt,
          productRevision: item.productRevision,
          title: translation.title,
        }))
        .sort((left, right) => left.locale.localeCompare(right.locale)),
      productPostingValueKeys: {
        category: item.scopes
          .filter((scope) => scope.scopeType === "category")
          .map((scope) => scope.categoryId)
          .sort(),
        vendor: item.vendorId ? [item.vendorId] : [],
        facet: item.productFacets.flatMap(facetValueKeys).sort(),
      },
      variants: item.variants
        .map((variant) => {
          const variantTotalStock = variant.availability.totalQuantity ?? null;
          return {
            productId: item.id,
            variantId: variant.id,
            signatureKey: buildVariantSignatureKey(variant),
            inStock:
              variant.availability.availableForSale &&
              (variantTotalStock === null || variantTotalStock > 0),
            totalStock: variantTotalStock ?? 0,
          };
        })
        .sort((left, right) => left.variantId.localeCompare(right.variantId)),
      variantPricesByVariantId: Object.fromEntries(
        item.variants
          .map((variant) => [
            variant.id,
            variant.prices
              .map((price) => ({
                variantId: variant.id,
                productId: item.id,
                currency: price.currencyCode,
                signatureKey: buildVariantSignatureKey(variant),
                hasPrice: price.amountMinor !== null,
                priceMinor: price.amountMinor,
              }))
              .sort((left, right) => left.currency.localeCompare(right.currency)),
          ])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ),
      variantFacetValueKeysByVariantId: Object.fromEntries(
        item.variants
          .map((variant) => [variant.id, variant.facets.flatMap(facetValueKeys).sort()])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ),
      variantProductValueKeysByVariantId: Object.fromEntries(
        item.variants
          .map((variant) => [variant.id, [item.id]])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ),
    };

    return {
      version: 1,
      actionType: "syncSellableItem",
      writeModelJson,
      writeModelHash: hashContent({
        v: 1,
        actionType: "syncSellableItem",
        writeModelJson,
      }),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function sumVariantStock(item: ListingPreparedSyncAction["params"]["item"]): number {
  return item.variants.reduce(
    (sum, variant) => sum + (variant.availability.totalQuantity ?? 0),
    0
  );
}

function buildProductSortRows(
  item: ListingPreparedSyncAction["params"]["item"]
): ListingSyncWriteModelJson["productSortRows"] {
  const title =
    item.content.translations[item.content.defaultLocale]?.title ??
    Object.values(item.content.translations)[0]?.title ??
    item.id;
  const rows: Omit<ProductSortRowInput, "productDocId">[] = [
    {
      productId: item.id,
      sortKind: "newest",
      boolValue: item.availability.availableForSale,
      timestamptzValue: item.createdAt,
      timestamptzValue2: item.updatedAt,
    },
    {
      productId: item.id,
      sortKind: "name",
      locale: item.content.defaultLocale,
      boolValue: item.availability.availableForSale,
      textValue: title,
    },
    {
      productId: item.id,
      sortKind: "availability",
      boolValue: item.availability.availableForSale,
      bigintValue: item.availability.totalQuantity ?? 0,
    },
  ];

  for (const price of item.priceRanges) {
    if (price.minAmountMinor !== null) {
      rows.push({
        productId: item.id,
        sortKind: "price",
        currency: price.currencyCode,
        boolValue: item.availability.availableForSale,
        bigintValue: price.minAmountMinor,
      });
    }
  }

  for (const scope of item.scopes) {
    if (scope.scopeType === "category" && scope.manualRank) {
      rows.push({
        productId: item.id,
        sortKind: "manual",
        manualScopeId: scope.categoryId,
        boolValue: item.availability.availableForSale,
        textValue: scope.manualRank,
      });
    }
  }

  return rows.sort((left, right) =>
    [
      left.sortKind.localeCompare(right.sortKind),
      (left.locale ?? "").localeCompare(right.locale ?? ""),
      (left.currency ?? "").localeCompare(right.currency ?? ""),
      (left.manualScopeId ?? "").localeCompare(right.manualScopeId ?? ""),
    ].find((value) => value !== 0) ?? 0
  );
}

function facetValueKeys(
  facet: ListingPreparedSyncAction["params"]["item"]["productFacets"][number]
): string[] {
  return facet.values.map((value) => {
    if (!facet.facet.id || !value.id) {
      throw new Error(
        `Facet value key requires facet id and value id: facet=${facet.facet.handle}, value=${value.handle}`
      );
    }

    return [facet.facet.id, value.id].join(":");
  });
}

function buildVariantSignatureKey(
  variant: ListingPreparedSyncAction["params"]["item"]["variants"][number]
): string {
  return buildOptionVariantSignatureKey(variant.facets.flatMap(facetValueKeys));
}
