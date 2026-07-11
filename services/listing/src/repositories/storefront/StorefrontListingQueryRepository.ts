import { existsSync } from "node:fs";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  assertCursorMatches,
  buildListingFilterHash,
  decodeListingCursor,
} from "./cursor.js";
import {
  assertNonNegativeSafeInteger,
  normalizePositivePageSize,
} from "./sqlHelpers.js";
import { StorefrontFacetResolutionRepository } from "./StorefrontFacetResolutionRepository.js";
import { StorefrontProductTitleSearchQueryRepository } from "./StorefrontProductTitleSearchQueryRepository.js";
import {
  compileFacetCountsProfileQuerySql,
  compileFacetCountsQuerySql,
  facetCountsProfileTargetsForRequest,
  type FacetCountsVisibleFacetValue,
  type FacetCountsProfileTarget,
} from "./sql/compileFacetCountsQuerySql.js";
import { compileFacetsQuerySql } from "./sql/compileFacetsQuerySql.js";
import {
  toListingSqlRequest,
} from "./sql/compileListingInputSql.js";
import { compilePageQuerySql } from "./sql/compilePageQuerySql.js";
import { compileTotalCountQuerySql } from "./sql/compileTotalCountQuerySql.js";
import { compileVirtualFacetsQuerySql } from "./sql/compileVirtualFacetsQuerySql.js";
import { compileVariantCandidateDiagnosticsSql } from "./sql/compileListingProductMatchesSql.js";
import {
  mapFacetCountRows,
  mapFacetMetadataRows,
  mapPageRows,
  mapTotalCountRows,
  mapVirtualFacetsRows,
  mergeFacetCounts,
  type FacetCountMapSqlRow,
  type FacetMetadataSqlRow,
  type ParallelPageSqlRow,
  type TotalCountSqlRow,
  type VirtualFacetsSqlRow,
} from "./sql/resultMappers.js";
import type { Database } from "../../infrastructure/db/database.js";
import { TransactionManager } from "@shopana/shared-kernel";
import {
  StorefrontRepositoryValidationError,
  type NormalizedStorefrontFacetFilter,
  type NormalizedStorefrontListingFilters,
  type ResolvedListingRequest,
  type StorefrontListingFilterInput,
  type StorefrontListingInput,
  type StorefrontListingRepositoryResult,
  type StorefrontListingScope,
  type StorefrontSortInput,
} from "./types.js";

interface BranchMetric {
  branch: string;
  durationMs: number;
}

interface VariantDiagnosticsSqlRow extends Record<string, unknown> {
  termCandidateCardinality: number;
  numericCandidateCardinality: number | null;
  finalVariantCandidateCardinality: number;
  projectedProductCardinality: number;
}

type FacetCountsProfileSqlRow = Record<string, unknown> & {
  target: string;
  rowCount: number | string | null;
  distinctSignatureCount: number | string | null;
  bitmapCardinality: number | string | null;
  countSum: number | string | null;
};

type ExplainAnalyzeSqlRow = Record<string, unknown> & {
  "QUERY PLAN": string;
};

interface FacetCountsProfileMetric {
  target: FacetCountsProfileTarget;
  durationMs: number;
  rowCount: number | null;
  distinctSignatureCount: number | null;
  bitmapCardinality: number | null;
  countSum: number | null;
}

interface ExplainAnalyzeReportSection {
  branch: string;
  durationMs: number;
  plan: string;
}

