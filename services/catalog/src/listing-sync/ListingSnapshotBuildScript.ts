import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { BaseScript } from "../kernel/BaseScript.js";
import type { Listing } from "@shopana/broker-types";
import {
  category,
  collection,
  collectionItem,
  facet,
  facetSource,
  facetValue,
  inventoryItem,
  product,
  productCategory,
  productFeature,
  productFeatureValue,
  productOption,
  productOptionValue,
  productOptionVariantLink,
  productPriceRange,
  productSeo,
  productTag,
  productTranslation,
  tag,
  variant,
  variantPricesCurrent,
  warehouseStock,
} from "../repositories/models/index.js";

export interface ListingSnapshotBuildParams {
  productIds: string[];
  sourceRevisionsByProductId?: Record<string, number>;
}

export interface ListingSnapshotBuildResult {
  snapshots: Listing.ListingSellableItemSnapshot[];
  missingProductIds: string[];
}

export interface ListingProductIdsByVariantIdsParams {
  variantIds: string[];
}

export interface ListingProductIdsByVariantIdsResult {
  productIdsByVariantId: Record<string, string>;
}

type ProductRow = typeof product.$inferSelect;
type VariantRow = typeof variant.$inferSelect;
type FacetType = "TAG" | "FEATURE" | "OPTION";
type SnapshotFacetType = "tag" | "feature" | "option";

type FacetSourceRow = {
  facetId: string;
  facetSlug: string;
  facetType: FacetType;
  sourceHandle: string;
};

type EffectiveFacetValue = {
  id: string;
  handle: string;
};

type VariantAvailability = {
  availableForSale: boolean;
  totalQuantity: number | null;
};

export class ListingSnapshotBuildScript extends BaseScript<
  ListingSnapshotBuildParams,
  ListingSnapshotBuildResult
