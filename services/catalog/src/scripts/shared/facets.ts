import type { Repository } from "../../repositories/Repository.js";
import type { VariantSearchIndex } from "../../repositories/models/index.js";

type FacetKind = "tag" | "feature" | "option" | "price" | "in_stock";

export interface ListingBaseProduct {
  productId: string;
  tagHandles: string[];
  featureSlugs: string[];
}

export interface ListingFacetSelection {
  facetId: string;
  facetType: string;
  sourceHandles: string[];
}

export interface BuildListingFacetsParams {
  repository: Repository;
  baseProducts: ListingBaseProduct[];
  variantsByProduct: Map<string, VariantSearchIndex[]>;
  currency: string;
  selectedFacetFiltersById: Map<string, ListingFacetSelection>;
  priceMinMinor?: number;
  priceMaxMinor?: number;
  inStock?: boolean;
}

interface DiscreteFacetValueMeta {
  id: string;
  slug: string;
  sortIndex: number;
  label: string | null;
  sourceHandles: string[];
  swatchId: string | null;
}

interface BuiltFacet {
  groupId: string | null;
  facetType: string;
  slug: string;
  label: string;
  uiType: string;
  selectionMode: string;
  values: Array<{
    slug: string;
    label: string | null;
    count: number;
    swatch: Record<string, unknown> | null;
  }>;
  totalCount: number;
}

interface ProductFacetSelection {
  facetType: "tag" | "feature";
  sourceHandles: string[];
}

interface VariantFacetSelection {
  sourceHandles: string[];
}

interface ProductPassOptions {
  ignoreFacetId?: string;
  ignoreAllSelections?: boolean;
}

interface VariantPassOptions {
  ignoreFacetId?: string;
  ignorePrice?: boolean;
  ignoreInStock?: boolean;
  requireValueHandles?: string[];
  ignoreAllSelections?: boolean;
}

function normalizeFacetType(value: string): FacetKind | null {
  switch (value.toLowerCase()) {
    case "tag":
    case "feature":
    case "option":
    case "price":
    case "in_stock":
      return value.toLowerCase() as FacetKind;
    default:
      return null;
  }
}

function mapFacetTypeEnum(value: FacetKind): string {
  return value === "in_stock" ? "IN_STOCK" : value.toUpperCase();
}

function mapUiTypeEnum(value: string): string {
  return value.toUpperCase();
}

function mapSelectionModeEnum(value: string): string {
  return value.toUpperCase();
}

