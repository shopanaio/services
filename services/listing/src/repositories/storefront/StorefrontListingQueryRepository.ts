import { sql } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  assertCursorMatches,
  buildListingFilterHash,
  decodeListingCursor,
  encodeListingCursor,
} from "./cursor.js";
import { andBitmapExpr, emptyBitmapExpr, orBitmapExpr } from "./sqlHelpers.js";
import { StorefrontFacetAggregationRepository } from "./StorefrontFacetAggregationRepository.js";
import { StorefrontFacetResolutionRepository } from "./StorefrontFacetResolutionRepository.js";
import { StorefrontPostingBitmapQueryRepository } from "./StorefrontPostingBitmapQueryRepository.js";
import { StorefrontProductSortCollectorRepository } from "./StorefrontProductSortCollectorRepository.js";
import { StorefrontProductTitleSearchQueryRepository } from "./StorefrontProductTitleSearchQueryRepository.js";
import { StorefrontVariantPriceCollectorRepository } from "./StorefrontVariantPriceCollectorRepository.js";
import { StorefrontVariantProjectionQueryRepository } from "./StorefrontVariantProjectionQueryRepository.js";
import type { Database } from "../../infrastructure/db/database.js";
import type { TransactionManager } from "@shopana/shared-kernel";
import {
  StorefrontRepositoryValidationError,
  type BitmapExpr,
  type ListingAggregatesResult,
  type ListingCursorPayload,
  type ListingCollectorKind,
  type ListingPageCollectResult,
  type ProductSortCollectKind,
  type ProductPostingField,
  type ResolvedListingRequest,
  type StorefrontFilterPlan,
  type StorefrontListingInput,
  type StorefrontListingRepositoryResult,
  type StorefrontListingScope,
  type StorefrontSortInput,
} from "./types.js";

