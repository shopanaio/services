import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  productCategory,
  productSearchIndex,
  productTranslation,
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

    const hasVariantFilters =
      parsedFacetFilters.optionSlugs.length > 0 ||
      priceMinMinor !== undefined ||
      priceMaxMinor !== undefined ||
      params.filters?.inStock !== undefined;

    const conditions: SQL[] = [
      eq(productCategory.projectId, this.getProjectId()),
      eq(productCategory.categoryId, params.categoryId),
      eq(productSearchIndex.status, "published"),
    ];

    if (parsedFacetFilters.tagHandles.length > 0) {
      conditions.push(sql`${productSearchIndex.tagHandles} && ${parsedFacetFilters.tagHandles}`);
    }
    if (parsedFacetFilters.featureSlugs.length > 0) {
      conditions.push(
        sql`${productSearchIndex.featureSlugs} && ${parsedFacetFilters.featureSlugs}`
      );
    }

    if (hasVariantFilters) {
      conditions.push(
        this.buildVariantExistsCondition({
          productIdRef: productSearchIndex.productId,
          optionSlugs: parsedFacetFilters.optionSlugs,
          priceMinMinor,
          priceMaxMinor,
          inStock: params.filters?.inStock,
          currency,
        })
      );
    }

    const minPriceSql = this.buildMinVariantPriceExpression({
      productIdRef: productSearchIndex.productId,
      optionSlugs: parsedFacetFilters.optionSlugs,
      priceMinMinor,
      priceMaxMinor,
      inStock: params.filters?.inStock,
      currency,
    });

    const baseQuery = this.repository.db
      .select({
        productId: productSearchIndex.productId,
        lexoRank: productCategory.lexoRank,
        createdAt: productSearchIndex.createdAt,
        name: productTranslation.title,
        minPrice: minPriceSql,
      })
      .from(productCategory)
      .innerJoin(
        productSearchIndex,
        and(
          eq(productSearchIndex.productId, productCategory.productId),
          eq(productSearchIndex.projectId, productCategory.projectId)
        )
      )
      .leftJoin(
        productTranslation,
        and(
          eq(productTranslation.projectId, productSearchIndex.projectId),
          eq(productTranslation.productId, productSearchIndex.productId),
          eq(productTranslation.locale, params.locale)
        )
      )
      .where(and(...conditions));

    const sorted = await (sortBy === "manual"
      ? baseQuery.orderBy(asc(productCategory.lexoRank), asc(productSearchIndex.productId))
      : sortBy === "newest"
        ? direction === "asc"
          ? baseQuery.orderBy(asc(productSearchIndex.createdAt), asc(productSearchIndex.productId))
          : baseQuery.orderBy(
              desc(productSearchIndex.createdAt),
              asc(productSearchIndex.productId)
            )
        : sortBy === "name"
          ? direction === "asc"
            ? baseQuery.orderBy(
                asc(sql`coalesce(${productTranslation.title}, '')`),
                asc(productSearchIndex.productId)
              )
            : baseQuery.orderBy(
                desc(sql`coalesce(${productTranslation.title}, '')`),
                asc(productSearchIndex.productId)
              )
          : direction === "asc"
            ? baseQuery.orderBy(
                asc(sql`case when ${minPriceSql} is null then 1 else 0 end`),
                asc(minPriceSql),
                asc(productSearchIndex.productId)
              )
            : baseQuery.orderBy(
                asc(sql`case when ${minPriceSql} is null then 1 else 0 end`),
                desc(minPriceSql),
                asc(productSearchIndex.productId)
              ));

    let filtered = sorted;
    if (params.after) {
      const cursorId = this.decodeCursor(params.after);
      if (cursorId) {
        const afterIndex = filtered.findIndex((row) => row.productId === cursorId);
        if (afterIndex >= 0) {
          filtered = filtered.slice(afterIndex + 1);
        }
      }
    }

    const totalCount = filtered.length;
    const paged = filtered.slice(0, first + 1);
    const hasNextPage = paged.length > first;
    const visible = hasNextPage ? paged.slice(0, first) : paged;

    const edges = visible.map((row) => ({
      cursor: this.encodeCursor(row.productId),
      nodeId: row.productId,
    }));

    const baseVariantsByProduct = this.groupVariantsByProduct(
      await this.repository.variantSearchIndex.getByProductIds(
        baseRows.map((row) => row.productId)
      )
    );

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

  private buildVariantExistsCondition(input: {
    productIdRef: unknown;
    optionSlugs: string[];
    priceMinMinor?: number;
    priceMaxMinor?: number;
    inStock?: boolean;
    currency: string;
  }): SQL {
    return sql`exists (
      select 1
      from catalog.variant_search_index vsi
      where vsi.project_id = ${this.getProjectId()}
        and vsi.product_id = ${input.productIdRef}
        and vsi.price_currency = ${input.currency}
        ${input.optionSlugs.length > 0 ? sql`and vsi.option_slugs && ${input.optionSlugs}` : sql``}
        ${input.priceMinMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor >= ${input.priceMinMinor}` : sql``}
        ${input.priceMaxMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor <= ${input.priceMaxMinor}` : sql``}
        ${input.inStock !== undefined ? sql`and vsi.in_stock = ${input.inStock}` : sql``}
    )`;
  }

  private buildMinVariantPriceExpression(input: {
    productIdRef: unknown;
    optionSlugs: string[];
    priceMinMinor?: number;
    priceMaxMinor?: number;
    inStock?: boolean;
    currency: string;
  }): SQL<number | null> {
    return sql<number | null>`(
      select min(vsi.price_minor)::bigint
      from catalog.variant_search_index vsi
      where vsi.project_id = ${this.getProjectId()}
        and vsi.product_id = ${input.productIdRef}
        and vsi.price_currency = ${input.currency}
        ${input.optionSlugs.length > 0 ? sql`and vsi.option_slugs && ${input.optionSlugs}` : sql``}
        ${input.priceMinMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor >= ${input.priceMinMinor}` : sql``}
        ${input.priceMaxMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor <= ${input.priceMaxMinor}` : sql``}
        ${input.inStock !== undefined ? sql`and vsi.in_stock = ${input.inStock}` : sql``}
    )`;
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