function intersects(left: readonly string[], right: readonly string[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const values = new Set(left);
  return right.some((item) => values.has(item));
}

export async function buildListingFacets(
  params: BuildListingFacetsParams
): Promise<Record<string, unknown> | null> {
  const facets = await params.repository.facet.findAll();
  if (facets.length === 0) {
    return null;
  }

  const facetIds = facets.map((facet) => facet.id);
  const facetTranslations = await params.repository.facet.getTranslationsByFacetIds(facetIds);
  const facetLabelById = new Map(
    facetTranslations.map((translation) => [translation.facetId, translation.label])
  );

  const groupRows = await params.repository.facetGroup.findAll();
  const groupTranslations = await params.repository.facetGroup.getTranslationsByGroupIds(
    groupRows.map((group) => group.id)
  );
  const groupNameById = new Map(
    groupTranslations.map((translation) => [translation.groupId, translation.name])
  );

  const productSelections = new Map<string, ProductFacetSelection>();
  const optionSelections = new Map<string, VariantFacetSelection>();
  for (const [facetId, selection] of params.selectedFacetFiltersById.entries()) {
    const facetType = normalizeFacetType(selection.facetType);
    if (!facetType || selection.sourceHandles.length === 0) continue;
    if (facetType === "tag" || facetType === "feature") {
      productSelections.set(facetId, {
        facetType,
        sourceHandles: selection.sourceHandles,
      });
    } else if (facetType === "option") {
      optionSelections.set(facetId, { sourceHandles: selection.sourceHandles });
    }
  }

  const discreteFacetRows = facets.filter((facet) => {
    const type = normalizeFacetType(facet.facetType);
    return type === "tag" || type === "feature" || type === "option";
  });

  const discreteValuesByFacetId = new Map<string, DiscreteFacetValueMeta[]>();
  const allValueIds: string[] = [];
  for (const facet of discreteFacetRows) {
    const values = (await params.repository.facetValue.findByFacetId(facet.id))
      .filter((value) => value.enabled)
      .map((value) => ({
        id: value.id,
        slug: value.slug,
        sortIndex: value.sortIndex,
        label: null as string | null,
        sourceHandles: [] as string[],
        swatchId: value.swatchId,
      }));
    discreteValuesByFacetId.set(facet.id, values);
    allValueIds.push(...values.map((value) => value.id));
  }

  const swatchIdSet = new Set<string>();
  for (const values of discreteValuesByFacetId.values()) {
    for (const value of values) {
      if (value.swatchId) {
        swatchIdSet.add(value.swatchId);
      }
    }
  }
  const swatches = swatchIdSet.size
    ? await params.repository.facetSwatch.getByIds([...swatchIdSet])
    : [];
  const swatchById = new Map(swatches.map((item) => [item.id, item]));

  const valueLabelById = new Map<string, string>();
  if (allValueIds.length > 0) {
    const translations = await params.repository.facetValue.getTranslationsByValueIds(
      allValueIds
    );
    for (const translation of translations) {
      valueLabelById.set(translation.facetValueId, translation.label);
    }

    const sourceRows = await params.repository.facetValue.getSourceHandlesByValueIds(
      allValueIds
    );
    const sourceHandlesByValueId = new Map<string, Set<string>>();
    for (const row of sourceRows) {
      const list = sourceHandlesByValueId.get(row.facetValueId) ?? new Set<string>();
      list.add(row.sourceHandle);
      sourceHandlesByValueId.set(row.facetValueId, list);
    }

    for (const values of discreteValuesByFacetId.values()) {
      for (const value of values) {
        value.label = valueLabelById.get(value.id) ?? null;
        value.sourceHandles = [
          ...(sourceHandlesByValueId.get(value.id) ?? new Set<string>()),
        ];
      }
    }
  }

  const passesProductSelections = (
    product: ListingBaseProduct,
    options: ProductPassOptions
  ): boolean => {
    if (options.ignoreAllSelections) {
      return true;
    }

    for (const [facetId, selection] of productSelections.entries()) {
      if (options.ignoreFacetId && facetId === options.ignoreFacetId) {
        continue;
      }

      if (selection.facetType === "tag") {
        if (!intersects(product.tagHandles, selection.sourceHandles)) return false;
      } else if (!intersects(product.featureSlugs, selection.sourceHandles)) {
        return false;
      }
    }

    return true;
  };

  const hasVariantConstraint = (options: VariantPassOptions): boolean => {
    if (options.requireValueHandles && options.requireValueHandles.length > 0) {
      return true;
    }

    if (options.ignoreAllSelections) {
      return false;
    }

    for (const [facetId, selection] of optionSelections.entries()) {
      if (options.ignoreFacetId && facetId === options.ignoreFacetId) continue;
      if (selection.sourceHandles.length > 0) return true;
    }

    if (!options.ignorePrice) {
      if (params.priceMinMinor !== undefined || params.priceMaxMinor !== undefined) {
        return true;
      }
    }

    if (!options.ignoreInStock && params.inStock !== undefined) {
      return true;
    }

    return false;
  };

  const variantPasses = (
    variant: VariantSearchIndex,
    options: VariantPassOptions
  ): boolean => {
    if (variant.priceCurrency !== params.currency) {
      return false;
    }

    if (!options.ignoreAllSelections) {
      for (const [facetId, selection] of optionSelections.entries()) {
        if (options.ignoreFacetId && facetId === options.ignoreFacetId) {
          continue;
        }
        if (!intersects(variant.optionSlugs, selection.sourceHandles)) {
          return false;
        }
      }
    }

    if (options.requireValueHandles && options.requireValueHandles.length > 0) {
      if (!intersects(variant.optionSlugs, options.requireValueHandles)) {
        return false;
      }
    }

    if (!options.ignoreAllSelections && !options.ignorePrice) {
      if (
        params.priceMinMinor !== undefined &&
        (variant.priceMinor === null || variant.priceMinor < params.priceMinMinor)
      ) {
        return false;
      }
      if (
        params.priceMaxMinor !== undefined &&
        (variant.priceMinor === null || variant.priceMinor > params.priceMaxMinor)
      ) {
        return false;
      }
    }

    if (!options.ignoreAllSelections && !options.ignoreInStock && params.inStock !== undefined) {
      if (variant.inStock !== params.inStock) {
        return false;
      }
    }

    return true;
  };

  const productPassesAllSelections = (
    product: ListingBaseProduct,
    productOptions: ProductPassOptions,
    variantOptions: VariantPassOptions
  ): boolean => {
    if (!passesProductSelections(product, productOptions)) {
      return false;
    }

    if (!hasVariantConstraint(variantOptions)) {
      return true;
    }

    const variants = params.variantsByProduct.get(product.productId) ?? [];
    return variants.some((variant) => variantPasses(variant, variantOptions));
  };

  const countDiscreteValue = (
    facetType: "tag" | "feature" | "option",
    facetId: string,
    valueSourceHandles: string[]
  ): number => {
    if (valueSourceHandles.length === 0) {
      return 0;
    }

    let count = 0;
    for (const product of params.baseProducts) {
      if (
        !productPassesAllSelections(
          product,
          { ignoreFacetId: facetId, ignoreAllSelections: false },
          { ignoreFacetId: facetId, ignoreAllSelections: false }
        )
      ) {
        continue;
      }

      if (facetType === "tag") {
        if (intersects(product.tagHandles, valueSourceHandles)) count += 1;
        continue;
      }

      if (facetType === "feature") {
        if (intersects(product.featureSlugs, valueSourceHandles)) count += 1;
        continue;
      }

      const variants = params.variantsByProduct.get(product.productId) ?? [];
      const matches = variants.some((variant) =>
        variantPasses(variant, {
          ignoreFacetId: facetId,
          requireValueHandles: valueSourceHandles,
        })
      );
      if (matches) {
        count += 1;
      }
    }

    return count;
  };

  const countDiscreteValueInBase = (
    facetType: "tag" | "feature" | "option",
    valueSourceHandles: string[]
  ): number => {
    if (valueSourceHandles.length === 0) return 0;

    let count = 0;
    for (const product of params.baseProducts) {
      if (facetType === "tag") {
        if (intersects(product.tagHandles, valueSourceHandles)) count += 1;
        continue;
      }
      if (facetType === "feature") {
        if (intersects(product.featureSlugs, valueSourceHandles)) count += 1;
        continue;
      }

      const variants = params.variantsByProduct.get(product.productId) ?? [];
      if (
        variants.some((variant) =>
          variantPasses(variant, {
            requireValueHandles: valueSourceHandles,
            ignoreAllSelections: true,
          })
        )
      ) {
        count += 1;
      }
    }

    return count;
  };

  const countFacetTotal = (
    facetType: "tag" | "feature" | "option",
    facetId: string,
    allSourceHandles: string[]
  ): number => {
    if (allSourceHandles.length === 0) return 0;

    let count = 0;
    for (const product of params.baseProducts) {
      if (
        !productPassesAllSelections(
          product,
          { ignoreFacetId: facetId, ignoreAllSelections: false },
          { ignoreFacetId: facetId, ignoreAllSelections: false }
        )
      ) {
        continue;
      }

      if (facetType === "tag") {
        if (intersects(product.tagHandles, allSourceHandles)) count += 1;
        continue;
      }

      if (facetType === "feature") {
        if (intersects(product.featureSlugs, allSourceHandles)) count += 1;
        continue;
      }

      const variants = params.variantsByProduct.get(product.productId) ?? [];
      if (
        variants.some((variant) =>
          variantPasses(variant, {
            ignoreFacetId: facetId,
            requireValueHandles: allSourceHandles,
          })
        )
      ) {
        count += 1;
      }
    }

    return count;
  };

  const computePriceRange = (
    ignorePrice: boolean,
    ignoreAllSelections: boolean
  ): { min: number; max: number } | null => {
    let min: number | null = null;
    let max: number | null = null;

    for (const product of params.baseProducts) {
      if (!passesProductSelections(product, { ignoreAllSelections })) {
        continue;
      }

      const variants = params.variantsByProduct.get(product.productId) ?? [];
      const matchingVariants = variants.filter((variant) =>
        variantPasses(variant, { ignorePrice, ignoreAllSelections })
      );

      if (matchingVariants.length === 0) continue;

      for (const variant of matchingVariants) {
        if (variant.priceMinor === null) continue;
        if (min === null || variant.priceMinor < min) min = variant.priceMinor;
        if (max === null || variant.priceMinor > max) max = variant.priceMinor;
      }
    }

    if (min === null || max === null) {
      return null;
    }

    return { min, max };
  };

  const countInStockProducts = (
    ignoreInStock: boolean,
    ignoreAllSelections: boolean
  ): number => {
    let count = 0;
    for (const product of params.baseProducts) {
      if (!passesProductSelections(product, { ignoreAllSelections })) {
        continue;
      }

      const variants = params.variantsByProduct.get(product.productId) ?? [];
      const hasInStockVariant = variants.some(
        (variant) =>
          variant.inStock &&
          variantPasses(variant, { ignoreInStock, ignoreAllSelections })
      );
      if (hasInStockVariant) {
        count += 1;
      }
    }
    return count;
  };

  const countProductsMatchingCurrentFiltersIgnoringPrice = (): number => {
    let count = 0;
    for (const product of params.baseProducts) {
      if (!passesProductSelections(product, { ignoreAllSelections: false })) {
        continue;
      }
      const variants = params.variantsByProduct.get(product.productId) ?? [];
      if (
        variants.some((variant) =>
          variantPasses(variant, { ignorePrice: true, ignoreAllSelections: false })
        )
      ) {
        count += 1;
      }
    }
    return count;
  };

  let priceRange: { minMinor: string; maxMinor: string } | null = null;
  const builtFacets: BuiltFacet[] = [];

  for (const facet of facets) {
    const facetType = normalizeFacetType(facet.facetType);
    if (!facetType) {
      continue;
    }

    const label = facetLabelById.get(facet.id) ?? facet.slug;
    const uiType = mapUiTypeEnum(facet.uiType);
    const selectionMode = mapSelectionModeEnum(facet.selectionMode);

    if (facetType === "tag" || facetType === "feature" || facetType === "option") {
      const values = discreteValuesByFacetId.get(facet.id) ?? [];
      const valuesWithCounts = values.map((value) => ({
        ...value,
        count: countDiscreteValue(facetType, facet.id, value.sourceHandles),
        baseCount: countDiscreteValueInBase(facetType, value.sourceHandles),
      }));

      const baseVisibleValues = valuesWithCounts.filter((value) => value.baseCount > 0);
      if (baseVisibleValues.length < facet.minValues) {
        continue;
      }

      const valuePayload = valuesWithCounts.map((value) => ({
        slug: value.slug,
        label: value.label,
        count: value.count,
        sortIndex: value.sortIndex,
        swatchId: value.swatchId,
      }));

      if (facet.valueSort === "alpha") {
        valuePayload.sort((left, right) =>
          (left.label ?? left.slug).localeCompare(right.label ?? right.slug)
        );
      } else if (facet.valueSort === "count") {
        valuePayload.sort((left, right) => {
          if (left.count !== right.count) return right.count - left.count;
          return (left.label ?? left.slug).localeCompare(right.label ?? right.slug);
        });
      } else {
        valuePayload.sort((left, right) => {
          if (left.sortIndex !== right.sortIndex) return left.sortIndex - right.sortIndex;
          return left.slug.localeCompare(right.slug);
        });
      }

      const visibleValues =
        facet.maxValuesVisible > 0
          ? valuePayload.slice(0, facet.maxValuesVisible)
          : valuePayload;

      const allSourceHandles = Array.from(
        new Set(values.flatMap((value) => value.sourceHandles))
      );

      builtFacets.push({
        groupId: facet.groupId ?? null,
        facetType: mapFacetTypeEnum(facetType),
        slug: facet.slug,
        label,
        uiType,
        selectionMode,
        values: visibleValues.map((value) => ({
          slug: value.slug,
          label: value.label,
          count: value.count,
          swatch: value.swatchId
            ? (() => {
                const swatch = swatchById.get(value.swatchId);
                if (!swatch) return null;
                return {
                  id: swatch.id,
                  swatchType: swatch.swatchType.toUpperCase(),
                  colorOne: swatch.colorOne,
                  colorTwo: swatch.colorTwo,
                  file: swatch.imageId
                    ? { __typename: "File", id: swatch.imageId }
                    : null,
                  metadata: swatch.metadata,
                };
              })()
            : null,
        })),
        totalCount: countFacetTotal(facetType, facet.id, allSourceHandles),
      });

      continue;
    }

    if (facetType === "price") {
      const baseRange = computePriceRange(true, true);
      if (!baseRange) {
        continue;
      }

      const isolatedRange = computePriceRange(true, false);
      if (isolatedRange) {
        priceRange = {
          minMinor: String(isolatedRange.min),
          maxMinor: String(isolatedRange.max),
        };
      }

      builtFacets.push({
        groupId: facet.groupId ?? null,
        facetType: mapFacetTypeEnum(facetType),
        slug: facet.slug,
        label,
        uiType,
        selectionMode,
        values: [],
        totalCount: countProductsMatchingCurrentFiltersIgnoringPrice(),
      });
      continue;
    }

    const baseInStockCount = countInStockProducts(true, true);
    if (baseInStockCount <= 0) {
      continue;
    }

    builtFacets.push({
      groupId: facet.groupId ?? null,
      facetType: mapFacetTypeEnum(facetType),
      slug: facet.slug,
      label,
      uiType,
      selectionMode,
      values: [],
      totalCount: countInStockProducts(true, false),
    });
  }

  const ungrouped: BuiltFacet[] = [];
  const groupFacetMap = new Map<string, BuiltFacet[]>();

  for (const facet of builtFacets) {
    if (!facet.groupId) {
      ungrouped.push(facet);
      continue;
    }
    const items = groupFacetMap.get(facet.groupId) ?? [];
    items.push(facet);
    groupFacetMap.set(facet.groupId, items);
  }

  const groups: Array<{
    name: string | null;
    facets: BuiltFacet[];
  }> = [];

  for (const group of groupRows) {
    const groupFacets = groupFacetMap.get(group.id) ?? [];
    if (groupFacets.length === 0) {
      continue;
    }

    groups.push({
      name: groupNameById.get(group.id) ?? null,
      facets: groupFacets,
    });
  }

  if (ungrouped.length > 0) {
    groups.push({
      name: null,
      facets: ungrouped,
    });
  }

  return {
    priceRange,
    groups,
  };
}