export class StorefrontListingQueryRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly facets: StorefrontFacetResolutionRepository,
    private readonly search: StorefrontProductTitleSearchQueryRepository,
    private readonly heavyOptionFacetCountsEnabled: boolean,
    private readonly facetCountsProfilingEnabled: boolean
  ) {
    super(db, txManager);
  }

  @ReadOnly()
  async getStorefrontListing(
    input: StorefrontListingInput
  ): Promise<StorefrontListingRepositoryResult> {
    if (TransactionManager.isInTransaction()) {
      throw new Error(
        "Storefront listing snapshot boundary cannot reuse an existing transaction"
      );
    }
    return this.txManager.run(async () => {
      await this.connection.execute(
        sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`
      );
      return this.getStorefrontListingInSnapshot(input);
    });
  }

  private async getStorefrontListingInSnapshot(
    input: StorefrontListingInput
  ): Promise<StorefrontListingRepositoryResult> {
    const startedAt = Date.now();
    const branchMetrics: BranchMetric[] = [];
    let request: ResolvedListingRequest | null = null;
    let pageRows: ParallelPageSqlRow[] = [];
    let sqlRoundTrips = 6;
    let variantDiagnostics: VariantDiagnosticsSqlRow | null = null;

    try {
      request = await this.normalize(input);
      const sqlRequest = toListingSqlRequest({
        storeId: this.storeId,
        request,
        heavyOptionFacetCountsEnabled: this.heavyOptionFacetCountsEnabled,
      });
      const diagnosticRows = await this.executeMeasured<VariantDiagnosticsSqlRow>(
        "variantDiagnostics",
        compileVariantCandidateDiagnosticsSql(sqlRequest),
        branchMetrics
      );
      variantDiagnostics = diagnosticRows[0] ?? null;

      const pageSqlRows = await this.executeMeasured<ParallelPageSqlRow>(
        "page",
        compilePageQuerySql(sqlRequest),
        branchMetrics
      );
      const totalCountRows = await this.executeMeasured<TotalCountSqlRow>(
        "totalCount",
        compileTotalCountQuerySql(sqlRequest),
        branchMetrics
      );
      const facetMetadataRows = await this.executeMeasured<FacetMetadataSqlRow>(
        "facetsMetadata",
        compileFacetsQuerySql(sqlRequest),
        branchMetrics
      );
      const virtualFacetRows = await this.executeMeasured<VirtualFacetsSqlRow>(
        "virtualFacets",
        compileVirtualFacetsQuerySql(sqlRequest),
        branchMetrics
      );
      const visibleFacetValues =
        toFacetCountsVisibleFacetValues(facetMetadataRows);
      const facetCountRows =
        await this.executeMeasuredWithLocalJitOff<FacetCountMapSqlRow>(
          "facetCounts",
          compileFacetCountsQuerySql(sqlRequest, { visibleFacetValues }),
          branchMetrics
        );
      pageRows = pageSqlRows;

      sqlRoundTrips += await this.profileListingSqlIfEnabled(
        sqlRequest,
        visibleFacetValues
      );

      const page = mapPageRows({ rows: pageSqlRows, request });
      const totalCount = mapTotalCountRows(totalCountRows);
      const facets = mergeFacetCounts({
        facets: mapFacetMetadataRows(facetMetadataRows),
        countsByValueKey: mapFacetCountRows(facetCountRows),
      });
      const virtualFacets = mapVirtualFacetsRows(virtualFacetRows);

      return {
        rows: page.rows,
        hasNextPage: page.hasNextPage,
        totalCount,
        facets,
        priceRange: virtualFacets.priceRange,
        inStockCount: virtualFacets.inStockCount,
        unavailableCount: virtualFacets.unavailableCount,
        userErrors: request.filterPlan.userErrors,
      };
    } finally {
      if (request) {
        this.debugListingQuery({
          storeId: this.storeId,
          scopeKind: request.input.scope.kind,
          normalizedQueryHash: request.normalizedQuery
            ? buildListingFilterHash({
                storeId: this.storeId,
                locale: request.input.locale,
                currency: request.input.currency,
                scope: request.input.scope,
                normalizedQuery: request.normalizedQuery,
                filters: request.filters,
                variantTermGroups: request.filterPlan.variantTermGroups,
                sort: request.sort,
                manualScopeId: request.manualScopeId,
              })
            : null,
          sort: request.sort.kind,
          pageSize: request.input.first,
          requestedFacetValues: request.filters.facetFilters.length,
          vendorFilters: request.filters.vendorIds.length,
          hasPriceFilter: !!request.filters.priceRange,
          hasInStockFilter: request.filters.inStock !== undefined,
          variantTermGroupCount: request.filterPlan.variantTermGroups.length,
          variantTermCount: request.filterPlan.variantTermGroups.reduce(
            (count, group) => count + group.terms.length,
            0
          ),
          termCandidateCardinality:
            variantDiagnostics?.termCandidateCardinality ?? null,
          numericCandidateCardinality:
            variantDiagnostics?.numericCandidateCardinality ?? null,
          finalVariantCandidateCardinality:
            variantDiagnostics?.finalVariantCandidateCardinality ?? null,
          projectedProductCardinality:
            variantDiagnostics?.projectedProductCardinality ?? null,
          snapshotStrategy: "repeatable-read-read-only-sequential",
          selectedCollector:
            pageRows.find((row) => row.collectorKind)?.collectorKind ?? null,
          sqlRoundTrips,
          branchMetrics,
          durationMs: Date.now() - startedAt,
        });
      }
    }
  }

  private async executeMeasured<TRow extends Record<string, unknown>>(
    branch: string,
    query: SQL,
    metrics: BranchMetric[]
  ): Promise<TRow[]> {
    const startedAt = Date.now();
    try {
      const rows = await this.connection.execute<TRow>(query);
      return rows as unknown as TRow[];
    } finally {
      metrics.push({
        branch,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  private async executeMeasuredWithLocalJitOff<
    TRow extends Record<string, unknown>,
  >(branch: string, query: SQL, metrics: BranchMetric[]): Promise<TRow[]> {
    const startedAt = Date.now();
    try {
      return await this.executeWithLocalJitOff<TRow>(query);
    } finally {
      metrics.push({
        branch,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  private async executeWithLocalJitOff<TRow extends Record<string, unknown>>(
    query: SQL
  ): Promise<TRow[]> {
    return await this.txManager.run(async () => {
      await this.connection.execute(sql`SET LOCAL jit = off`);
      const rows = await this.connection.execute<TRow>(query);
      return rows as unknown as TRow[];
    });
  }

  private async profileListingSqlIfEnabled(
    request: ReturnType<typeof toListingSqlRequest>,
    visibleFacetValues: readonly FacetCountsVisibleFacetValue[]
  ): Promise<number> {
    if (!this.facetCountsProfilingEnabled) {
      return 0;
    }

    let roundTrips = 0;
    try {
      const metrics: FacetCountsProfileMetric[] = [];
      for (const target of facetCountsProfileTargetsForRequest(request)) {
        const startedAt = Date.now();
        const rows = await this.executeWithLocalJitOff<FacetCountsProfileSqlRow>(
          compileFacetCountsProfileQuerySql(request, target, {
            visibleFacetValues,
          })
        );
        roundTrips += 1;
        const row = (rows as unknown as FacetCountsProfileSqlRow[])[0];
        metrics.push({
          target,
          durationMs: Date.now() - startedAt,
          rowCount: numberOrNull(row?.rowCount),
          distinctSignatureCount: numberOrNull(row?.distinctSignatureCount),
          bitmapCardinality: numberOrNull(row?.bitmapCardinality),
          countSum: numberOrNull(row?.countSum),
        });
      }

      this.ctx.kernel.getServices().logger.warn(
        {
          storeId: request.storeId,
          scopeKind: request.scopeKind,
          sortKind: request.sortKind,
          hasPriceFilter: request.priceFilterJson !== "{}",
          optionFacetGroups: request.request.filterPlan.optionFacetGroups.length,
          profile: metrics,
        },
        "Storefront listing facetCounts SQL profile"
      );

      const explainSections = await this.explainAnalyzeListingBranches(
        request,
        visibleFacetValues
      );
      roundTrips += explainSections.length;
      await writeE2eExplainAnalyzeReport({
        storeId: request.storeId,
        scopeKind: request.scopeKind,
        sortKind: request.sortKind,
        hasPriceFilter: request.priceFilterJson !== "{}",
        optionFacetGroups: request.request.filterPlan.optionFacetGroups.length,
        sections: explainSections,
      });
      this.ctx.kernel.getServices().logger.warn(
        {
          storeId: request.storeId,
          scopeKind: request.scopeKind,
          sortKind: request.sortKind,
          hasPriceFilter: request.priceFilterJson !== "{}",
          optionFacetGroups: request.request.filterPlan.optionFacetGroups.length,
          explain: explainSections,
        },
        "Storefront listing SQL EXPLAIN ANALYZE"
      );
    } catch (error) {
      this.ctx.kernel.getServices().logger.warn(
        { error },
        "Storefront listing facetCounts SQL profile failed"
      );
    }

    return roundTrips;
  }

  private async explainAnalyzeListingBranches(
    request: ReturnType<typeof toListingSqlRequest>,
    visibleFacetValues: readonly FacetCountsVisibleFacetValue[]
  ): Promise<ExplainAnalyzeReportSection[]> {
    const sections: ExplainAnalyzeReportSection[] = [];
    const branches: {
      branch: string;
      query: SQL;
      jitOff?: boolean;
    }[] = [
      {
        branch: "listing:page",
        query: compilePageQuerySql(request),
      },
      {
        branch: "listing:totalCount",
        query: compileTotalCountQuerySql(request),
      },
      {
        branch: "listing:facetsMetadata",
        query: compileFacetsQuerySql(request),
      },
      {
        branch: "listing:virtualFacets",
        query: compileVirtualFacetsQuerySql(request),
      },
      {
        branch: "listing:facetCounts",
        query: compileFacetCountsQuerySql(request, { visibleFacetValues }),
        jitOff: true,
      },
    ];

    for (const branch of branches) {
      const startedAt = Date.now();
      const plan = await this.explainAnalyzeQuery(branch.query, {
        jitOff: branch.jitOff ?? false,
      });
      sections.push({
        branch: branch.branch,
        durationMs: Date.now() - startedAt,
        plan,
      });
    }

    return sections;
  }

  private async explainAnalyzeQuery(
    query: SQL,
    options: { jitOff: boolean }
  ): Promise<string> {
    const explainQuery = sql`
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      ${query}
    `;
    const rows = options.jitOff
      ? await this.executeWithLocalJitOff<ExplainAnalyzeSqlRow>(explainQuery)
      : await this.connection.execute<ExplainAnalyzeSqlRow>(explainQuery);

    return (rows as unknown as ExplainAnalyzeSqlRow[])
      .map((row) => explainAnalyzePlanLine(row))
      .filter(Boolean)
      .join("\n");
  }

  private async normalize(
    input: StorefrontListingInput
  ): Promise<ResolvedListingRequest> {
    const locale = input.locale.trim();
    const currency = input.currency.trim();
    if (!locale) {
      throw new StorefrontRepositoryValidationError("Locale is required");
    }
    if (!currency) {
      throw new StorefrontRepositoryValidationError("Currency is required");
    }

    const first = normalizePositivePageSize(input.first);
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

    const manualScopeId = this.manualScopeIdFor(input.scope, sort);
    const filters = this.normalizeFilters(input.filters);
    const normalizedFiltersInput = this.toFilterPlanInput(filters);
    const normalizedInput: StorefrontListingInput = {
      ...input,
      locale,
      currency,
      first,
      filters: normalizedFiltersInput,
    };
    const filterPlan = await this.facets.resolveFilterPlan({
      filters: normalizedFiltersInput,
    });
    const cursor = input.after ? decodeListingCursor(input.after) : null;
    const filterHash = buildListingFilterHash({
      storeId: this.storeId,
      locale,
      currency,
      scope: input.scope,
      normalizedQuery,
      filters,
      variantTermGroups: filterPlan.variantTermGroups,
      sort,
      manualScopeId,
    });

    assertCursorMatches(cursor, filterHash, sort.kind);
    return {
      input: normalizedInput,
      filters,
      filterPlan,
      normalizedQuery,
      sort,
      cursor,
      filterHash,
      manualScopeId,
    };
  }

  private normalizeFilters(
    filters: readonly StorefrontListingFilterInput[]
  ): NormalizedStorefrontListingFilters {
    const normalized: NormalizedStorefrontListingFilters = {
      facetFilters: [],
      vendorIds: [],
    };

    for (const filter of filters) {
      switch (filter.kind) {
        case "facet":
          normalized.facetFilters = mergeFacetFilters(
            normalized.facetFilters,
            filter
          );
          break;
        case "vendor":
          normalized.vendorIds = mergeUnique(normalized.vendorIds, filter.vendorIds);
          break;
        case "price":
          normalized.priceRange = this.mergePriceRange(
            normalized.priceRange,
            filter
          );
          break;
        case "in_stock":
          normalized.inStock = this.mergeInStock(
            normalized.inStock,
            filter.value
          );
          break;
      }
    }

    return normalized;
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

  private manualScopeIdFor(
    scope: StorefrontListingScope,
    sort: StorefrontSortInput
  ): string | null {
    if (sort.kind !== "manual") {
      return null;
    }
    switch (scope.kind) {
      case "category":
        return scope.manualSortScopeId ?? scope.categoryId;
      case "search":
        throw new StorefrontRepositoryValidationError(
          "Manual sort requires category scope"
        );
    }
  }

  private mergePriceRange(
    current: NormalizedStorefrontListingFilters["priceRange"],
    next: Extract<StorefrontListingFilterInput, { kind: "price" }>
  ): NormalizedStorefrontListingFilters["priceRange"] {
    this.assertPriceBounds(next, ["filters"]);

    const merged = {
      minPriceMinor:
        current?.minPriceMinor === undefined
          ? next.minPriceMinor
          : next.minPriceMinor === undefined
            ? current.minPriceMinor
            : Math.max(current.minPriceMinor, next.minPriceMinor),
      maxPriceMinor:
        current?.maxPriceMinor === undefined
          ? next.maxPriceMinor
          : next.maxPriceMinor === undefined
            ? current.maxPriceMinor
            : Math.min(current.maxPriceMinor, next.maxPriceMinor),
    };

    if (
      merged.minPriceMinor !== undefined &&
      merged.maxPriceMinor !== undefined &&
      merged.minPriceMinor > merged.maxPriceMinor
    ) {
      throw new StorefrontRepositoryValidationError(
        "Combined price filters produce an invalid range",
        ["filters"]
      );
    }

    return merged;
  }

  private assertPriceBounds(
    input: { minPriceMinor?: number; maxPriceMinor?: number },
    field: readonly string[]
  ): void {
    if (input.minPriceMinor === undefined && input.maxPriceMinor === undefined) {
      throw new StorefrontRepositoryValidationError(
        "Price filter requires at least one bound",
        field
      );
    }
    if (input.minPriceMinor !== undefined) {
      assertNonNegativeSafeInteger(input.minPriceMinor, "minPriceMinor");
    }
    if (input.maxPriceMinor !== undefined) {
      assertNonNegativeSafeInteger(input.maxPriceMinor, "maxPriceMinor");
    }
    if (
      input.minPriceMinor !== undefined &&
      input.maxPriceMinor !== undefined &&
      input.minPriceMinor > input.maxPriceMinor
    ) {
      throw new StorefrontRepositoryValidationError(
        "Price filter min bound must not exceed max bound",
        field
      );
    }
  }

  private mergeInStock(current: boolean | undefined, next: boolean): boolean {
    if (current !== undefined && current !== next) {
      throw new StorefrontRepositoryValidationError(
        "Conflicting in-stock filters",
        ["filters"]
      );
    }
    return next;
  }

  private toFilterPlanInput(
    filters: NormalizedStorefrontListingFilters
  ): StorefrontListingFilterInput[] {
    const facetValueHandlesBySlug = new Map<string, string[]>();
    for (const filter of filters.facetFilters) {
      const valueHandles = facetValueHandlesBySlug.get(filter.facetSlug) ?? [];
      valueHandles.push(filter.valueHandle);
      facetValueHandlesBySlug.set(filter.facetSlug, valueHandles);
    }

    const normalized: StorefrontListingFilterInput[] = [
      ...[...facetValueHandlesBySlug.entries()].map(
        ([facetSlug, valueHandles]) =>
          ({
            kind: "facet",
            facetSlug,
            valueHandles,
          }) satisfies StorefrontListingFilterInput
      ),
    ];

    if (filters.vendorIds.length > 0) {
      normalized.push({ kind: "vendor", vendorIds: [...filters.vendorIds] });
    }
    if (filters.priceRange) {
      normalized.push({ kind: "price", ...filters.priceRange });
    }
    if (filters.inStock !== undefined) {
      normalized.push({ kind: "in_stock", value: filters.inStock });
    }

    return normalized;
  }

  private debugListingQuery(metadata: Record<string, unknown>): void {
    this.ctx.kernel.getServices().logger.debug(
      metadata,
      "Storefront listing query"
    );
  }
}

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toFacetCountsVisibleFacetValues(
  rows: readonly FacetMetadataSqlRow[]
): FacetCountsVisibleFacetValue[] {
  const values = new Map<string, FacetCountsVisibleFacetValue>();
  for (const row of rows) {
    if (!row.facetId || !row.facetType || !row.valueKey) {
      continue;
    }

    values.set(row.valueKey, {
      facetId: row.facetId,
      facetType: row.facetType,
      valueKey: row.valueKey,
    });
  }

  return [...values.values()];
}

function explainAnalyzePlanLine(row: ExplainAnalyzeSqlRow): string {
  const directValue = row["QUERY PLAN"];
  if (typeof directValue === "string") {
    return directValue;
  }

  const firstStringValue = Object.values(row).find(
    (value): value is string => typeof value === "string"
  );

  return firstStringValue ?? "";
}

async function writeE2eExplainAnalyzeReport(input: {
  storeId: string;
  scopeKind: string;
  sortKind: string;
  hasPriceFilter: boolean;
  optionFacetGroups: number;
  sections: readonly ExplainAnalyzeReportSection[];
}) {
  const reportPath = e2eExplainAnalyzeReportPath();
  if (!reportPath) {
    return;
  }

  const generatedAt = new Date().toISOString();
  const metadata = {
    generatedAt,
    storeId: input.storeId,
    scopeKind: input.scopeKind,
    sortKind: input.sortKind,
    hasPriceFilter: input.hasPriceFilter,
    optionFacetGroups: input.optionFacetGroups,
    durations: Object.fromEntries(
      input.sections.map((section) => [section.branch, section.durationMs])
    ),
  };
  const sectionLines = input.sections.flatMap((section) => [
    `### ${section.branch}`,
    "",
    "```",
    section.plan,
    "```",
    "",
  ]);

  await mkdir(dirname(reportPath), { recursive: true });
  const includeHeader = !existsSync(reportPath);
  await appendFile(
    reportPath,
    [
      ...(includeHeader
        ? ["# Storefront listing SQL EXPLAIN ANALYZE", ""]
        : []),
      `## Listing request ${generatedAt}`,
      "",
      "```json",
      JSON.stringify(metadata, null, 2),
      "```",
      "",
      ...sectionLines,
    ].join("\n") + "\n"
  );
}

function e2eExplainAnalyzeReportPath(): string | null {
  if (process.env.E2E_LISTING_PERF_EXPLAIN_ANALYZE_PATH) {
    return resolve(process.env.E2E_LISTING_PERF_EXPLAIN_ANALYZE_PATH);
  }

  return resolve(
    servicesRootDir(),
    "e2e/test-results/listing-perf/price-facet-10k-explain-analyze.txt"
  );
}

function servicesRootDir(): string {
  let current = process.cwd();
  while (dirname(current) !== current) {
    if (
      existsSync(resolve(current, "e2e")) &&
      existsSync(resolve(current, "services"))
    ) {
      return current;
    }

    current = dirname(current);
  }

  return process.cwd();
}

function mergeFacetFilters(
  current: readonly NormalizedStorefrontFacetFilter[],
  filter: Extract<StorefrontListingFilterInput, { kind: "facet" }>
): NormalizedStorefrontFacetFilter[] {
  const facetSlug = filter.facetSlug.trim();
  if (!facetSlug) {
    return [...current];
  }

  const next = filter.valueHandles
    .map((valueHandle) => valueHandle.trim())
    .filter(Boolean)
    .map((valueHandle) => ({ facetSlug, valueHandle }));
  const seen = new Set<string>();

  return [...current, ...next].filter((value) => {
    const key = `${value.facetSlug}:${value.valueHandle}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mergeUnique(
  current: readonly string[],
  next: readonly string[]
): string[] {
  return [
    ...new Set([
      ...current.map((value) => value.trim()).filter(Boolean),
      ...next.map((value) => value.trim()).filter(Boolean),
    ]),
  ];
}