> {
  protected async execute(
    params: ListingSnapshotBuildParams
  ): Promise<ListingSnapshotBuildResult> {
    const productIds = unique(params.productIds);
    if (productIds.length === 0) {
      return { snapshots: [], missingProductIds: [] };
    }

    const products = await this.loadProducts(productIds);
    const foundProductIds = new Set(products.map((item) => item.id));
    const missingProductIds = productIds.filter((id) => !foundProductIds.has(id));
    if (products.length === 0) {
      return { snapshots: [], missingProductIds };
    }

    const foundIds = products.map((item) => item.id);
    const [
      variants,
      translations,
      seoRows,
      priceRanges,
      categoryLinks,
      collectionLinks,
      tags,
      featureValues,
      optionLinks,
    ] = await Promise.all([
      this.loadVariants(foundIds),
      this.loadProductTranslations(foundIds),
      this.loadProductSeo(foundIds),
      this.loadProductPriceRanges(foundIds),
      this.loadCategoryLinks(foundIds),
      this.loadCollectionLinks(foundIds),
      this.loadTagsForProducts(foundIds),
      this.loadFeatureValues(foundIds),
      this.loadOptionLinks(foundIds),
    ]);

    const variantIds = variants.map((item) => item.id);
    const [variantPrices, stockRows, inventoryItems] = await Promise.all([
      this.loadVariantPrices(variantIds),
      this.loadVariantStock(variantIds),
      this.loadInventoryItems(variantIds),
    ]);

    const facetContext = await this.buildFacetContext({
      tags,
      featureValues,
      optionLinks,
    });

    const variantsByProductId = groupBy(variants, (item) => item.productId);
    const translationsByProductId = groupBy(translations, (item) => item.productId);
    const seoByProductLocale = new Map(
      seoRows.map((item) => [`${item.productId}\0${item.locale}`, item])
    );
    const priceRangesByProductId = groupBy(priceRanges, (item) => item.productId);
    const categoriesByProductId = groupBy(categoryLinks, (item) => item.productId);
    const collectionsByProductId = groupBy(collectionLinks, (item) => item.productId);
    const pricesByVariantId = groupBy(variantPrices, (item) => item.variantId);
    const stockByVariantId = groupBy(stockRows, (item) => item.variantId);
    const inventoryItemByVariantId = new Map(
      inventoryItems.map((item) => [item.variantId, item])
    );

    const snapshots = products.map((item) => {
      const itemVariants = variantsByProductId.get(item.id) ?? [];
      const variantSnapshots = itemVariants.map((variantRow) =>
        this.buildVariantSnapshot({
          variant: variantRow,
          sourceRevision:
            params.sourceRevisionsByProductId?.[item.id] ?? item.revision,
          prices: pricesByVariantId.get(variantRow.id) ?? [],
          stockRows: stockByVariantId.get(variantRow.id) ?? [],
          inventoryItem: inventoryItemByVariantId.get(variantRow.id) ?? null,
          facetContext,
        })
      );

      const productAvailability = buildProductAvailability(variantSnapshots);
      const sourceRevision =
        params.sourceRevisionsByProductId?.[item.id] ?? item.revision;

      return {
        entityType: item.kind === "BUNDLE" ? "bundle" : "product",
        id: item.id,
        sourceRevision,
        sourceUpdatedAt: item.updatedAt,
        status: item.publishedAt ? "published" : "draft",
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        content: this.buildContentSnapshot({
          product: item,
          translations: translationsByProductId.get(item.id) ?? [],
          seoByProductLocale,
        }),
        availability: productAvailability,
        priceRanges: (priceRangesByProductId.get(item.id) ?? [])
          .map((price) => ({
            currencyCode: price.currency,
            minAmountMinor: price.minAmountMinor,
            maxAmountMinor: price.maxAmountMinor,
          }))
          .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode)),
        vendorId: item.vendorId,
        scopes: [
          ...(categoriesByProductId.get(item.id) ?? []).map((link) => ({
            scopeType: "category" as const,
            categoryId: link.categoryId,
            primary: link.isPrimary,
            manualRank: link.lexoRank,
          })),
          ...(collectionsByProductId.get(item.id) ?? []).map((link) => ({
            scopeType: "collection" as const,
            collectionId: link.collectionId,
            manualRank: link.lexoRank,
          })),
        ],
        productFacets: this.buildProductFacetSelections({
          productId: item.id,
          facetContext,
        }),
        variants: variantSnapshots,
      } satisfies Listing.ListingSellableItemSnapshot;
    });

    return { snapshots, missingProductIds };
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async loadProducts(productIds: readonly string[]): Promise<ProductRow[]> {
    return this.repository.db
      .select()
      .from(product)
      .where(
        and(
          eq(product.projectId, this.context.store.id),
          inArray(product.id, [...productIds]),
          isNull(product.deletedAt)
        )
      )
      .orderBy(asc(product.id));
  }

  private async loadVariants(productIds: readonly string[]): Promise<VariantRow[]> {
    return this.repository.db
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.context.store.id),
          inArray(variant.productId, [...productIds]),
          isNull(variant.deletedAt)
        )
      )
      .orderBy(asc(variant.productId), asc(variant.id));
  }

  private async loadProductTranslations(productIds: readonly string[]) {
    return this.repository.db
      .select()
      .from(productTranslation)
      .where(
        and(
          eq(productTranslation.projectId, this.context.store.id),
          inArray(productTranslation.productId, [...productIds])
        )
      );
  }

  private async loadProductSeo(productIds: readonly string[]) {
    return this.repository.db
      .select()
      .from(productSeo)
      .where(
        and(
          eq(productSeo.projectId, this.context.store.id),
          inArray(productSeo.productId, [...productIds])
        )
      );
  }

  private async loadProductPriceRanges(productIds: readonly string[]) {
    return this.repository.db
      .select()
      .from(productPriceRange)
      .where(
        and(
          eq(productPriceRange.projectId, this.context.store.id),
          inArray(productPriceRange.productId, [...productIds])
        )
      );
  }

  private async loadCategoryLinks(productIds: readonly string[]) {
    return this.repository.db
      .select({
        productId: productCategory.productId,
        categoryId: productCategory.categoryId,
        isPrimary: productCategory.isPrimary,
        lexoRank: productCategory.lexoRank,
      })
      .from(productCategory)
      .innerJoin(
        category,
        and(
          eq(category.projectId, productCategory.projectId),
          eq(category.id, productCategory.categoryId),
          isNull(category.deletedAt)
        )
      )
      .where(
        and(
          eq(productCategory.projectId, this.context.store.id),
          inArray(productCategory.productId, [...productIds])
        )
      )
      .orderBy(asc(productCategory.productId), asc(productCategory.lexoRank));
  }

  private async loadCollectionLinks(productIds: readonly string[]) {
    return this.repository.db
      .select({
        productId: collectionItem.productId,
        collectionId: collectionItem.collectionId,
        lexoRank: collectionItem.lexoRank,
      })
      .from(collectionItem)
      .innerJoin(
        collection,
        and(
          eq(collection.projectId, collectionItem.projectId),
          eq(collection.id, collectionItem.collectionId),
          isNull(collection.deletedAt)
        )
      )
      .where(
        and(
          eq(collectionItem.projectId, this.context.store.id),
          inArray(collectionItem.productId, [...productIds])
        )
      )
      .orderBy(asc(collectionItem.productId), asc(collectionItem.lexoRank));
  }

  private async loadTagsForProducts(productIds: readonly string[]) {
    return this.repository.db
      .select({
        productId: productTag.productId,
        tagId: tag.id,
        handle: tag.handle,
      })
      .from(productTag)
      .innerJoin(
        tag,
        and(eq(tag.projectId, productTag.projectId), eq(tag.id, productTag.tagId))
      )
      .where(
        and(
          eq(productTag.projectId, this.context.store.id),
          inArray(productTag.productId, [...productIds])
        )
      );
  }

  private async loadFeatureValues(productIds: readonly string[]) {
    return this.repository.db
      .select({
        productId: productFeature.productId,
        featureId: productFeature.id,
        featureSlug: productFeature.slug,
        featureIsGroup: productFeature.isGroup,
        valueId: productFeatureValue.id,
        valueSlug: productFeatureValue.slug,
        valueIndex: productFeatureValue.index,
      })
      .from(productFeature)
      .innerJoin(
        productFeatureValue,
        and(
          eq(productFeatureValue.projectId, productFeature.projectId),
          eq(productFeatureValue.featureId, productFeature.id)
        )
      )
      .where(
        and(
          eq(productFeature.projectId, this.context.store.id),
          inArray(productFeature.productId, [...productIds])
        )
      )
      .orderBy(
        asc(productFeature.productId),
        productFeature.index,
        asc(productFeatureValue.index)
      );
  }

  private async loadOptionLinks(productIds: readonly string[]) {
    return this.repository.db
      .select({
        productId: productOption.productId,
        variantId: productOptionVariantLink.variantId,
        optionId: productOption.id,
        optionSlug: productOption.slug,
        valueId: productOptionValue.id,
        valueSlug: productOptionValue.slug,
      })
      .from(productOptionVariantLink)
      .innerJoin(
        productOption,
        and(
          eq(productOption.projectId, productOptionVariantLink.projectId),
          eq(productOption.id, productOptionVariantLink.optionId)
        )
      )
      .innerJoin(
        productOptionValue,
        and(
          eq(productOptionValue.projectId, productOptionVariantLink.projectId),
          eq(productOptionValue.id, productOptionVariantLink.optionValueId)
        )
      )
      .where(
        and(
          eq(productOptionVariantLink.projectId, this.context.store.id),
          inArray(productOption.productId, [...productIds])
        )
      );
  }

  private async loadVariantPrices(variantIds: readonly string[]) {
    if (variantIds.length === 0) return [];

    return this.repository.db
      .select({
        variantId: variantPricesCurrent.variantId,
        currency: variantPricesCurrent.currency,
        amountMinor: variantPricesCurrent.amountMinor,
      })
      .from(variantPricesCurrent)
      .where(
        and(
          eq(variantPricesCurrent.projectId, this.context.store.id),
          inArray(variantPricesCurrent.variantId, [...variantIds])
        )
      )
      .orderBy(asc(variantPricesCurrent.variantId), asc(variantPricesCurrent.currency));
  }

  private async loadVariantStock(variantIds: readonly string[]) {
    if (variantIds.length === 0) return [];

    return this.repository.db
      .select()
      .from(warehouseStock)
      .where(
        and(
          eq(warehouseStock.projectId, this.context.store.id),
          inArray(warehouseStock.variantId, [...variantIds])
        )
      );
  }

  private async loadInventoryItems(variantIds: readonly string[]) {
    if (variantIds.length === 0) return [];

    return this.repository.db
      .select()
      .from(inventoryItem)
      .where(
        and(
          eq(inventoryItem.projectId, this.context.store.id),
          inArray(inventoryItem.variantId, [...variantIds])
        )
      );
  }

  private buildContentSnapshot(input: {
    product: ProductRow;
    translations: Array<typeof productTranslation.$inferSelect>;
    seoByProductLocale: ReadonlyMap<string, typeof productSeo.$inferSelect>;
  }): Listing.ListingContentSnapshot {
    const defaultLocale = this.context.store.defaultLocale;
    const translations: Record<string, Listing.ListingLocalizedContentSnapshot> = {};

    for (const translation of input.translations) {
      const seo = input.seoByProductLocale.get(
        `${translation.productId}\0${translation.locale}`
      );
      translations[translation.locale] = {
        title: translation.name,
        subtitle: translation.excerptText,
        plainDescription: translation.descriptionText,
        seoTitle: seo?.seoTitle ?? null,
        seoDescription: seo?.seoDescription ?? null,
      };
    }

    if (!translations[defaultLocale]) {
      const fallback = Object.values(translations)[0];
      translations[defaultLocale] = fallback ?? {
        title: input.product.handle ?? input.product.id,
        subtitle: null,
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

  private buildVariantSnapshot(input: {
    variant: VariantRow;
    sourceRevision: number;
    prices: Array<{ currency: string; amountMinor: number }>;
    stockRows: Array<typeof warehouseStock.$inferSelect>;
    inventoryItem: typeof inventoryItem.$inferSelect | null;
    facetContext: FacetContext;
  }): Listing.ListingVariantSnapshot {
    const availability = buildVariantAvailability(
      input.stockRows,
      input.inventoryItem
    );

    return {
      id: input.variant.id,
      sourceRevision: input.sourceRevision,
      status: "active",
      availability,
      prices: input.prices
        .map((price) => ({
          currencyCode: price.currency,
          amountMinor: price.amountMinor,
        }))
        .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode)),
      facets: this.buildVariantFacetSelections({
        variantId: input.variant.id,
        facetContext: input.facetContext,
      }),
    };
  }

  private async buildFacetContext(input: {
    tags: Array<{ productId: string; tagId: string; handle: string }>;
    featureValues: Array<{
      productId: string;
      featureId: string;
      featureSlug: string;
      featureIsGroup: boolean;
      valueId: string;
      valueSlug: string;
      valueIndex: number;
    }>;
    optionLinks: Array<{
      productId: string;
      variantId: string;
      optionId: string;
      optionSlug: string;
      valueId: string | null;
      valueSlug: string | null;
    }>;
  }): Promise<FacetContext> {
    const facetSources = await this.loadFacetSources();
    const sourceValuesByFacetSource = await this.loadEffectiveFacetValues(
      facetSources
    );

    const productSourceValues = new Map<string, Map<string, Set<string>>>();
    const variantSourceValues = new Map<string, Map<string, Set<string>>>();

    for (const tagRow of input.tags) {
      addSourceValue(productSourceValues, tagRow.productId, "TAG", "tags", tagRow.handle);
    }

    for (const value of input.featureValues) {
      if (value.featureIsGroup) continue;
      addSourceValue(
        productSourceValues,
        value.productId,
        "FEATURE",
        value.featureSlug,
        value.valueSlug
      );
    }

    for (const link of input.optionLinks) {
      if (!link.valueSlug) continue;
      addSourceValue(
        variantSourceValues,
        link.variantId,
        "OPTION",
        link.optionSlug,
        link.valueSlug
      );
    }

    return {
      facetSources,
      sourceValuesByFacetSource,
      productSourceValues,
      variantSourceValues,
    };
  }

  private async loadFacetSources(): Promise<FacetSourceRow[]> {
    const rows = await this.repository.db
      .select({
        facetId: facet.id,
        facetSlug: facet.slug,
        facetType: facet.facetType,
        sourceHandle: facetSource.handle,
      })
      .from(facet)
      .innerJoin(
        facetSource,
        and(eq(facetSource.projectId, facet.projectId), eq(facetSource.facetId, facet.id))
      )
      .where(
        and(
          eq(facet.projectId, this.context.store.id),
          eq(facetSource.referenceStatus, "VALID"),
          inArray(facet.facetType, ["TAG", "FEATURE", "OPTION"])
        )
      )
      .orderBy(asc(facet.lexoRank), asc(facet.id));

    return rows.flatMap((row) => {
      const facetType = normalizeFacetType(row.facetType);
      return facetType
        ? [
            {
              facetId: row.facetId,
              facetSlug: row.facetSlug,
              facetType,
              sourceHandle: row.sourceHandle,
            },
          ]
        : [];
    });
  }

  private async loadEffectiveFacetValues(
    facetSources: readonly FacetSourceRow[]
  ): Promise<Map<string, EffectiveFacetValue>> {
    if (facetSources.length === 0) {
      return new Map();
    }

    const facetIds = unique(facetSources.map((item) => item.facetId));
    const sourceRows = await this.repository.db
      .select({
        id: facetValue.id,
        facetId: facetValue.facetId,
        parentId: facetValue.parentId,
        handle: facetValue.handle,
        enabled: facetValue.enabled,
        referenceStatus: facetValue.referenceStatus,
      })
      .from(facetValue)
      .where(
        and(
          eq(facetValue.projectId, this.context.store.id),
          inArray(facetValue.facetId, facetIds),
          eq(facetValue.kind, "source")
        )
      );

    const parentIds = unique(sourceRows.flatMap((row) => (row.parentId ? [row.parentId] : [])));
    const parentRows = parentIds.length
      ? await this.repository.db
          .select({
            id: facetValue.id,
            handle: facetValue.handle,
            enabled: facetValue.enabled,
            referenceStatus: facetValue.referenceStatus,
          })
          .from(facetValue)
          .where(
            and(
              eq(facetValue.projectId, this.context.store.id),
              inArray(facetValue.id, parentIds),
              eq(facetValue.kind, "display"),
              isNull(facetValue.parentId)
            )
          )
      : [];

    const parentById = new Map(parentRows.map((row) => [row.id, row]));
    const result = new Map<string, EffectiveFacetValue>();

    for (const row of sourceRows) {
      if (!row.enabled || row.referenceStatus !== "VALID") {
        continue;
      }

      const parent = row.parentId ? parentById.get(row.parentId) : null;
      const effective = parent ?? row;
      if (!effective.enabled || effective.referenceStatus !== "VALID") {
        continue;
      }

      result.set(`${row.facetId}\0${row.handle}`, {
        id: effective.id,
        handle: effective.handle,
      });
    }

    return result;
  }

  private buildProductFacetSelections(input: {
    productId: string;
    facetContext: FacetContext;
  }): Listing.ListingFacetSelectionSnapshot[] {
    return this.buildFacetSelections({
      scope: "product",
      ownerId: input.productId,
      allowedTypes: ["TAG", "FEATURE"],
      sourceValuesByOwner: input.facetContext.productSourceValues,
      facetContext: input.facetContext,
    });
  }

  private buildVariantFacetSelections(input: {
    variantId: string;
    facetContext: FacetContext;
  }): Listing.ListingFacetSelectionSnapshot[] {
    return this.buildFacetSelections({
      scope: "variant",
      ownerId: input.variantId,
      allowedTypes: ["OPTION"],
      sourceValuesByOwner: input.facetContext.variantSourceValues,
      facetContext: input.facetContext,
    });
  }

  private buildFacetSelections(input: {
    scope: "product" | "variant";
    ownerId: string;
    allowedTypes: FacetType[];
    sourceValuesByOwner: ReadonlyMap<string, Map<string, Set<string>>>;
    facetContext: FacetContext;
  }): Listing.ListingFacetSelectionSnapshot[] {
    const sourceValuesByKey = input.sourceValuesByOwner.get(input.ownerId);
    if (!sourceValuesByKey) {
      return [];
    }

    return input.facetContext.facetSources
      .filter((source) => input.allowedTypes.includes(source.facetType))
      .flatMap((source) => {
        const sourceKey = buildSourceKey(source.facetType, source.sourceHandle);
        const sourceValues = sourceValuesByKey.get(sourceKey);
        if (!sourceValues || sourceValues.size === 0) {
          return [];
        }

        const values = unique([...sourceValues])
          .flatMap((sourceValueHandle) => {
            const value = input.facetContext.sourceValuesByFacetSource.get(
              `${source.facetId}\0${sourceValueHandle}`
            );
            return value ? [{ id: value.id, handle: value.handle }] : [];
          })
          .sort((left, right) => left.handle.localeCompare(right.handle));

        if (values.length === 0) {
          return [];
        }

        return [
          {
            scope: input.scope,
            facet: {
              type: toSnapshotFacetType(source.facetType),
              handle: source.facetSlug,
              id: source.facetId,
            },
            values,
          },
        ];
      });
  }
}

