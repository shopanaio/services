import {
  normalizeCollectionRuleHandleV1,
  type Catalog,
  type Listing,
} from "@shopana/broker-types";
import { FatalError } from "@shopana/shared-kernel";

export function mapCatalogProductToListingSnapshot(input: {
  product: Catalog.CatalogProductSnapshot;
  defaultLocale: string;
  locales: readonly string[];
}): Listing.ListingSellableItemSnapshot {
  const product = input.product;
  if (product.snapshotVersion !== "2026-08-19") {
    throw new FatalError(
      `Unsupported Catalog product snapshot version: ${product.snapshotVersion}`,
      undefined,
      "UNSUPPORTED_CATALOG_SNAPSHOT_VERSION",
    );
  }

  return {
    entityType: "product",
    id: product.id,
    productRevision: product.revision,
    sourceUpdatedAt: product.updatedAt,
    status: product.status === "published" ? "published" : "draft",
    publishedAt: product.publishedAt,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    content: mapContent(product, input.defaultLocale),
    searchContent: mapSearchContent(product, input.locales),
    availability: {
      availableForSale: product.availability.availableForSale,
      totalQuantity: product.availability.totalQuantity ?? null,
    },
    priceRanges: buildPriceRanges(product.variants),
    vendorId: product.vendorId ?? null,
    scopes: mapScopes(product),
    productFacets: mapProductFacets(product),
    ruleFacts: mapRuleFacts(product),
    variants: product.variants.map(mapVariant),
  };
}

function mapContent(
  product: Catalog.CatalogProductSnapshot,
  defaultLocale: string
): Listing.ListingContentSnapshot {
  const seoByLocale = new Map(product.seo.map((seo) => [seo.locale, seo]));
  const translations: Record<string, Listing.ListingLocalizedContentSnapshot> = {};

  for (const content of product.content) {
    const seo = seoByLocale.get(content.locale);
    translations[content.locale] = {
      title: content.title,
      plainDescription: content.description?.text ?? null,
      seoTitle: seo?.seoTitle ?? null,
      seoDescription: seo?.seoDescription ?? null,
    };
  }

  if (!translations[defaultLocale]) {
    translations[defaultLocale] = {
      title: product.handle ?? product.id,
      plainDescription: null,
      seoTitle: null,
      seoDescription: null,
    };
  }

  return {
    defaultLocale,
    translations,
  };
}

function buildPriceRanges(
  variants: readonly Catalog.CatalogProductVariantSnapshot[]
): Listing.ListingPriceRangeSnapshot[] {
  const ranges = new Map<
    string,
    { currencyCode: string; minAmountMinor: number | null; maxAmountMinor: number | null }
  >();

  for (const variant of variants) {
    for (const price of variant.prices) {
      const range =
        ranges.get(price.currencyCode) ??
        {
          currencyCode: price.currencyCode,
          minAmountMinor: null,
          maxAmountMinor: null,
        };

      if (price.amountMinor !== null) {
        range.minAmountMinor =
          range.minAmountMinor === null
            ? price.amountMinor
            : Math.min(range.minAmountMinor, price.amountMinor);
        range.maxAmountMinor =
          range.maxAmountMinor === null
            ? price.amountMinor
            : Math.max(range.maxAmountMinor, price.amountMinor);
      }

      ranges.set(price.currencyCode, range);
    }
  }

  return [...ranges.values()].sort((left, right) =>
    left.currencyCode.localeCompare(right.currencyCode)
  );
}

function mapScopes(
  product: Catalog.CatalogProductSnapshot
): Listing.ListingScopeMembershipSnapshot[] {
  const primaryCategoryId = product.primaryCategory?.id ?? null;

  const categories: Listing.ListingScopeMembershipSnapshot[] = product.categories
    .map((category) => ({
      scopeType: "category" as const,
      categoryId: category.id,
      primary: category.primary ?? category.id === primaryCategoryId,
      manualRank: category.manualRank ?? null,
    }))
    .sort((left, right) => {
      if (left.primary !== right.primary) return left.primary ? -1 : 1;
      return left.categoryId.localeCompare(right.categoryId);
    });
  const collections: Listing.ListingScopeMembershipSnapshot[] =
    product.collections
      .map((membership) => ({
        scopeType: "collection" as const,
        collectionId: membership.id,
        manualRank: membership.manualRank,
      }))
      .sort((left, right) =>
        left.collectionId.localeCompare(right.collectionId)
      );
  return [...categories, ...collections];
}