export class StorefrontListingQueryRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly facets: StorefrontFacetResolutionRepository,
    private readonly postings: StorefrontPostingBitmapQueryRepository,
    private readonly projection: StorefrontVariantProjectionQueryRepository,
    private readonly productCollector: StorefrontProductSortCollectorRepository,
    private readonly variantPriceCollector: StorefrontVariantPriceCollectorRepository,
    private readonly search: StorefrontProductTitleSearchQueryRepository,
    private readonly aggregation: StorefrontFacetAggregationRepository
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async getStorefrontListing(
    input: StorefrontListingInput
  ): Promise<StorefrontListingRepositoryResult> {
    const startedAt = Date.now();
    let request: ResolvedListingRequest | null = null;
    let collectorKind: ListingCollectorKind | null = null;
    let shortCircuitReason: string | null = null;

    try {
      request = await this.normalizeAndResolve(input);
      const scope = await this.buildScopeProductBitmap(request);
      if (scope.productBitmap.empty) {
        shortCircuitReason = scope.productBitmap.source;
        return this.emptyResult(request);
      }

      const productFiltersBitmap = await this.buildProductFiltersBitmap(
        request.filterPlan
      );
      if (productFiltersBitmap.empty) {
        shortCircuitReason = productFiltersBitmap.source;
        return this.emptyResult(request);
      }

      const variantFilters = await this.buildVariantFiltersBitmap(
        request.filterPlan,
        request.input.currency
      );
      if (variantFilters.variantMatchesBitmap?.empty) {
        shortCircuitReason = variantFilters.variantMatchesBitmap.source;
        return this.emptyResult(request);
      }
      if (variantFilters.projectedProductBitmap?.empty) {
        shortCircuitReason = variantFilters.projectedProductBitmap.source;
        return this.emptyResult(request);
      }
      const variantMatchesBitmap = this.combineOptionalBitmaps(
        scope.variantBitmap,
        variantFilters.variantMatchesBitmap,
        "scope-and-filter-variant-matches"
      );
      if (variantMatchesBitmap?.empty) {
        shortCircuitReason = variantMatchesBitmap.source;
        return this.emptyResult(request);
      }
      const priceVariantBitmap = this.combineOptionalBitmaps(
        scope.priceVariantBitmap,
        variantFilters.priceVariantBitmap,
        "scope-and-filter-price-variants"
      );

      const matchesBitmap = await this.buildFinalProductMatches({
        scopeBitmap: scope.productBitmap,
        productFiltersBitmap,
        projectedVariantBitmap: variantFilters.projectedProductBitmap,
      });
      if (matchesBitmap.empty) {
        shortCircuitReason = matchesBitmap.source;
        return this.emptyResult(request);
      }

      collectorKind = this.selectCollector(request, !!variantMatchesBitmap);
      const page = await this.collectPage({
        request,
        matchesBitmap,
        variantMatchesBitmap,
      });

      const aggregates = this.needsAggregates(request)
        ? await this.collectAggregates({
            request,
            scopeBitmap: scope.productBitmap,
            productFiltersBitmap,
            variantMatchesBitmap,
            productMatchesBitmap: matchesBitmap,
            priceVariantBitmap,
          })
        : {};

      return {
        rows: this.withCursorMetadata(page.rows, request),
        hasNextPage: page.hasNextPage,
        ...aggregates,
      };
    } finally {
      if (request) {
        this.debugListingQuery({
          projectId: this.storeId,
          scopeKind: request.input.scope.kind,
          normalizedQueryHash: request.normalizedQuery
            ? buildListingFilterHash({
                projectId: this.storeId,
                locale: request.input.locale,
                currency: request.input.currency,
                scope: request.input.scope,
                normalizedQuery: request.normalizedQuery,
                filterPlan: {
                  productFacetGroups: [],
                  optionFacetGroups: [],
                  vendorIds: [],
                },
                sort: request.sort,
              })
            : null,
          sort: request.sort.kind,
          pageSize: request.input.first,
          productFacetGroups: request.filterPlan.productFacetGroups.length,
          optionFacetGroups: request.filterPlan.optionFacetGroups.length,
          hasPriceFilter: !!request.filterPlan.priceRange,
          hasInStockFilter: request.filterPlan.inStock !== undefined,
          collectorKind,
          includeTotalCount: request.input.includeTotalCount,
          includeFacets: request.input.includeFacets,
          includePriceRange: request.input.includePriceRange,
          includeInStockCount: request.input.includeInStockCount,
          shortCircuitReason,
          durationMs: Date.now() - startedAt,
        });
      }
    }
  }

  private async normalizeAndResolve(
    input: StorefrontListingInput
  ): Promise<ResolvedListingRequest> {
    if (!input.locale.trim()) {
      throw new StorefrontRepositoryValidationError("Locale is required");
    }
    if (!input.currency.trim()) {
      throw new StorefrontRepositoryValidationError("Currency is required");
    }
    if (!Number.isSafeInteger(input.first) || input.first <= 0) {
      throw new StorefrontRepositoryValidationError(
        "Listing page size must be a positive safe integer"
      );
    }

    const normalizedQuery = this.search.normalizeQuery(input.query);
    if (input.scope.kind === "search" && !normalizedQuery) {
      throw new StorefrontRepositoryValidationError(
        "Search scope requires a non-empty query"
      );
    }

    const sort = this.resolveSort(input.sort, normalizedQuery);
    if (sort.kind === "relevance" && !normalizedQuery) {
      throw new StorefrontRepositoryValidationError(
        "Relevance sort requires a non-empty query"
      );
    }

    const filterPlan = await this.facets.resolveFilterPlan({
      filters: input.filters,
    });
    const cursor = input.after ? decodeListingCursor(input.after) : null;
    const filterHash = buildListingFilterHash({
      projectId: this.storeId,
      locale: input.locale,
      currency: input.currency,
      scope: input.scope,
      normalizedQuery,
      filterPlan,
      sort,
      manualScopeId: this.manualScopeIdFor(input.scope, sort),
    });

    assertCursorMatches(cursor, filterHash, sort.kind);

    return {
      input,
      filterPlan,
      normalizedQuery,
      sort,
      cursor,
      filterHash,
    };
  }

  private async buildScopeProductBitmap(
    request: ResolvedListingRequest
  ): Promise<ScopeBitmapBuildResult> {
    const published = await this.postings.buildPublishedProductScope();
    let scopeBitmap: BitmapExpr;
    let ruleScopeVariantBitmap: BitmapExpr | null = null;
    let ruleScopePriceVariantBitmap: BitmapExpr | null = null;

    switch (request.input.scope.kind) {
      case "category":
        scopeBitmap = await this.singleProductPostingScope(
          "category",
          request.input.scope.categoryId,
          "category-scope"
        );
        break;
      case "manual_collection":
        scopeBitmap = await this.singleProductPostingScope(
          "collection",
          request.input.scope.collectionId,
          "collection-scope"
        );
        break;
      case "rule_collection":
        {
          const ruleScope = await this.buildRuleCollectionBitmap(request);
          scopeBitmap = ruleScope.productBitmap;
          ruleScopeVariantBitmap = ruleScope.variantBitmap ?? null;
          ruleScopePriceVariantBitmap = ruleScope.priceVariantBitmap ?? null;
        }
        break;
      case "global":
      case "search":
        scopeBitmap = published;
        break;
    }

    if (scopeBitmap.empty) {
      return {
        productBitmap: scopeBitmap,
        variantBitmap: ruleScopeVariantBitmap,
        priceVariantBitmap: ruleScopePriceVariantBitmap,
      };
    }

    const scopedPublished =
      request.input.scope.kind === "global" || request.input.scope.kind === "search"
        ? scopeBitmap
        : andBitmapExpr([scopeBitmap, published]);

    if (!request.normalizedQuery) {
      return {
        productBitmap: scopedPublished,
        variantBitmap: ruleScopeVariantBitmap,
        priceVariantBitmap: ruleScopePriceVariantBitmap,
      };
    }

    const searchBitmap = await this.search.buildSearchCandidateBitmap({
      locale: request.input.locale,
      normalizedQuery: request.normalizedQuery,
    });
    return {
      productBitmap: andBitmapExpr([scopedPublished, searchBitmap]),
      variantBitmap: ruleScopeVariantBitmap,
      priceVariantBitmap: ruleScopePriceVariantBitmap,
    };
  }

  private async buildRuleCollectionBitmap(
    request: ResolvedListingRequest
  ): Promise<{
    productBitmap: BitmapExpr;
    variantBitmap?: BitmapExpr;
    priceVariantBitmap?: BitmapExpr | null;
  }> {
    if (request.input.scope.kind !== "rule_collection") {
      throw new StorefrontRepositoryValidationError(
        "Rule collection bitmap requires rule collection scope"
      );
    }

    const productParts: BitmapExpr[] = [];
    const variantParts: BitmapExpr[] = [];
    let priceVariantBitmap: BitmapExpr | null = null;
    let hasOptionRule = false;
    let hasExplicitStockRule = false;

    for (const rule of request.input.scope.rules) {
      switch (rule.kind) {
        case "category":
          productParts.push(
            await this.singleProductPostingScope(
              "category",
              rule.categoryId,
              "rule-category"
            )
          );
          break;
        case "collection":
          productParts.push(
            await this.singleProductPostingScope(
              "collection",
              rule.collectionId,
              "rule-collection"
            )
          );
          break;
        case "vendor":
          productParts.push(
            await this.singleProductPostingScope("vendor", rule.vendorId, "rule-vendor")
          );
          break;
        case "product_facet":
          productParts.push(
            await this.facetGroupBitmap("product", rule.valueKeys, "rule-product-facet")
          );
          break;
        case "option_facet":
          hasOptionRule = true;
          variantParts.push(
            await this.facetGroupBitmap("variant", rule.valueKeys, "rule-option-facet")
          );
          break;
        case "price":
          priceVariantBitmap = await this.variantPriceCollector.buildPriceRangeVariantBitmap({
            currency: request.input.currency,
            minPriceMinor: rule.minPriceMinor,
            maxPriceMinor: rule.maxPriceMinor,
          });
          variantParts.push(priceVariantBitmap);
          break;
        case "in_stock":
          hasExplicitStockRule = true;
          variantParts.push(
            await this.postings.buildVariantStockScope({ inStock: rule.value })
          );
          break;
      }
    }

    const published = await this.postings.buildPublishedProductScope();
    const productRuleScope =
      productParts.length > 0
        ? productParts.slice(1).reduce(
            (acc, part) => ({
              sql: sql`(${acc.sql} | ${part.sql})`,
              empty: acc.empty && part.empty,
              source: `rule-product-or(${acc.source},${part.source})`,
            }),
            productParts[0]
          )
        : null;
    const ruleScopeParts: BitmapExpr[] = [];
    if (productRuleScope) {
      ruleScopeParts.push(productRuleScope);
    }

    let variantRuleScope: BitmapExpr | null = null;
    if (variantParts.length > 0) {
      if (hasOptionRule && !hasExplicitStockRule) {
        variantParts.push(await this.postings.buildVariantStockScope({ inStock: true }));
      }
      variantRuleScope = andBitmapExpr(variantParts);
      const projected = await this.projection.projectVariantBitmapToProducts({
        variantBitmap: variantRuleScope,
      });
      ruleScopeParts.push(projected);
    }

    const ruleScope =
      ruleScopeParts.length > 0 ? orBitmapExpr(ruleScopeParts) : null;
    const productBitmap = ruleScope ? andBitmapExpr([published, ruleScope]) : published;
    const canUseVariantScopeForCollection =
      !productRuleScope && variantRuleScope !== null;

    return {
      productBitmap,
      variantBitmap: canUseVariantScopeForCollection ? variantRuleScope : undefined,
      priceVariantBitmap: canUseVariantScopeForCollection
        ? priceVariantBitmap
        : undefined,
    };
  }

  private async buildProductFiltersBitmap(
    plan: StorefrontFilterPlan
  ): Promise<BitmapExpr> {
    return this.buildProductFiltersBitmapWithOptions(plan, {
      includeProductFacets: true,
      includeStock: true,
    });
  }

  private async buildVariantFiltersBitmap(
    plan: StorefrontFilterPlan,
    currency: string
  ): Promise<{
    variantMatchesBitmap: BitmapExpr | null;
    projectedProductBitmap: BitmapExpr | null;
    priceVariantBitmap: BitmapExpr | null;
    hasVariantLevelPredicate: boolean;
  }> {
    const variantParts: BitmapExpr[] = [];

    for (const group of plan.optionFacetGroups) {
      variantParts.push(
        await this.facetGroupBitmap("variant", group.valueKeys, "option-filter")
      );
    }

    let priceVariantBitmap: BitmapExpr | null = null;
    if (plan.priceRange) {
      priceVariantBitmap =
        await this.variantPriceCollector.buildPriceRangeVariantBitmap({
          currency,
          minPriceMinor: plan.priceRange.minPriceMinor,
          maxPriceMinor: plan.priceRange.maxPriceMinor,
        });
      variantParts.push(priceVariantBitmap);
    }

    const hasVariantPath =
      plan.optionFacetGroups.length > 0 || !!plan.priceRange;
    if (hasVariantPath) {
      if (plan.optionFacetGroups.length > 0 || plan.inStock !== undefined) {
        variantParts.push(
          await this.postings.buildVariantStockScope({
            inStock: plan.inStock ?? true,
          })
        );
      }
    }

    if (variantParts.length === 0) {
      return {
        variantMatchesBitmap: null,
        projectedProductBitmap: null,
        priceVariantBitmap,
        hasVariantLevelPredicate: false,
      };
    }

    const variantMatchesBitmap = andBitmapExpr(variantParts);
    const projectedProductBitmap =
      await this.projection.projectVariantBitmapToProducts({
        variantBitmap: variantMatchesBitmap,
      });

    return {
      variantMatchesBitmap,
      projectedProductBitmap,
      priceVariantBitmap,
      hasVariantLevelPredicate: true,
    };
  }

  private async buildFinalProductMatches(input: {
    scopeBitmap: BitmapExpr;
    productFiltersBitmap: BitmapExpr;
    projectedVariantBitmap?: BitmapExpr | null;
  }): Promise<BitmapExpr> {
    const parts = [input.scopeBitmap, input.productFiltersBitmap];
    if (input.projectedVariantBitmap) {
      parts.push(input.projectedVariantBitmap);
    }
    return andBitmapExpr(parts);
  }

  private combineOptionalBitmaps(
    first: BitmapExpr | null | undefined,
    second: BitmapExpr | null | undefined,
    source: string
  ): BitmapExpr | null {
    if (first && second) {
      const combined = andBitmapExpr([first, second]);
      return { ...combined, source };
    }
    return first ?? second ?? null;
  }

  private selectCollector(
    input: ResolvedListingRequest,
    hasVariantLevelPredicate: boolean
  ): ListingCollectorKind {
    if (input.sort.kind === "relevance") {
      return "relevance";
    }
    if (
      (input.sort.kind === "price_asc" || input.sort.kind === "price_desc") &&
      hasVariantLevelPredicate
    ) {
      return "matched_variant_price";
    }
    return "product_sort";
  }

  private async collectPage(input: {
    request: ResolvedListingRequest;
    matchesBitmap: BitmapExpr;
    variantMatchesBitmap?: BitmapExpr | null;
  }): Promise<ListingPageCollectResult> {
    const collector = this.selectCollector(
      input.request,
      !!input.variantMatchesBitmap
    );
    if (collector === "relevance") {
      if (!input.request.normalizedQuery) {
        throw new StorefrontRepositoryValidationError(
          "Relevance collector requires normalized query"
        );
      }
      return this.search.collectRelevancePage({
        locale: input.request.input.locale,
        normalizedQuery: input.request.normalizedQuery,
        matchesBitmap: input.matchesBitmap,
        first: input.request.input.first,
        after: input.request.cursor,
        includePlusOne: true,
      });
    }

    if (collector === "matched_variant_price") {
      if (!input.variantMatchesBitmap) {
        throw new StorefrontRepositoryValidationError(
          "Matched price collector requires variant bitmap"
        );
      }
      return this.variantPriceCollector.collectMatchedVariantPricePage({
        currency: input.request.input.currency,
        variantMatchesBitmap: input.variantMatchesBitmap,
        productMatchesBitmap: input.matchesBitmap,
        direction: input.request.sort.kind === "price_desc" ? "desc" : "asc",
        first: input.request.input.first,
        after: input.request.cursor,
        includePlusOne: true,
      });
    }

    return this.productCollector.collectProductSortPage({
      matchesBitmap: input.matchesBitmap,
      sort: this.productSortKind(input.request.sort.kind),
      locale: input.request.input.locale,
      currency: input.request.input.currency,
      manualScopeId: this.manualScopeIdFor(
        input.request.input.scope,
        input.request.sort
      ),
      first: input.request.input.first,
      after: input.request.cursor,
      includePlusOne: true,
    });
  }

  private async collectAggregates(input: {
    request: ResolvedListingRequest;
    scopeBitmap: BitmapExpr;
    productFiltersBitmap: BitmapExpr;
    variantMatchesBitmap?: BitmapExpr | null;
    productMatchesBitmap: BitmapExpr;
    priceVariantBitmap?: BitmapExpr | null;
  }): Promise<ListingAggregatesResult> {
    const result: ListingAggregatesResult = {};
    if (input.request.input.includeTotalCount) {
      result.totalCount = await this.aggregation.countProducts({
        matchesBitmap: input.productMatchesBitmap,
      });
    }

    const needsFacetValues =
      input.request.input.includeFacets ||
      input.request.input.includePriceRange ||
      input.request.input.includeInStockCount;
    const facetValues = needsFacetValues
      ? await this.facets.getFacetValues({
          scope: input.request.input.scope,
          locale: input.request.input.locale,
          currency: input.request.input.currency,
        })
      : [];

    const productBaseWithoutProductFacets =
      await this.buildAggregateProductBase(input.request, {
        scopeBitmap: input.scopeBitmap,
        includeProductFacets: false,
        includeStock: true,
        variantMatchesBitmap: input.variantMatchesBitmap,
      });
    const productBaseWithProductFacets =
      await this.buildAggregateProductBase(input.request, {
        scopeBitmap: input.scopeBitmap,
        includeProductFacets: true,
        includeStock: true,
        variantMatchesBitmap: null,
      });
    const productBaseForInStockCount =
      await this.buildAggregateProductBase(input.request, {
        scopeBitmap: input.scopeBitmap,
        includeProductFacets: true,
        includeStock: false,
        variantMatchesBitmap: null,
      });

    if (input.request.input.includeFacets) {
      const inStockVariantBitmap = await this.postings.buildVariantStockScope({
        inStock: input.request.filterPlan.inStock ?? true,
      });
      const productFacetCounts =
        await this.aggregation.countProductFacetValues({
          productBaseBitmap: productBaseWithoutProductFacets,
          activeProductGroups: input.request.filterPlan.productFacetGroups,
          facetValues,
        });
      const optionFacetCounts = await this.aggregation.countOptionFacetValues({
        productBaseBitmap: productBaseWithProductFacets,
        activeOptionGroups: input.request.filterPlan.optionFacetGroups,
        priceVariantBitmap: input.priceVariantBitmap,
        inStockVariantBitmap,
        facetValues,
      });
      result.facets = [...productFacetCounts, ...optionFacetCounts];
    }

    if (input.request.input.includePriceRange) {
      result.priceRange =
        input.request.filterPlan.inStock === false
          ? null
          : await this.aggregation.getPriceRange({
              productBaseBitmap: productBaseWithProductFacets,
              activeOptionGroups: input.request.filterPlan.optionFacetGroups,
              activeProductGroups: input.request.filterPlan.productFacetGroups,
              currency: input.request.input.currency,
              excludeActivePrice: true,
            });
    }

    if (input.request.input.includeInStockCount) {
      result.inStockCount = await this.aggregation.countInStock({
        productBaseBitmap: productBaseForInStockCount,
        activeProductGroups: input.request.filterPlan.productFacetGroups,
        activeOptionGroups: input.request.filterPlan.optionFacetGroups,
        priceVariantBitmap: input.priceVariantBitmap,
      });
    }

    return result;
  }

  private needsAggregates(request: ResolvedListingRequest): boolean {
    return (
      request.input.includeTotalCount ||
      request.input.includeFacets ||
      request.input.includePriceRange ||
      request.input.includeInStockCount
    );
  }

  private async buildProductFiltersBitmapWithOptions(
    plan: StorefrontFilterPlan,
    options: { includeProductFacets: boolean; includeStock: boolean }
  ): Promise<BitmapExpr> {
    const parts: BitmapExpr[] = [await this.postings.buildPublishedProductScope()];

    if (plan.vendorIds.length > 0) {
      parts.push(await this.facetLikeProductPostingGroup("vendor", plan.vendorIds));
    }

    if (options.includeProductFacets) {
      for (const group of plan.productFacetGroups) {
        parts.push(
          await this.facetGroupBitmap("product", group.valueKeys, "product-facet")
        );
      }
    }

    if (
      options.includeStock &&
      plan.inStock !== undefined &&
      plan.optionFacetGroups.length === 0 &&
      !plan.priceRange
    ) {
      parts.push(await this.postings.buildProductStockScope({ inStock: plan.inStock }));
    }

    return andBitmapExpr(parts);
  }

  private async buildAggregateProductBase(
    request: ResolvedListingRequest,
    input: {
      scopeBitmap: BitmapExpr;
      includeProductFacets: boolean;
      includeStock: boolean;
      variantMatchesBitmap?: BitmapExpr | null;
    }
  ): Promise<BitmapExpr> {
    const productFilters = await this.buildProductFiltersBitmapWithOptions(
      request.filterPlan,
      {
        includeProductFacets: input.includeProductFacets,
        includeStock: input.includeStock,
      }
    );
    const projected = input.variantMatchesBitmap
      ? await this.projection.projectVariantBitmapToProducts({
          variantBitmap: input.variantMatchesBitmap,
        })
      : null;
    return this.buildFinalProductMatches({
      scopeBitmap: input.scopeBitmap,
      productFiltersBitmap: productFilters,
      projectedVariantBitmap: projected,
    });
  }

  private async singleProductPostingScope(
    field: ProductPostingField,
    valueKey: string,
    source: string
  ): Promise<BitmapExpr> {
    const bitmap = await this.postings.getPostingBitmap({
      entityType: "product",
      field,
      valueKey,
    });
    return bitmap
      ? {
          sql: sql`${bitmap}::roaringbitmap`,
          empty: false,
          source,
        }
      : emptyBitmapExpr(`${source}:missing`);
  }

  private async facetLikeProductPostingGroup(
    field: ProductPostingField,
    valueKeys: readonly string[]
  ): Promise<BitmapExpr> {
    const loaded = await this.postings.getPostingBitmaps({
      entityType: "product",
      field,
      valueKeys,
    });
    return this.postings.buildOrGroup({
      entityType: "product",
      field,
      valueKeys,
      loaded,
    });
  }

  private async facetGroupBitmap(
    entityType: "product" | "variant",
    valueKeys: readonly string[],
    source: string
  ): Promise<BitmapExpr> {
    const loaded = await this.postings.getPostingBitmaps({
      entityType,
      field: "facet",
      valueKeys,
    });
    const group = this.postings.buildOrGroup({
      entityType,
      field: "facet",
      valueKeys,
      loaded,
    });
    return group.empty ? emptyBitmapExpr(`${source}:${group.source}`) : group;
  }

  private resolveSort(
    sort: StorefrontSortInput | undefined,
    normalizedQuery: string | null
  ): StorefrontSortInput {
    if (sort) {
      return sort;
    }
    return { kind: normalizedQuery ? "relevance" : "newest" };
  }

  private productSortKind(kind: StorefrontSortInput["kind"]): ProductSortCollectKind {
    if (kind === "relevance") {
      throw new StorefrontRepositoryValidationError(
        "Relevance is not a product sort collector kind"
      );
    }
    return kind;
  }

  private manualScopeIdFor(
    scope: StorefrontListingScope,
    sort: StorefrontSortInput
  ): string | undefined {
    if (sort.kind !== "manual") {
      return undefined;
    }
    switch (scope.kind) {
      case "category":
        return scope.manualSortScopeId ?? scope.categoryId;
      case "manual_collection":
      case "rule_collection":
        return scope.collectionId;
      case "global":
      case "search":
        throw new StorefrontRepositoryValidationError(
          "Manual sort requires category or collection scope"
        );
    }
  }

  private withCursorMetadata(
    rows: ListingPageCollectResult["rows"],
    request: ResolvedListingRequest
  ): ListingPageCollectResult["rows"] {
    return rows.map((row) => {
      const payload = {
        ...row.cursorValues,
        version: 1,
        hash: request.filterHash,
        sort: request.sort.kind,
      } as ListingCursorPayload;

      return {
        ...row,
        cursor: encodeListingCursor(payload),
        cursorValues: payload as unknown as Record<
          string,
          string | number | boolean | null
        >,
      };
    });
  }

  private emptyResult(
    request: ResolvedListingRequest
  ): StorefrontListingRepositoryResult {
    return {
      rows: [],
      hasNextPage: false,
      ...(request.input.includeTotalCount ? { totalCount: 0 } : {}),
      ...(request.input.includeFacets ? { facets: [] } : {}),
      ...(request.input.includePriceRange ? { priceRange: null } : {}),
      ...(request.input.includeInStockCount ? { inStockCount: 0 } : {}),
    };
  }

  private debugListingQuery(metadata: Record<string, unknown>): void {
    this.ctx.kernel.getServices().logger.debug(
      metadata,
      "Storefront listing query"
    );
  }
}

interface ScopeBitmapBuildResult {
  productBitmap: BitmapExpr;
  variantBitmap?: BitmapExpr | null;
  priceVariantBitmap?: BitmapExpr | null;
}