export class ListingProductIdsByVariantIdsScript extends BaseScript<
  ListingProductIdsByVariantIdsParams,
  ListingProductIdsByVariantIdsResult
> {
  protected async execute(
    params: ListingProductIdsByVariantIdsParams
  ): Promise<ListingProductIdsByVariantIdsResult> {
    const variantIds = unique(params.variantIds);
    if (variantIds.length === 0) {
      return { productIdsByVariantId: {} };
    }

    const rows = await this.repository.db
      .select({
        variantId: variant.id,
        productId: variant.productId,
      })
      .from(variant)
      .innerJoin(
        product,
        and(
          eq(product.projectId, variant.projectId),
          eq(product.id, variant.productId),
          isNull(product.deletedAt)
        )
      )
      .where(
        and(
          eq(variant.projectId, this.context.store.id),
          inArray(variant.id, variantIds),
          isNull(variant.deletedAt)
        )
      );

    return {
      productIdsByVariantId: Object.fromEntries(
        rows.map((row) => [row.variantId, row.productId])
      ),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }
}

interface FacetContext {
  facetSources: FacetSourceRow[];
  sourceValuesByFacetSource: Map<string, EffectiveFacetValue>;
  productSourceValues: Map<string, Map<string, Set<string>>>;
  variantSourceValues: Map<string, Map<string, Set<string>>>;
}

function buildVariantAvailability(
  stockRows: Array<typeof warehouseStock.$inferSelect>,
  item: typeof inventoryItem.$inferSelect | null
): VariantAvailability {
  const trackInventory = item?.trackInventory ?? false;
  const continueSellingWhenOutOfStock =
    item?.continueSellingWhenOutOfStock ?? false;

  if (!trackInventory || continueSellingWhenOutOfStock) {
    return { availableForSale: true, totalQuantity: null };
  }

  const totalQuantity = stockRows.reduce((sum, row) => {
    const available =
      row.quantityOnHand - row.reservedQty - row.unavailableQty;
    return sum + Math.max(available, 0);
  }, 0);

  return {
    availableForSale: totalQuantity > 0,
    totalQuantity,
  };
}

function buildProductAvailability(
  variants: readonly Listing.ListingVariantSnapshot[]
): Listing.ListingAvailabilitySnapshot {
  const numericQuantities = variants.flatMap((item) =>
    item.availability.totalQuantity == null ? [] : [item.availability.totalQuantity]
  );

  return {
    availableForSale: variants.some((item) => item.availability.availableForSale),
    totalQuantity:
      numericQuantities.length > 0
        ? numericQuantities.reduce((sum, value) => sum + value, 0)
        : null,
  };
}

function addSourceValue(
  target: Map<string, Map<string, Set<string>>>,
  ownerId: string,
  facetType: FacetType,
  sourceHandle: string,
  valueHandle: string
): void {
  const byOwner = target.get(ownerId) ?? new Map<string, Set<string>>();
  const sourceKey = buildSourceKey(facetType, sourceHandle);
  const values = byOwner.get(sourceKey) ?? new Set<string>();
  values.add(valueHandle);
  byOwner.set(sourceKey, values);
  target.set(ownerId, byOwner);
}

function buildSourceKey(facetType: FacetType, sourceHandle: string): string {
  return `${facetType}\0${sourceHandle}`;
}

function normalizeFacetType(value: string): FacetType | null {
  const normalized = value.toUpperCase();
  return normalized === "TAG" ||
    normalized === "FEATURE" ||
    normalized === "OPTION"
    ? normalized
    : null;
}

function toSnapshotFacetType(value: FacetType): SnapshotFacetType {
  return value.toLowerCase() as SnapshotFacetType;
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function groupBy<T, K>(items: readonly T[], keyOf: (item: T) => K): Map<K, T[]> {
  const result = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = result.get(key) ?? [];
    group.push(item);
    result.set(key, group);
  }
  return result;
}