function mapRuleFacts(
  product: Catalog.CatalogProductSnapshot
): Listing.ListingRuleFactsSnapshot {
  const productTerms: Listing.ListingProductRuleTermSnapshot[] = [
    ...product.tags.map((tag) => {
      if (!tag.id) {
        throw new Error(
          `Catalog tag snapshot has no id for product "${product.id}"`,
        );
      }
      return { kind: "tag" as const, tagId: tag.id };
    }),
    ...product.features.flatMap((feature) => {
      const sourceHandle = assertCanonicalHandle(feature.handle);
      return feature.values.map((value) => ({
        kind: "feature" as const,
        sourceHandle,
        valueHandle: assertCanonicalHandle(value.handle),
      }));
    }),
  ];
  const canonicalProductTerms = dedupeAndSort(productTerms);
  if (canonicalProductTerms.length > 4_096) {
    throw new FatalError(
      "Catalog listing rule fact limit exceeded",
      undefined,
      "CATALOG_LISTING_RULE_FACT_LIMIT_EXCEEDED",
    );
  }

  const variantTerms = product.variants
    .map((variant) => {
      const terms = dedupeAndSort(
        variant.options.flatMap((option) => {
          const sourceHandle = assertCanonicalHandle(option.handle);
          return option.values.map((value) => ({
            kind: "option" as const,
            sourceHandle,
            valueHandle: assertCanonicalHandle(value.handle),
          }));
        })
      );
      if (terms.length > 256) {
        throw new FatalError(
          "Catalog listing rule fact limit exceeded",
          undefined,
          "CATALOG_LISTING_RULE_FACT_LIMIT_EXCEEDED",
        );
      }
      return { variantId: variant.id, terms };
    })
    .sort((left, right) => left.variantId.localeCompare(right.variantId));
  const totalFacts =
    canonicalProductTerms.length +
    variantTerms.reduce((total, variant) => total + variant.terms.length, 0);
  if (totalFacts > 16_384) {
    throw new FatalError(
      "Catalog listing rule fact limit exceeded",
      undefined,
      "CATALOG_LISTING_RULE_FACT_LIMIT_EXCEEDED",
    );
  }
  return { productTerms: canonicalProductTerms, variantTerms };
}

function assertCanonicalHandle(value: string): string {
  const canonical = normalizeCollectionRuleHandleV1(value);
  if (canonical !== value) {
    throw new Error(`Persisted rule handle "${value}" is not canonical`);
  }
  return canonical;
}

function dedupeAndSort<T>(values: readonly T[]): T[] {
  return [
    ...new Map(values.map((value) => [JSON.stringify(value), value])).entries(),
  ]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);
}

function mapProductFacets(
  product: Catalog.CatalogProductSnapshot
): Listing.ListingFacetSelectionSnapshot[] {
  return [
    ...product.tags.map((tag) => ({
      scope: "product" as const,
      facet: {
        type: "tag" as const,
        handle: "tags",
      },
      values: [
        {
          handle: tag.handle,
          ...(tag.id ? { id: tag.id } : {}),
        },
      ],
    })),
    ...product.features.map((feature) => ({
      scope: "product" as const,
      facet: {
        type: "feature" as const,
        handle: feature.handle,
        ...(feature.id ? { id: feature.id } : {}),
      },
      values: feature.values.map((value) => ({
        handle: value.handle,
        ...(value.id ? { id: value.id } : {}),
      })),
    })),
  ].sort(compareFacetSelections);
}

function mapVariant(
  variant: Catalog.CatalogProductVariantSnapshot
): Listing.ListingVariantSnapshot {
  return {
    id: variant.id,
    handle: variant.handle,
    status: "active",
    availability: {
      availableForSale: variant.availability.availableForSale,
      totalQuantity: variant.availability.totalQuantity ?? null,
    },
    prices: variant.prices
      .map((price) => ({
        currencyCode: price.currencyCode,
        amountMinor: price.amountMinor,
      }))
      .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode)),
    facets: variant.options
      .map((option) => ({
        scope: "variant" as const,
        facet: {
          type: "option" as const,
          handle: option.handle,
          ...(option.id ? { id: option.id } : {}),
        },
        values: option.values.map((value) => ({
          handle: value.handle,
          ...(value.id ? { id: value.id } : {}),
        })),
      }))
      .sort(compareFacetSelections),
  };
}

function mapSearchContent(
  product: Catalog.CatalogProductSnapshot,
  locales: readonly string[]
): Listing.ListingSearchContentSnapshot {
  const productTitles = new Map(
    product.content.map((content) => [content.locale, content.title])
  );
  const localeSnapshots = [...new Set(locales)]
    .sort((left, right) => left.localeCompare(right))
    .map((locale) => ({
      locale,
      productTitle: productTitles.has(locale)
        ? { elementId: product.id, value: productTitles.get(locale)! }
        : null,
      variantTitles: product.variants
        .flatMap((variant) =>
          variant.content
            .filter((content) => content.locale === locale)
            .map((content) => ({
              elementId: variant.id,
              value: content.title,
            }))
        )
        .sort(compareSearchValues),
      categoryNames: product.categories
        .flatMap((category) =>
          category.content
            .filter((content) => content.locale === locale)
            .map((content) => ({
              elementId: category.id,
              value: content.name,
            }))
        )
        .sort(compareSearchValues),
    }));

  return {
    locales: localeSnapshots,
    vendor: product.vendor
      ? { elementId: product.vendor.id, value: product.vendor.name }
      : null,
    skus: product.variants
      .flatMap((variant) => {
        const sku = variant.inventoryItem?.sku;
        return sku ? [{ elementId: variant.id, value: sku }] : [];
      })
      .sort(compareSearchValues),
  };
}

function compareSearchValues(
  left: Listing.ListingSearchTextValueSnapshot,
  right: Listing.ListingSearchTextValueSnapshot
): number {
  return left.elementId.localeCompare(right.elementId) || left.value.localeCompare(right.value);
}

function compareFacetSelections(
  left: Listing.ListingFacetSelectionSnapshot,
  right: Listing.ListingFacetSelectionSnapshot
): number {
  return (
    left.scope.localeCompare(right.scope) ||
    left.facet.type.localeCompare(right.facet.type) ||
    left.facet.handle.localeCompare(right.facet.handle)
  );
}
