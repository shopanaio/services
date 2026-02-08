import { and, eq } from "drizzle-orm";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  productCategory,
  productSearchIndex,
  type VariantSearchIndex,
} from "../../repositories/models/index.js";
import type {
  CategoryProductsQueryParams,
  CategoryProductsQueryResult,
  ProductSortBy,
  SortDirection,
} from "./dto/index.js";
import { ResolveFacetsScript } from "../facet/ResolveFacetsScript.js";
import {
  buildListingFacets,
  type ListingFacetSelection,
} from "../shared/facets.js";

interface ParsedFacetFilters {
  tagHandles: string[];
  featureSlugs: string[];
  optionSlugs: string[];
}

export class QueryCategoryProductsScript extends BaseScript<
  CategoryProductsQueryParams,
  CategoryProductsQueryResult
> {
  protected async execute(
    params: CategoryProductsQueryParams
  ): Promise<CategoryProductsQueryResult> {
    const category = await this.repository.category.findById(params.categoryId);
    if (!category) {
      return this.emptyResult();
    }

    const first = Math.min(Math.max(params.first ?? 20, 1), 100);
    const sortBy = params.sort?.by ?? (category.defaultSort as ProductSortBy);
    const direction = (params.sort?.direction ??
      (category.defaultSortDirection as SortDirection)) as SortDirection;
    const currency =
      this.context.currency ?? this.context.store.defaultCurrency ?? "USD";
    const { priceMinMinor, priceMaxMinor } = this.resolvePriceBounds(params.filters);

    const rawFacetFilters = params.filters?.facets ?? [];
    const resolvedFacetFilters = rawFacetFilters.length
      ? await this.executeScript(ResolveFacetsScript, {
          facetFilters: rawFacetFilters,
        })
      : { tagHandles: [], featureSlugs: [], optionSlugs: [], resolved: [] };

    const fallbackFacetFilters =
      rawFacetFilters.length &&
      resolvedFacetFilters.tagHandles.length === 0 &&
      resolvedFacetFilters.featureSlugs.length === 0 &&
      resolvedFacetFilters.optionSlugs.length === 0
        ? this.parseFacetFilters(rawFacetFilters)
        : { tagHandles: [], featureSlugs: [], optionSlugs: [] };

    const parsedFacetFilters: ParsedFacetFilters = {
      tagHandles: Array.from(
        new Set([...resolvedFacetFilters.tagHandles, ...fallbackFacetFilters.tagHandles])
      ),
      featureSlugs: Array.from(
        new Set([
          ...resolvedFacetFilters.featureSlugs,
          ...fallbackFacetFilters.featureSlugs,
        ])
      ),
      optionSlugs: Array.from(
        new Set([...resolvedFacetFilters.optionSlugs, ...fallbackFacetFilters.optionSlugs])
      ),
    };

    const selectedFacetFiltersById = new Map<string, ListingFacetSelection>();
    for (const resolved of resolvedFacetFilters.resolved) {
      const existing = selectedFacetFiltersById.get(resolved.facetId);
      if (!existing) {
        selectedFacetFiltersById.set(resolved.facetId, {
          facetId: resolved.facetId,
          facetType: resolved.facetType,
          sourceHandles: [...resolved.sourceHandles],
        });
        continue;
      }

      existing.sourceHandles = Array.from(
        new Set([...existing.sourceHandles, ...resolved.sourceHandles])
      );
      selectedFacetFiltersById.set(resolved.facetId, existing);
    }

    const hasVariantFilters =
      parsedFacetFilters.optionSlugs.length > 0 ||
      priceMinMinor !== undefined ||
      priceMaxMinor !== undefined ||
      params.filters?.inStock !== undefined;

    const baseRows = await this.repository.db
      .select({
        productId: productCategory.productId,
        lexoRank: productCategory.lexoRank,
        createdAt: productSearchIndex.createdAt,
        tagHandles: productSearchIndex.tagHandles,
        featureSlugs: productSearchIndex.featureSlugs,
      })
      .from(productCategory)
      .innerJoin(
        productSearchIndex,
        and(
          eq(productSearchIndex.productId, productCategory.productId),
          eq(productSearchIndex.projectId, productCategory.projectId)
        )
      )
      .where(
        and(
          eq(productCategory.projectId, this.getProjectId()),
          eq(productCategory.categoryId, params.categoryId),
          eq(productSearchIndex.status, "published")
        )
      );

    if (baseRows.length === 0) {
      return this.emptyResult();
    }

    const baseVariantsByProduct = this.groupVariantsByProduct(
      await this.repository.variantSearchIndex.getByProductIds(
        baseRows.map((row) => row.productId)
      )
    );

    const productLevelFiltered = baseRows.filter((row) => {
      const matchesTags =
        parsedFacetFilters.tagHandles.length === 0 ||
        parsedFacetFilters.tagHandles.some((value) =>
          row.tagHandles.includes(value)
        );
      if (!matchesTags) return false;

      const matchesFeatures =
        parsedFacetFilters.featureSlugs.length === 0 ||
        parsedFacetFilters.featureSlugs.some((value) =>
          row.featureSlugs.includes(value)
        );
      return matchesFeatures;
    });

    const minPriceByProduct = new Map<string, number | null>();

    if (hasVariantFilters || sortBy === "price") {
      for (const row of productLevelFiltered) {
        const variants = baseVariantsByProduct.get(row.productId) ?? [];
        const passing = variants.filter((variant) =>
          this.variantMatchesFilters(
            variant,
            parsedFacetFilters.optionSlugs,
            priceMinMinor,
            priceMaxMinor,
            params.filters?.inStock,
            currency
          )
        );

        if (passing.length === 0) {
          minPriceByProduct.set(row.productId, null);
          continue;
        }

        const prices = passing
          .map((variant) => variant.priceMinor)
          .filter((value): value is number => value !== null);

        minPriceByProduct.set(
          row.productId,
          prices.length > 0 ? Math.min(...prices) : null
        );
      }
    }

    const fullyFiltered = productLevelFiltered.filter((row) => {
      if (!hasVariantFilters) return true;
      const variants = baseVariantsByProduct.get(row.productId) ?? [];
      return variants.some((variant) =>
        this.variantMatchesFilters(
          variant,
          parsedFacetFilters.optionSlugs,
          priceMinMinor,
          priceMaxMinor,
          params.filters?.inStock,
          currency
        )
      );
    });

    let sorted = [...fullyFiltered];

    if (sortBy === "manual") {
      sorted.sort((a, b) => {
        const rankCmp = a.lexoRank.localeCompare(b.lexoRank);
        if (rankCmp !== 0) return rankCmp;
        return a.productId.localeCompare(b.productId);
      });
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => {
        const cmp = a.createdAt.localeCompare(b.createdAt);
        if (cmp !== 0) {
          return direction === "asc" ? cmp : -cmp;
        }
        return a.productId.localeCompare(b.productId);
      });
    } else if (sortBy === "name") {
      const translations = await this.repository.translation.getProductTranslationsBatch(
        sorted.map((row) => row.productId),
        params.locale
      );
      sorted.sort((a, b) => {
        const leftName = translations.get(a.productId)?.title ?? "";
        const rightName = translations.get(b.productId)?.title ?? "";
        const cmp = leftName.localeCompare(rightName, params.locale);
        if (cmp !== 0) {
          return direction === "asc" ? cmp : -cmp;
        }
        return a.productId.localeCompare(b.productId);
      });
    } else if (sortBy === "price") {
      sorted.sort((a, b) => {
        const left = minPriceByProduct.get(a.productId);
        const right = minPriceByProduct.get(b.productId);
        const leftNull = left === null || left === undefined;
        const rightNull = right === null || right === undefined;
        if (leftNull && rightNull) {
          return a.productId.localeCompare(b.productId);
        }
        if (leftNull) return 1;
        if (rightNull) return -1;
        if (left !== right) {
          return direction === "asc" ? left - right : right - left;
        }
        return a.productId.localeCompare(b.productId);
      });
    }

    if (params.after) {
      const cursorId = this.decodeCursor(params.after);
      if (cursorId) {
        const afterIndex = sorted.findIndex((row) => row.productId === cursorId);
        if (afterIndex >= 0) {
          sorted = sorted.slice(afterIndex + 1);
        }
      }
    }

    const totalCount = sorted.length;
    const paged = sorted.slice(0, first + 1);
    const hasNextPage = paged.length > first;
    const visible = hasNextPage ? paged.slice(0, first) : paged;

    const edges = visible.map((row) => ({
      cursor: this.encodeCursor(row.productId),
      nodeId: row.productId,
    }));

    const facets = await buildListingFacets({
      repository: this.repository,
      baseProducts: baseRows.map((row) => ({
        productId: row.productId,
        tagHandles: row.tagHandles,
        featureSlugs: row.featureSlugs,
      })),
      variantsByProduct: baseVariantsByProduct,
      currency,
      selectedFacetFiltersById,
      priceMinMinor,
      priceMaxMinor,
      inStock: params.filters?.inStock,
    });

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: Boolean(params.after),
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount,
      facets,
    };
  }

  protected handleError(_error: unknown): CategoryProductsQueryResult {
    return this.emptyResult();
  }

  private parseFacetFilters(values: string[]): ParsedFacetFilters {
    const tagHandles = new Set<string>();
    const featureSlugs = new Set<string>();
    const optionSlugs = new Set<string>();

    for (const raw of values) {
      const separator = raw.indexOf(":");
      if (separator <= 0 || separator === raw.length - 1) continue;
      const facetSlug = raw.slice(0, separator);
      const valueSlug = raw.slice(separator + 1);
      if (!facetSlug || !valueSlug) continue;

      if (facetSlug === "tag" || facetSlug === "tags") {
        tagHandles.add(valueSlug);
      } else if (facetSlug === "feature" || facetSlug === "features") {
        featureSlugs.add(valueSlug);
      } else if (facetSlug === "option" || facetSlug === "options") {
        optionSlugs.add(valueSlug);
      }
    }

    return {
      tagHandles: [...tagHandles],
      featureSlugs: [...featureSlugs],
      optionSlugs: [...optionSlugs],
    };
  }

  private resolvePriceBounds(filters: CategoryProductsQueryParams["filters"]): {
    priceMinMinor?: number;
    priceMaxMinor?: number;
  } {
    let min = filters?.priceMinMinor;
    let max = filters?.priceMaxMinor;

    for (const range of filters?.ranges ?? []) {
      if (range.facetSlug !== "price") continue;
      if (range.min !== undefined) {
        min = min === undefined ? range.min : Math.max(min, range.min);
      }
      if (range.max !== undefined) {
        max = max === undefined ? range.max : Math.min(max, range.max);
      }
    }

    return { priceMinMinor: min, priceMaxMinor: max };
  }

  private groupVariantsByProduct(
    rows: VariantSearchIndex[]
  ): Map<string, VariantSearchIndex[]> {
    const grouped = new Map<string, VariantSearchIndex[]>();
    for (const row of rows) {
      const list = grouped.get(row.productId) ?? [];
      list.push(row);
      grouped.set(row.productId, list);
    }
    return grouped;
  }

  private variantMatchesFilters(
    variant: VariantSearchIndex,
    optionSlugs: string[],
    priceMinMinor: number | undefined,
    priceMaxMinor: number | undefined,
    inStock: boolean | undefined,
    currency: string
  ): boolean {
    if (variant.priceCurrency !== currency) {
      return false;
    }

    if (optionSlugs.length > 0) {
      const hasOption = optionSlugs.some((value) => variant.optionSlugs.includes(value));
      if (!hasOption) return false;
    }

    if (priceMinMinor !== undefined) {
      if (variant.priceMinor === null || variant.priceMinor < priceMinMinor) {
        return false;
      }
    }

    if (priceMaxMinor !== undefined) {
      if (variant.priceMinor === null || variant.priceMinor > priceMaxMinor) {
        return false;
      }
    }

    if (inStock !== undefined && variant.inStock !== inStock) {
      return false;
    }

    return true;
  }

  private encodeCursor(productId: string): string {
    return Buffer.from(productId).toString("base64");
  }

  private decodeCursor(cursor: string): string | null {
    try {
      return Buffer.from(cursor, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  private emptyResult(): CategoryProductsQueryResult {
    return {
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
      totalCount: 0,
      facets: null,
    };
  }
}
