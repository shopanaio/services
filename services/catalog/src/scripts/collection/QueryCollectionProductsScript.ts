import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  collectionItem,
  productSearchIndex,
  productTranslation,
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

    // Skip publish check for admin API (allows querying unpublished collections)
    if (!params.skipPublishCheck) {
      if (
        collection.deletedAt ||
        !collection.publishedAt ||
        new Date(collection.publishedAt) > new Date() ||
        (collection.effectiveFrom && new Date(collection.effectiveFrom) > new Date()) ||
        (collection.effectiveTo && new Date(collection.effectiveTo) <= new Date())
      ) {
        return this.emptyResult();
      }
    } else if (collection.deletedAt) {
      // Even for admin API, don't query deleted collections
      return this.emptyResult();
    }

    const first = Math.min(Math.max(params.first ?? 20, 1), 100);
    const sortBy = params.sort?.by ?? (collection.defaultSort as ProductSortBy);
    const direction = (params.sort?.direction ??
      (collection.defaultSortDirection as SortDirection)) as SortDirection;
    const currency =
      this.context.currency ?? this.context.store.defaultCurrency ?? "USD";

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

    const { priceMinMinor, priceMaxMinor } = this.resolvePriceBounds(params.filters);

    const ruleCtx: RuleContext = {
      tagIn: [],
      tagAll: [],
      featureIn: [],
      categoryIn: [],
      optionIn: [],
    };

    if (collection.type === "rule") {
      const rules = await this.repository.collectionRule.findByCollectionId(collection.id);
      Object.assign(
        ruleCtx,
        this.compileRules(
          rules.map((rule) => ({
            field: rule.field,
            operator: rule.operator,
            value: rule.value,
          }))
        )
      );
    }

    const baseScopeConditions: SQL[] = [
      eq(productSearchIndex.projectId, this.getProjectId()),
    ];
    // Include draft products for admin API, only published for storefront
    if (!params.includeDrafts) {
      baseScopeConditions.push(eq(productSearchIndex.status, "published"));
    }

    if (collection.type === "rule") {
      this.appendRuleProductConditions(baseScopeConditions, ruleCtx);
      const ruleVariantExists = this.buildVariantExistsCondition({
        productIdRef: productSearchIndex.productId,
        currency,
        optionSets: ruleCtx.optionIn.length > 0 ? [ruleCtx.optionIn] : [],
        priceMinMinor: ruleCtx.priceMin,
        priceMaxMinor: ruleCtx.priceMax,
        inStock: ruleCtx.inStock,
      });
      if (ruleVariantExists) {
        baseScopeConditions.push(ruleVariantExists);
      }
    }

    if (collection.type === "manual") {
      baseScopeConditions.push(
        sql`exists (
          select 1
          from catalog.collection_item ci
          where ci.project_id = ${this.getProjectId()}
            and ci.collection_id = ${collection.id}
            and ci.product_id = ${productSearchIndex.productId}
        )`
      );
    }

    const baseRows = await this.repository.db
      .select({
        productId: productSearchIndex.productId,
        tagHandles: productSearchIndex.tagHandles,
        featureSlugs: productSearchIndex.featureSlugs,
      })
      .from(productSearchIndex)
      .where(and(...baseScopeConditions));

    if (baseRows.length === 0) {
      return this.emptyResult();
    }

    const finalConditions: SQL[] = [...baseScopeConditions];

    if (parsedFacetFilters.tagHandles.length > 0) {
      finalConditions.push(sql`${productSearchIndex.tagHandles} && ${parsedFacetFilters.tagHandles}`);
    }
    if (parsedFacetFilters.featureSlugs.length > 0) {
      finalConditions.push(
        sql`${productSearchIndex.featureSlugs} && ${parsedFacetFilters.featureSlugs}`
      );
    }

    const hasUserVariantFilters =
      parsedFacetFilters.optionSlugs.length > 0 ||
      priceMinMinor !== undefined ||
      priceMaxMinor !== undefined ||
      params.filters?.inStock !== undefined;

    if (hasUserVariantFilters) {
      const userVariantExists = this.buildVariantExistsCondition({
        productIdRef: productSearchIndex.productId,
        currency,
        optionSets:
          parsedFacetFilters.optionSlugs.length > 0 ? [parsedFacetFilters.optionSlugs] : [],
        priceMinMinor,
        priceMaxMinor,
        inStock: params.filters?.inStock,
      });
      if (userVariantExists) {
        finalConditions.push(userVariantExists);
      }
    }

    const minPriceSql = this.buildMinVariantPriceExpression({
      productIdRef: productSearchIndex.productId,
      currency,
      optionSets:
        parsedFacetFilters.optionSlugs.length > 0 ? [parsedFacetFilters.optionSlugs] : [],
      priceMinMinor,
      priceMaxMinor,
      inStock: params.filters?.inStock,
    });

    const effectiveSortBy =
      sortBy === "manual" && collection.type !== "manual" ? "newest" : sortBy;

    const baseQuery = this.repository.db
      .select({
        productId: productSearchIndex.productId,
        createdAt: productSearchIndex.createdAt,
        name: productTranslation.title,
        manualRank: collectionItem.lexoRank,
        minPrice: minPriceSql,
      })
      .from(productSearchIndex)
      .leftJoin(
        productTranslation,
        and(
          eq(productTranslation.projectId, productSearchIndex.projectId),
          eq(productTranslation.productId, productSearchIndex.productId),
          eq(productTranslation.locale, params.locale)
        )
      )
      .leftJoin(
        collectionItem,
        and(
          eq(collectionItem.projectId, productSearchIndex.projectId),
          eq(collectionItem.productId, productSearchIndex.productId),
          eq(collectionItem.collectionId, collection.id)
        )
      )
      .where(and(...finalConditions));

    const sorted = await (effectiveSortBy === "manual"
      ? baseQuery.orderBy(asc(collectionItem.lexoRank), asc(productSearchIndex.productId))
      : effectiveSortBy === "newest"
        ? direction === "asc"
          ? baseQuery.orderBy(asc(productSearchIndex.createdAt), asc(productSearchIndex.productId))
          : baseQuery.orderBy(
              desc(productSearchIndex.createdAt),
              asc(productSearchIndex.productId)
            )
        : effectiveSortBy === "name"
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
    const pageRows = filtered.slice(0, first + 1);
    const hasNextPage = pageRows.length > first;
    const visible = hasNextPage ? pageRows.slice(0, first) : pageRows;

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

  protected handleError(_error: unknown): CollectionProductsQueryResult {
    return this.emptyResult();
  }

  private appendRuleProductConditions(conditions: SQL[], ctx: RuleContext): void {
    if (ctx.tagIn.length > 0) {
      conditions.push(sql`${productSearchIndex.tagHandles} && ${ctx.tagIn}`);
    }
    if (ctx.tagAll.length > 0) {
      conditions.push(sql`${productSearchIndex.tagHandles} @> ${ctx.tagAll}`);
    }
    if (ctx.featureIn.length > 0) {
      conditions.push(sql`${productSearchIndex.featureSlugs} && ${ctx.featureIn}`);
    }
    if (ctx.categoryIn.length > 0) {
      conditions.push(sql`${productSearchIndex.categoryHandles} && ${ctx.categoryIn}`);
    }
    if (ctx.createdFrom) {
      conditions.push(sql`${productSearchIndex.createdAt} >= ${ctx.createdFrom}`);
    }
    if (ctx.createdTo) {
      conditions.push(sql`${productSearchIndex.createdAt} < ${ctx.createdTo}`);
    }
  }

  private buildVariantExistsCondition(input: {
    productIdRef: unknown;
    currency: string;
    optionSets: string[][];
    priceMinMinor?: number;
    priceMaxMinor?: number;
    inStock?: boolean;
  }): SQL | null {
    const hasOptionSets = input.optionSets.some((set) => set.length > 0);
    const hasOtherFilters =
      input.priceMinMinor !== undefined ||
      input.priceMaxMinor !== undefined ||
      input.inStock !== undefined;

    if (!hasOptionSets && !hasOtherFilters) {
      return null;
    }

    const optionSql = input.optionSets
      .filter((set) => set.length > 0)
      .map((set) => sql`and vsi.option_slugs && ${set}`);

    return sql`exists (
      select 1
      from catalog.variant_search_index vsi
      where vsi.project_id = ${this.getProjectId()}
        and vsi.product_id = ${input.productIdRef}
        and vsi.price_currency = ${input.currency}
        ${sql.join(optionSql, sql` `)}
        ${input.priceMinMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor >= ${input.priceMinMinor}` : sql``}
        ${input.priceMaxMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor <= ${input.priceMaxMinor}` : sql``}
        ${input.inStock !== undefined ? sql`and vsi.in_stock = ${input.inStock}` : sql``}
    )`;
  }

  private buildMinVariantPriceExpression(input: {
    productIdRef: unknown;
    currency: string;
    optionSets: string[][];
    priceMinMinor?: number;
    priceMaxMinor?: number;
    inStock?: boolean;
  }): SQL<number | null> {
    const optionSql = input.optionSets
      .filter((set) => set.length > 0)
      .map((set) => sql`and vsi.option_slugs && ${set}`);

    return sql<number | null>`(
      select min(vsi.price_minor)::bigint
      from catalog.variant_search_index vsi
      where vsi.project_id = ${this.getProjectId()}
        and vsi.product_id = ${input.productIdRef}
        and vsi.price_currency = ${input.currency}
        ${sql.join(optionSql, sql` `)}
        ${input.priceMinMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor >= ${input.priceMinMinor}` : sql``}
        ${input.priceMaxMinor !== undefined ? sql`and vsi.price_minor is not null and vsi.price_minor <= ${input.priceMaxMinor}` : sql``}
        ${input.inStock !== undefined ? sql`and vsi.in_stock = ${input.inStock}` : sql``}
    )`;
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

    ctx.tagIn = Array.from(new Set(ctx.tagIn));
    ctx.tagAll = Array.from(new Set(ctx.tagAll));
    ctx.featureIn = Array.from(new Set(ctx.featureIn));
    ctx.categoryIn = Array.from(new Set(ctx.categoryIn));
    ctx.optionIn = Array.from(new Set(ctx.optionIn));

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
