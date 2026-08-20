import { BaseScript } from "../kernel/BaseScript.js";
import { hashContent } from "@shopana/shared-kernel";
import { canonicalCollectionRuleTermKeys } from "@shopana/broker-types";
import type {
  ListingPreparedSyncAction,
  ListingSyncWriteModelJson,
  ListingSyncWriteModel,
} from "./listingIndexActionTypes.js";
import type {
  ProductSortRowInput,
} from "../repositories/listing/listingRepositoryTypes.js";
import {
  materializeListingVariantTerms,
  type ListingVariantTerm,
} from "../listing/variantTerms/index.js";
import { SearchQueryNormalizer } from "../search/normalization/SearchQueryNormalizer.js";
import type { SearchDocumentElementInput } from "../search/normalization/types.js";
import type { SearchTextField } from "../repositories/search/searchRepositoryTypes.js";
import type { ListingSearchIndexProductWriteModel } from "../repositories/listing/ListingSearchIndexRepository.js";

export class ListingBuildSyncWriteModelScript extends BaseScript<
  { action: ListingPreparedSyncAction },
  ListingSyncWriteModel
> {
  private readonly searchNormalizer = new SearchQueryNormalizer();

  protected async execute(input: {
    action: ListingPreparedSyncAction;
  }): Promise<ListingSyncWriteModel> {
    const item = input.action.params.item;
    const listingStatus: "published" | "draft" =
      item.status === "published" ? "published" : "draft";
    const indexableVariants = item.variants.filter(isIndexableVariant);
    const knownVariantIds = new Set(item.variants.map((variant) => variant.id));
    for (const facts of item.ruleFacts.variantTerms) {
      if (!knownVariantIds.has(facts.variantId)) {
        throw new Error(
          `Rule facts reference unknown variant: ${facts.variantId}`,
        );
      }
    }
    const variantTermsByVariantId: Record<
      string,
      readonly ListingVariantTerm[]
    > = Object.fromEntries(
      indexableVariants
        .map((variant) => [variant.id, buildVariantTerms(variant)] as const)
        .sort(([left], [right]) => String(left).localeCompare(String(right)))
    );
    const productAvailable = Object.values(variantTermsByVariantId).some(
      (terms) =>
        terms.some(
          (term) =>
            term.fieldKey === "criterion.availability" &&
            term.valueKey === "available"
        )
    );
    const totalStock = indexableVariants.reduce(
      (sum, variant) => sum + (variant.availability.totalQuantity ?? 0),
      0
    );

    const writeModelJson: ListingSyncWriteModelJson = {
      product: {
        productId: item.id,
        entityType: item.entityType,
        vendorId: item.vendorId ?? null,
        handle: item.content.translations[item.content.defaultLocale]?.title ?? item.id,
        status: listingStatus,
        publishedAt: item.publishedAt,
        productCreatedAt: item.createdAt,
        productUpdatedAt: item.updatedAt,
        productRevision: item.productRevision,
        totalStock,
      },
      productEntityType: item.entityType,
      productPrices: item.priceRanges
        .map((price) => ({
          productId: item.id,
          currency: price.currencyCode,
          hasPrice: price.minAmountMinor !== null || price.maxAmountMinor !== null,
          minPriceMinor: price.minAmountMinor,
          maxPriceMinor: price.maxAmountMinor,
        }))
        .sort((left, right) => left.currency.localeCompare(right.currency)),
      productSortRows: buildProductSortRows(item, productAvailable),
      searchIndex: buildSearchIndex(item, this.searchNormalizer),
      productPostingValueKeys: {
        category: item.scopes
          .filter((scope) => scope.scopeType === "category")
          .map((scope) => scope.categoryId)
          .sort(),
        vendor: item.vendorId ? [item.vendorId] : [],
        facet: item.productFacets.flatMap(facetValueKeys).sort(),
        collection: item.scopes
          .filter((scope) => scope.scopeType === "collection")
          .map((scope) => scope.collectionId)
          .sort(),
        ruleTerm: canonicalCollectionRuleTermKeys(
          item.ruleFacts.productTerms.map((term) =>
            term.kind === "tag"
              ? {
                  entityType: "product" as const,
                  kind: "tag" as const,
                  tagId: term.tagId,
                }
              : {
                  entityType: "product" as const,
                  kind: "feature" as const,
                  sourceHandle: term.sourceHandle,
                  valueHandle: term.valueHandle,
                }
          )
        ),
      },
      variants: indexableVariants
        .map((variant) => {
          const variantTotalStock = variant.availability.totalQuantity ?? null;
          return {
            productId: item.id,
            variantId: variant.id,
            totalStock: variantTotalStock ?? 0,
          };
        })
        .sort((left, right) => left.variantId.localeCompare(right.variantId)),
      variantPricesByVariantId: Object.fromEntries(
        indexableVariants
          .map((variant) => [
            variant.id,
            variant.prices
              .map((price) => ({
                variantId: variant.id,
                productId: item.id,
                currency: price.currencyCode,
                hasPrice: price.amountMinor !== null,
                priceMinor: price.amountMinor,
              }))
              .sort((left, right) => left.currency.localeCompare(right.currency)),
          ])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ),
      variantTermsByVariantId,
      variantRuleTermValueKeysByVariantId: Object.fromEntries(
        item.ruleFacts.variantTerms
          .filter(({ variantId }) =>
            indexableVariants.some((variant) => variant.id === variantId)
          )
          .map(({ variantId, terms }) => [
            variantId,
            canonicalCollectionRuleTermKeys(
              terms.map((term) => ({
                entityType: "variant" as const,
                kind: "option" as const,
                sourceHandle: term.sourceHandle,
                valueHandle: term.valueHandle,
              }))
            ),
          ])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ),
      variantProductValueKeysByVariantId: Object.fromEntries(
        indexableVariants
          .map((variant) => [variant.id, [item.id]])
          .sort(([left], [right]) => String(left).localeCompare(String(right)))
      ),
    };

    return {
      version: 5,
      actionType: "syncSellableItem",
      writeModelJson,
      writeModelHash: hashContent({
        v: 5,
        actionType: "syncSellableItem",
        writeModelJson,
      }),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

function buildSearchIndex(
  item: ListingPreparedSyncAction["params"]["item"],
  normalizer: SearchQueryNormalizer
): ListingSearchIndexProductWriteModel {
  const documentInputs: SearchDocumentElementInput[] = [];
  const seenDocumentKeys = new Set<string>();
  const locales = new Set<string>();
  const variantIds = new Set(item.variants.map((variant) => variant.id));
  const categoryIds = new Set(
    item.scopes
      .filter((scope) => scope.scopeType === "category")
      .map((scope) => scope.categoryId)
  );

  for (const localeContent of item.searchContent.locales) {
    const locale = localeContent.locale.trim();
    if (!locale) {
      throw new Error("Search content locale must not be empty");
    }
    if (locales.has(locale)) {
      throw new Error(`Duplicate search content locale: ${locale}`);
    }
    locales.add(locale);

    if (localeContent.productTitle) {
      if (localeContent.productTitle.elementId !== item.id) {
        throw new Error("Product title search elementId must match product id");
      }
      addSearchDocumentInput({
        inputs: documentInputs,
        seenKeys: seenDocumentKeys,
        locale,
        field: "product_title",
        source: localeContent.productTitle,
      });
    }
    for (const source of localeContent.variantTitles) {
      if (!variantIds.has(source.elementId)) {
        throw new Error(`Unknown variant title search elementId: ${source.elementId}`);
      }
      addSearchDocumentInput({
        inputs: documentInputs,
        seenKeys: seenDocumentKeys,
        locale,
        field: "variant_title",
        source,
      });
    }
    if (item.searchContent.vendor) {
      if (
        item.vendorId &&
        item.searchContent.vendor.elementId !== item.vendorId
      ) {
        throw new Error("Vendor search elementId must match product vendorId");
      }
      addSearchDocumentInput({
        inputs: documentInputs,
        seenKeys: seenDocumentKeys,
        locale,
        field: "vendor_name",
        source: item.searchContent.vendor,
      });
    }
    for (const source of localeContent.categoryNames) {
      if (!categoryIds.has(source.elementId)) {
        throw new Error(`Unknown category name search elementId: ${source.elementId}`);
      }
      addSearchDocumentInput({
        inputs: documentInputs,
        seenKeys: seenDocumentKeys,
        locale,
        field: "category_name",
        source,
      });
    }
  }

  const normalizedElements = normalizer.normalizeDocumentBatch(documentInputs);
  const textElements = normalizedElements.map((element) => ({
    productId: item.id,
    locale: element.locale,
    field: element.field,
    elementId: element.elementId,
    preparedText: element.preparedText,
    normalizationContractVersion: element.normalizationContractVersion,
    normalizationProfileRevision: element.normalizationProfileRevision,
  }));
  const identifiers = [...locales]
    .sort(compareStrings)
    .flatMap((locale) =>
      item.searchContent.skus.map((source) => {
        if (!variantIds.has(source.elementId)) {
          throw new Error(`Unknown SKU search elementId: ${source.elementId}`);
        }
        const normalized = normalizer.normalizeIdentifier({
          locale,
          value: requiredSearchValue(source.value, "SKU"),
        });
        return {
          productId: item.id,
          locale,
          elementId: source.elementId,
          kind: "SKU" as const,
          normalizedValue: normalized.normalizedValue,
          normalizationContractVersion: normalized.normalizationContractVersion,
          normalizationProfileRevision: normalized.normalizationProfileRevision,
        };
      })
    )
    .sort(
      (left, right) =>
        left.locale.localeCompare(right.locale) ||
        left.elementId.localeCompare(right.elementId)
    );
  const terms = [
    ...new Map(
      normalizedElements.flatMap((element) =>
        element.surfaceTerms.map((term) => [
          JSON.stringify([element.locale, term]),
          { locale: element.locale, term },
        ] as const)
      )
    ).values(),
  ].sort(
    (left, right) =>
      left.locale.localeCompare(right.locale) || left.term.localeCompare(right.term)
  );

  return { textElements, identifiers, terms };
}

function addSearchDocumentInput(input: {
  inputs: SearchDocumentElementInput[];
  seenKeys: Set<string>;
  locale: string;
  field: SearchTextField;
  source: { elementId: string; value: string };
}): void {
  const elementId = input.source.elementId.trim();
  if (!elementId) {
    throw new Error(`${input.field} search elementId must not be empty`);
  }
  const key = JSON.stringify([input.locale, input.field, elementId]);
  if (input.seenKeys.has(key)) {
    throw new Error(`Duplicate search content element: ${key}`);
  }
  input.seenKeys.add(key);
  input.inputs.push({
    locale: input.locale,
    field: input.field,
    elementId,
    sourceText: requiredSearchValue(input.source.value, input.field),
  });
}

function requiredSearchValue(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} search value must not be empty`);
  }
  return trimmed;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function buildProductSortRows(
  item: ListingPreparedSyncAction["params"]["item"],
  productAvailable: boolean
): ListingSyncWriteModelJson["productSortRows"] {
  const rows: Omit<ProductSortRowInput, "productDocId">[] = [
    {
      productId: item.id,
      sortKind: "newest",
      boolValue: productAvailable,
      timestamptzValue: item.publishedAt,
      timestamptzValue2: item.createdAt,
    },
    {
      productId: item.id,
      sortKind: "created",
      boolValue: productAvailable,
      timestamptzValue: item.createdAt,
    },
    {
      productId: item.id,
      sortKind: "availability",
      boolValue: productAvailable,
      bigintValue: item.availability.totalQuantity ?? 0,
    },
  ];

  for (const [locale, translation] of Object.entries(
    item.content.translations
  )) {
    rows.push({
      productId: item.id,
      sortKind: "name",
      locale,
      boolValue: productAvailable,
      textValue: translation.title,
    });
  }

  for (const price of item.priceRanges) {
    if (price.minAmountMinor !== null) {
      rows.push({
        productId: item.id,
        sortKind: "price",
        currency: price.currencyCode,
        boolValue: productAvailable,
        bigintValue: price.minAmountMinor,
      });
    }
  }

  for (const scope of item.scopes) {
    if (scope.manualRank) {
      rows.push({
        productId: item.id,
        sortKind: "manual",
        manualScopeId:
          scope.scopeType === "category"
            ? scope.categoryId
            : scope.collectionId,
        boolValue: productAvailable,
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

function buildVariantTerms(
  variant: ListingPreparedSyncAction["params"]["item"]["variants"][number]
): ListingVariantTerm[] {
  const availableForSale = variant.availability.availableForSale;
  return materializeListingVariantTerms({
    availableForSale,
    options: variant.facets.flatMap((facet) => {
      if (!facet.facet.id) {
        throw new Error(`Variant OPTION term requires facet id: ${facet.facet.handle}`);
      }
      return facet.values.map((value) => {
        if (!value.id) {
          throw new Error(
            `Variant OPTION term requires value id: ${facet.facet.handle}:${value.handle}`
          );
        }
        return { facetId: facet.facet.id!, facetValueId: value.id };
      });
    }),
  });
}

function isIndexableVariant(
  variant: ListingPreparedSyncAction["params"]["item"]["variants"][number]
): boolean {
  return variant.status === "active";
}
