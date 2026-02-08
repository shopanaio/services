import { and, eq } from "drizzle-orm";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  productSearchIndex,
  type VariantSearchIndex,
} from "../../repositories/models/index.js";
import { ResolveFacetsScript } from "../facet/ResolveFacetsScript.js";
import {
  buildListingFacets,
  type ListingFacetSelection,
} from "../shared/facets.js";
import type {
  CollectionProductsQueryParams,
  CollectionProductsQueryResult,
  CollectionRuleInput,
  ProductSortBy,
  SortDirection,
} from "./dto/index.js";

interface RuleContext {
  tagIn: string[];
  tagAll: string[];
  featureIn: string[];
  categoryIn: string[];
  createdFrom?: string;
  createdTo?: string;
  optionIn: string[];
  priceMin?: number;
  priceMax?: number;
  inStock?: boolean;
}

interface ParsedFacetFilters {
  tagHandles: string[];
  featureSlugs: string[];
  optionSlugs: string[];
}

export class QueryCollectionProductsScript extends BaseScript<
  CollectionProductsQueryParams,
  CollectionProductsQueryResult
> {
  protected async execute(
    params: CollectionProductsQueryParams
  ): Promise<CollectionProductsQueryResult> {
    const collection = await this.repository.collection.findById(params.collectionId);
    if (!collection) {
      return this.emptyResult();
    }

    if (
      collection.deletedAt ||
      !collection.publishedAt ||
      new Date(collection.publishedAt) > new Date() ||
      (collection.effectiveFrom && new Date(collection.effectiveFrom) > new Date()) ||
      (collection.effectiveTo && new Date(collection.effectiveTo) <= new Date())
    ) {
      return this.emptyResult();
    }

    const first = Math.min(Math.max(params.first ?? 20, 1), 100);
    const sortBy = params.sort?.by ?? (collection.defaultSort as ProductSortBy);
    const direction = (params.sort?.direction ??
      (collection.defaultSortDirection as SortDirection)) as SortDirection;
    const currency =
      this.context.currency ?? this.context.store.defaultCurrency ?? "USD";
    const { priceMinMinor, priceMaxMinor } = this.resolvePriceBounds(params.filters);

    const allPublishedRows = await this.repository.db
      .select()
      .from(productSearchIndex)
      .where(
        and(
          eq(productSearchIndex.projectId, this.getProjectId()),
          eq(productSearchIndex.status, "published")
        )
      );

    if (allPublishedRows.length === 0) {
      return this.emptyResult();
    }

    let baseProductIds: string[] = [];
    const manualRankByProductId = new Map<string, string>();

    if (collection.type === "manual") {
      const items = await this.repository.collectionItem.findByCollectionId(collection.id);
      baseProductIds = items.map((item) => item.productId);
      for (const item of items) {
        manualRankByProductId.set(item.productId, item.lexoRank);
      }
    } else {
      const rules = await this.repository.collectionRule.findByCollectionId(collection.id);
      const compiled = this.compileRules(
        rules.map((rule) => ({
          field: rule.field,
          operator: rule.operator,
          value: rule.value,
        }))
      );

      const candidateRows = allPublishedRows.filter((row) =>
        this.productMatchesRuleContext(row, compiled)
      );
      const candidateIds = candidateRows.map((row) => row.productId);
      const variantRows = await this.repository.variantSearchIndex.getByProductIds(
        candidateIds
      );
      const variantsByProduct = this.groupVariantsByProduct(variantRows);

      baseProductIds = candidateRows
        .filter((row) =>
          this.productMatchesVariantRuleContext(
            variantsByProduct.get(row.productId) ?? [],
            compiled,
            currency
          )
        )
        .map((row) => row.productId);
    }

    if (baseProductIds.length === 0) {
      return this.emptyResult();
    }

    const baseRows = allPublishedRows.filter((row) => baseProductIds.includes(row.productId));
    const rawFacetFilters = params.filters?.facets ?? [];
    const resolvedFacetFilters = rawFacetFilters.length
      ? await this.executeScript(ResolveFacetsScript, { facetFilters: rawFacetFilters })
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

    const productLevelFiltered = baseRows.filter((row) => {
      const matchesTags =
        parsedFacetFilters.tagHandles.length === 0 ||
        parsedFacetFilters.tagHandles.some((value) => row.tagHandles.includes(value));
      if (!matchesTags) return false;

      const matchesFeatures =
        parsedFacetFilters.featureSlugs.length === 0 ||
        parsedFacetFilters.featureSlugs.some((value) => row.featureSlugs.includes(value));
      return matchesFeatures;
    });

    const hasVariantFilters =
      parsedFacetFilters.optionSlugs.length > 0 ||
      priceMinMinor !== undefined ||
      priceMaxMinor !== undefined ||
      params.filters?.inStock !== undefined;

    const baseVariantsByProduct = this.groupVariantsByProduct(
      await this.repository.variantSearchIndex.getByProductIds(
        baseRows.map((row) => row.productId)
      )
    );

    const minPriceByProduct = new Map<string, number | null>();
    const fullyFiltered = productLevelFiltered.filter((row) => {
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

      if (hasVariantFilters && passing.length === 0) {
        return false;
      }

      const prices = passing
        .map((variant) => variant.priceMinor)
        .filter((value): value is number => value !== null);
      minPriceByProduct.set(
        row.productId,
        prices.length > 0 ? Math.min(...prices) : null
      );
      return true;
    });

    let sorted = [...fullyFiltered];
    const effectiveSortBy =
      sortBy === "manual" && collection.type !== "manual" ? "newest" : sortBy;

    if (effectiveSortBy === "manual") {
      sorted.sort((a, b) => {
        const left = manualRankByProductId.get(a.productId) ?? "";
        const right = manualRankByProductId.get(b.productId) ?? "";
        const cmp = left.localeCompare(right);
        if (cmp !== 0) return cmp;
        return a.productId.localeCompare(b.productId);
      });
    } else if (effectiveSortBy === "newest") {
      sorted.sort((a, b) => {
        const cmp = a.createdAt.localeCompare(b.createdAt);
        if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
        return a.productId.localeCompare(b.productId);
      });
    } else if (effectiveSortBy === "name") {
      const translations = await this.repository.translation.getProductTranslationsBatch(
        sorted.map((row) => row.productId),
        params.locale
      );
      sorted.sort((a, b) => {
        const leftName = translations.get(a.productId)?.title ?? "";
        const rightName = translations.get(b.productId)?.title ?? "";
        const cmp = leftName.localeCompare(rightName, params.locale);
        if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
        return a.productId.localeCompare(b.productId);
      });
    } else if (effectiveSortBy === "price") {
      sorted.sort((a, b) => {
        const left = minPriceByProduct.get(a.productId);
        const right = minPriceByProduct.get(b.productId);
        const leftNull = left === null || left === undefined;
        const rightNull = right === null || right === undefined;
        if (leftNull && rightNull) return a.productId.localeCompare(b.productId);
        if (leftNull) return 1;
        if (rightNull) return -1;
        if (left !== right) return direction === "asc" ? left - right : right - left;
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
    const pageRows = sorted.slice(0, first + 1);
    const hasNextPage = pageRows.length > first;
    const visible = hasNextPage ? pageRows.slice(0, first) : pageRows;

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

  protected handleError(_error: unknown): CollectionProductsQueryResult {
    return this.emptyResult();
  }

  private compileRules(rules: CollectionRuleInput[]): RuleContext {
    const ctx: RuleContext = {
      tagIn: [],
      tagAll: [],
      featureIn: [],
      categoryIn: [],
      optionIn: [],
    };

    for (const rule of rules) {
      if (rule.field === "tag" && (rule.operator === "in" || rule.operator === "contains")) {
        ctx.tagIn.push(...this.ensureArray(rule.value));
      } else if (rule.field === "tag" && rule.operator === "all") {
        ctx.tagAll.push(...this.ensureArray(rule.value));
      } else if (
        rule.field === "feature" &&
        (rule.operator === "in" || rule.operator === "contains")
      ) {
        ctx.featureIn.push(...this.ensureArray(rule.value));
      } else if (
        rule.field === "category" &&
        (rule.operator === "in" || rule.operator === "contains")
      ) {
        ctx.categoryIn.push(...this.ensureArray(rule.value));
      } else if (
        rule.field === "option" &&
        (rule.operator === "in" || rule.operator === "contains")
      ) {
        ctx.optionIn.push(...this.ensureArray(rule.value));
      } else if (rule.field === "price") {
        const [min, max] = this.ensureRange(rule.operator, rule.value);
        if (min !== undefined) ctx.priceMin = min;
        if (max !== undefined) ctx.priceMax = max;
      } else if (rule.field === "in_stock" && rule.operator === "eq") {
        ctx.inStock = Boolean(rule.value);
      } else if (rule.field === "created_at") {
        const [from, to] = this.ensureDateRange(rule.operator, rule.value);
        if (from) ctx.createdFrom = from;
        if (to) ctx.createdTo = to;
      }
    }

    return ctx;
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

  private resolvePriceBounds(filters: CollectionProductsQueryParams["filters"]): {
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

  private productMatchesRuleContext(
    row: typeof productSearchIndex.$inferSelect,
    ctx: RuleContext
  ): boolean {
    if (ctx.tagIn.length > 0 && !ctx.tagIn.some((value) => row.tagHandles.includes(value))) {
      return false;
    }

    if (ctx.tagAll.length > 0 && !ctx.tagAll.every((value) => row.tagHandles.includes(value))) {
      return false;
    }

    if (
      ctx.featureIn.length > 0 &&
      !ctx.featureIn.some((value) => row.featureSlugs.includes(value))
    ) {
      return false;
    }

    if (
      ctx.categoryIn.length > 0 &&
      !ctx.categoryIn.some((value) => row.categoryHandles.includes(value))
    ) {
      return false;
    }

    if (ctx.createdFrom && row.createdAt < ctx.createdFrom) {
      return false;
    }
    if (ctx.createdTo && row.createdAt >= ctx.createdTo) {
      return false;
    }

    return true;
  }

  private productMatchesVariantRuleContext(
    variants: VariantSearchIndex[],
    ctx: RuleContext,
    currency: string
  ): boolean {
    const hasVariantRules =
      ctx.optionIn.length > 0 ||
      ctx.priceMin !== undefined ||
      ctx.priceMax !== undefined ||
      ctx.inStock !== undefined;

    if (!hasVariantRules) {
      return true;
    }

    return variants.some((variant) =>
      this.variantMatchesFilters(
        variant,
        ctx.optionIn,
        ctx.priceMin,
        ctx.priceMax,
        ctx.inStock,
        currency
      )
    );
  }

  private groupVariantsByProduct(
    variants: VariantSearchIndex[]
  ): Map<string, VariantSearchIndex[]> {
    const byProduct = new Map<string, VariantSearchIndex[]>();
    for (const variant of variants) {
      const list = byProduct.get(variant.productId) ?? [];
      list.push(variant);
      byProduct.set(variant.productId, list);
    }
    return byProduct;
  }

  private variantMatchesFilters(
    variant: VariantSearchIndex,
    optionSlugs: string[],
    priceMinMinor: number | undefined,
    priceMaxMinor: number | undefined,
    inStock: boolean | undefined,
    currency: string
  ): boolean {
    if (variant.priceCurrency !== currency) return false;

    if (optionSlugs.length > 0) {
      const hasOption = optionSlugs.some((value) => variant.optionSlugs.includes(value));
      if (!hasOption) return false;
    }

    if (priceMinMinor !== undefined) {
      if (variant.priceMinor === null || variant.priceMinor < priceMinMinor) return false;
    }

    if (priceMaxMinor !== undefined) {
      if (variant.priceMinor === null || variant.priceMinor > priceMaxMinor) return false;
    }

    if (inStock !== undefined && variant.inStock !== inStock) return false;
    return true;
  }

  private ensureArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") return [value];
    return [];
  }

  private ensureRange(operator: string, value: unknown): [number | undefined, number | undefined] {
    if (operator === "between" && Array.isArray(value) && value.length >= 2) {
      return [Number(value[0]), Number(value[1])];
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) return [undefined, undefined];

    if (operator === "eq") return [numeric, numeric];
    if (operator === "gt") return [numeric + 1, undefined];
    if (operator === "gte") return [numeric, undefined];
    if (operator === "lt") return [undefined, numeric - 1];
    if (operator === "lte") return [undefined, numeric];
    return [undefined, undefined];
  }

  private ensureDateRange(
    operator: string,
    value: unknown
  ): [string | undefined, string | undefined] {
    if (operator === "between" && Array.isArray(value) && value.length >= 2) {
      return [String(value[0]), String(value[1])];
    }
    const date = String(value);
    if (operator === "eq") return [date, date];
    if (operator === "gt" || operator === "gte") return [date, undefined];
    if (operator === "lt" || operator === "lte") return [undefined, date];
    return [undefined, undefined];
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

  private emptyResult(): CollectionProductsQueryResult {
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
