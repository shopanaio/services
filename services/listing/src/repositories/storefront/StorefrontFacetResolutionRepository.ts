import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { facet, facetValue } from "../models/index.js";
import type {
  FacetRuntimeType,
  ResolvedFacetFilterGroup,
  ResolvedFacetValue,
  StorefrontFilterPlan,
  StorefrontListingFilterInput,
  StorefrontListingScope,
} from "./types.js";
import { StorefrontRepositoryValidationError } from "./types.js";
import { assertNonNegativeSafeInteger } from "./sqlHelpers.js";

interface FacetResolutionSqlRow extends Record<string, unknown> {
  facetSlug: string;
  requestedValueHandle: string;
  facetId: string;
  facetType: string;
  facetValueId: string;
  valueHandle: string;
  valueKey: string;
}

interface FacetValueSqlRow extends Record<string, unknown> {
  facetId: string;
  facetSlug: string;
  facetType: string;
  facetValueId: string;
  valueHandle: string;
  valueKey: string;
}

interface InvalidFacetResolutionSqlRow extends Record<string, unknown> {
  facetSlug: string;
  requestedValueHandle: string;
  facetExists: boolean;
  valueExists: boolean;
  valueKind: string | null;
  valueEnabled: boolean | null;
  valueReferenceStatus: string | null;
  parentValueExists: boolean | null;
  parentValueEnabled: boolean | null;
  parentValueReferenceStatus: string | null;
}

export class StorefrontFacetResolutionRepository extends BaseRepository {
  @ReadOnly()
  async resolveFilterPlan(input: {
    filters: StorefrontListingFilterInput[];
  }): Promise<StorefrontFilterPlan> {
    const plan: StorefrontFilterPlan = {
      productFacetGroups: [],
      optionFacetGroups: [],
      vendorIds: [],
    };

    const facetFilters = input.filters.filter(
      (filter): filter is Extract<StorefrontListingFilterInput, { kind: "facet" }> =>
        filter.kind === "facet"
    );

    const resolvedFacetRows = await this.resolveFacetFilters(facetFilters);
    const resolvedByRequest = new Map(
      resolvedFacetRows.map((row) => [
        `${row.facetSlug}:${row.requestedValueHandle}`,
        row,
      ])
    );

    for (const filter of input.filters) {
      switch (filter.kind) {
        case "facet":
          this.addFacetFilterGroup(plan, filter, resolvedByRequest);
          break;
        case "vendor":
          plan.vendorIds = this.mergeUnique(plan.vendorIds, filter.vendorIds);
          break;
        case "price":
          plan.priceRange = this.mergePriceRange(plan.priceRange, filter);
          break;
        case "in_stock":
          plan.inStock = this.mergeInStock(plan.inStock, filter.value);
          break;
      }
    }

    return plan;
  }

  @ReadOnly()
  async getFacetValues(input: {
    scope: StorefrontListingScope;
    locale: string;
    currency: string;
    requestedFacetIds?: string[];
  }): Promise<ResolvedFacetValue[]> {
    const requestedFacetIds = this.mergeUnique([], input.requestedFacetIds ?? []);
    const facetFilter =
      requestedFacetIds.length > 0
        ? sql`AND candidate_values.facet_id IN (${sql.join(
            requestedFacetIds.map((facetId) => sql`${facetId}::uuid`),
            sql`, `
          )})`
        : sql``;
    const scopeProductBitmapSql = this.buildScopeProductBitmapSql(input.scope);

    const rows = await this.connection.execute<FacetValueSqlRow>(sql`
      WITH scope_products AS (
        SELECT ${scopeProductBitmapSql} AS product_bitmap
      ),
      scope_variants AS (
        SELECT ${coalesceScopeBitmapSql(sql`(
          SELECT rb_build_agg(vli.variant_doc_id)
          FROM listing.variant_listing_index vli
          CROSS JOIN scope_products sp
          WHERE vli.store_id = ${this.storeId}::uuid
            AND vli.in_stock = true
            AND sp.product_bitmap @> vli.product_doc_id
        )`)} AS variant_bitmap
      ),
      candidate_values AS (
        SELECT DISTINCT
          split_part(p.value_key, ':', 1)::uuid AS facet_id,
          split_part(p.value_key, ':', 2)::uuid AS facet_value_id
        FROM listing.listing_posting_bitmap p
        CROSS JOIN scope_products sp
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'product'
          AND p.field = 'facet'
          AND rb_cardinality(sp.product_bitmap & p.bitmap) > 0

        UNION

        SELECT DISTINCT
          split_part(p.value_key, ':', 1)::uuid AS facet_id,
          split_part(p.value_key, ':', 2)::uuid AS facet_value_id
        FROM listing.listing_posting_bitmap p
        CROSS JOIN scope_variants sv
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'variant'
          AND p.field = 'facet'
          AND rb_cardinality(sv.variant_bitmap & p.bitmap) > 0
      )
      SELECT
        f.id::text AS "facetId",
        f.slug AS "facetSlug",
        f.facet_type AS "facetType",
        fv.id::text AS "facetValueId",
        fv.handle AS "valueHandle",
        f.id::text || ':' || fv.id::text AS "valueKey"
      FROM candidate_values
      JOIN ${facet} f
        ON f.store_id = ${this.storeId}::uuid
       AND f.id = candidate_values.facet_id
      JOIN ${facetValue} fv
        ON fv.store_id = f.store_id
       AND fv.facet_id = f.id
       AND fv.id = candidate_values.facet_value_id
      WHERE true
        ${facetFilter}
      ORDER BY f.lexo_rank ASC, f.id ASC, fv.id ASC
    `);

    return rows.map((row) => this.toResolvedFacetValue(row));
  }

  private buildScopeProductBitmapSql(scope: StorefrontListingScope): SQL {
    switch (scope.kind) {
      case "category":
        return this.productPostingScopeBitmapSql("category", scope.categoryId);
      case "search":
        return this.publishedProductBitmapSql();
    }
  }

  private productPostingScopeBitmapSql(field: "category", valueKey: string): SQL {
    return sql`(
      ${this.publishedProductBitmapSql()}
      & ${coalesceScopeBitmapSql(sql`(
        SELECT p.bitmap
        FROM listing.listing_posting_bitmap p
        WHERE p.store_id = ${this.storeId}::uuid
          AND p.entity_type = 'product'
          AND p.field = ${field}
          AND p.value_key = ${valueKey}
      )`)}
    )`;
  }

  private publishedProductBitmapSql(): SQL {
    return coalesceScopeBitmapSql(sql`(
      SELECT rb_build_agg(pli.product_doc_id)
      FROM listing.product_listing_index pli
      WHERE pli.store_id = ${this.storeId}::uuid
        AND pli.status = 'published'
    )`);
  }

  private async resolveFacetFilters(
    filters: readonly Extract<StorefrontListingFilterInput, { kind: "facet" }>[]
  ): Promise<FacetResolutionSqlRow[]> {
    const pairs = filters.flatMap((filter) => {
      const slug = filter.facetSlug.trim();
      return this.mergeUnique([], filter.valueHandles).map((valueHandle) => ({
        facetSlug: slug,
        valueHandle,
      }));
    });

    if (pairs.length === 0) {
      return [];
    }

    const valuesSql = sql.join(
      pairs.map(
        (pair) => sql`(${pair.facetSlug}, ${pair.valueHandle})`
      ),
      sql`, `
    );

    const rows = await this.connection.execute<FacetResolutionSqlRow>(sql`
      WITH requested(facet_slug, value_handle) AS (
        VALUES ${valuesSql}
      ),
      resolved AS (
        SELECT
          r.facet_slug AS "facetSlug",
          r.value_handle AS "requestedValueHandle",
          f.id::text AS "facetId",
          f.facet_type AS "facetType",
          COALESCE(parent_fv.id, fv.id)::text AS "facetValueId",
          COALESCE(parent_fv.handle, fv.handle) AS "valueHandle",
          f.id::text || ':' || COALESCE(parent_fv.id, fv.id)::text AS "valueKey",
          fv.parent_id IS NULL AS is_root,
          fv.kind = 'display' AS is_display
        FROM requested r
        JOIN ${facet} f
          ON f.store_id = ${this.storeId}::uuid
         AND f.slug = r.facet_slug
        JOIN ${facetValue} fv
          ON fv.store_id = f.store_id
         AND fv.facet_id = f.id
         AND fv.handle = r.value_handle
        LEFT JOIN ${facetValue} parent_fv
          ON parent_fv.store_id = fv.store_id
         AND parent_fv.id = fv.parent_id
         AND parent_fv.kind = 'display'
         AND parent_fv.parent_id IS NULL
         AND parent_fv.enabled = true
         AND parent_fv.reference_status = 'VALID'
        WHERE (
            fv.kind = 'display'
            AND fv.parent_id IS NULL
            AND fv.enabled = true
            AND fv.reference_status = 'VALID'
          )
          OR (
            fv.kind = 'source'
            AND fv.enabled = true
            AND parent_fv.id IS NOT NULL
          )
      )
      SELECT DISTINCT ON ("facetSlug", "requestedValueHandle")
        "facetSlug",
        "requestedValueHandle",
        "facetId",
        "facetType",
        "facetValueId",
        "valueHandle",
        "valueKey"
      FROM resolved
      ORDER BY
        "facetSlug",
        "requestedValueHandle",
        is_root DESC,
        is_display DESC,
        "facetValueId" ASC
    `);

    const rowKeys = new Set(
      rows.map((row) => `${row.facetSlug}:${row.requestedValueHandle}`)
    );
    const missing = pairs.filter(
      (pair) => !rowKeys.has(`${pair.facetSlug}:${pair.valueHandle}`)
    );
    if (missing.length > 0) {
      const message = await this.invalidFacetValueMessage(missing[0]);
      throw new StorefrontRepositoryValidationError(
        message,
        ["filters"]
      );
    }

    return rows;
  }

  private async invalidFacetValueMessage(input: {
    facetSlug: string;
    valueHandle: string;
  }): Promise<string> {
    const rows = await this.connection.execute<InvalidFacetResolutionSqlRow>(sql`
      WITH requested(facet_slug, value_handle) AS (
        VALUES (${input.facetSlug}, ${input.valueHandle})
      )
      SELECT
        r.facet_slug AS "facetSlug",
        r.value_handle AS "requestedValueHandle",
        f.id IS NOT NULL AS "facetExists",
        fv.id IS NOT NULL AS "valueExists",
        fv.kind AS "valueKind",
        fv.enabled AS "valueEnabled",
        fv.reference_status AS "valueReferenceStatus",
        CASE WHEN fv.kind = 'source' THEN parent_fv.id IS NOT NULL ELSE NULL END AS "parentValueExists",
        parent_fv.enabled AS "parentValueEnabled",
        parent_fv.reference_status AS "parentValueReferenceStatus"
      FROM requested r
      LEFT JOIN ${facet} f
        ON f.store_id = ${this.storeId}::uuid
       AND f.slug = r.facet_slug
      LEFT JOIN ${facetValue} fv
        ON fv.store_id = f.store_id
       AND fv.facet_id = f.id
       AND fv.handle = r.value_handle
      LEFT JOIN ${facetValue} parent_fv
        ON parent_fv.store_id = fv.store_id
       AND parent_fv.id = fv.parent_id
       AND parent_fv.kind = 'display'
       AND parent_fv.parent_id IS NULL
      LIMIT 1
    `);

    const row = rows[0];
    const filterName = `${input.facetSlug}:${input.valueHandle}`;
    if (!row?.facetExists) {
      return `Invalid storefront facet filter ${filterName}: facet does not exist`;
    }
    if (!row.valueExists) {
      return `Invalid storefront facet filter ${filterName}: value does not exist`;
    }

    const reason = invalidFacetValueReason(row);
    return `Invalid storefront facet filter ${filterName}: ${reason}`;
  }

  private addFacetFilterGroup(
    plan: StorefrontFilterPlan,
    filter: Extract<StorefrontListingFilterInput, { kind: "facet" }>,
    resolvedByRequest: ReadonlyMap<string, FacetResolutionSqlRow>
  ): void {
    const valueHandles = this.mergeUnique([], filter.valueHandles);
    if (valueHandles.length === 0) {
      return;
    }

    const rows = valueHandles.map((valueHandle) => {
      const row = resolvedByRequest.get(`${filter.facetSlug}:${valueHandle}`);
      if (!row) {
        throw new StorefrontRepositoryValidationError(
          `Unknown storefront facet value: ${filter.facetSlug}:${valueHandle}`,
          ["filters"]
        );
      }
      return row;
    });

    const first = rows[0];
    const facetType = this.assertFacetRuntimeType(first.facetType);
    const valueKeys = this.mergeUnique(
      [],
      rows.map((row) => row.valueKey)
    );

    if (facetType === "TAG" || facetType === "FEATURE") {
      this.upsertGroup(plan.productFacetGroups, {
        facetId: first.facetId,
        facetType,
        valueKeys,
      });
      return;
    }

    if (facetType === "OPTION") {
      this.upsertGroup(plan.optionFacetGroups, {
        facetId: first.facetId,
        facetType,
        valueKeys,
      });
      return;
    }

    if (facetType === "IN_STOCK") {
      const next = this.parseInStockHandle(rows[0].valueHandle);
      plan.inStock = this.mergeInStock(plan.inStock, next);
      return;
    }

    throw new StorefrontRepositoryValidationError(
      "PRICE facet filters must use price range input",
      ["filters"]
    );
  }

  private upsertGroup(
    groups: ResolvedFacetFilterGroup[],
    group: ResolvedFacetFilterGroup
  ): void {
    const existing = groups.find((item) => item.facetId === group.facetId);
    if (!existing) {
      groups.push(group);
      return;
    }
    existing.valueKeys = this.mergeUnique(existing.valueKeys, group.valueKeys);
  }

  private mergePriceRange(
    current: StorefrontFilterPlan["priceRange"],
    next: Extract<StorefrontListingFilterInput, { kind: "price" }>
  ): StorefrontFilterPlan["priceRange"] {
    if (next.minPriceMinor === undefined && next.maxPriceMinor === undefined) {
      throw new StorefrontRepositoryValidationError(
        "Price filter requires at least one bound",
        ["filters"]
      );
    }
    if (next.minPriceMinor !== undefined) {
      assertNonNegativeSafeInteger(next.minPriceMinor, "minPriceMinor");
    }
    if (next.maxPriceMinor !== undefined) {
      assertNonNegativeSafeInteger(next.maxPriceMinor, "maxPriceMinor");
    }
    if (
      next.minPriceMinor !== undefined &&
      next.maxPriceMinor !== undefined &&
      next.minPriceMinor > next.maxPriceMinor
    ) {
      throw new StorefrontRepositoryValidationError(
        "Price filter min bound must not exceed max bound",
        ["filters"]
      );
    }

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

  private mergeInStock(current: boolean | undefined, next: boolean): boolean {
    if (current !== undefined && current !== next) {
      throw new StorefrontRepositoryValidationError(
        "Conflicting in-stock filters",
        ["filters"]
      );
    }
    return next;
  }

  private mergeUnique(current: readonly string[], next: readonly string[]): string[] {
    return [
      ...new Set([
        ...current.map((value) => value.trim()).filter(Boolean),
        ...next.map((value) => value.trim()).filter(Boolean),
      ]),
    ];
  }

  private parseInStockHandle(handle: string): boolean {
    const normalized = handle.trim().toLowerCase();
    if (["true", "1", "yes", "in_stock", "available"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "out_of_stock", "unavailable"].includes(normalized)) {
      return false;
    }
    throw new StorefrontRepositoryValidationError(
      "IN_STOCK facet value must be boolean-like",
      ["filters"]
    );
  }

  private toResolvedFacetValue(row: FacetValueSqlRow): ResolvedFacetValue {
    const facetType = this.assertFacetRuntimeType(row.facetType);
    return {
      facetId: row.facetId,
      facetSlug: row.facetSlug,
      facetType,
      facetValueId: row.facetValueId,
      valueHandle: row.valueHandle,
      valueKey: row.valueKey,
    };
  }

  private assertFacetRuntimeType(value: string): FacetRuntimeType {
    if (
      value === "TAG" ||
      value === "FEATURE" ||
      value === "OPTION" ||
      value === "PRICE" ||
      value === "IN_STOCK"
    ) {
      return value;
    }
    throw new StorefrontRepositoryValidationError(
      `Unsupported facet type: ${value}`,
      ["filters"]
    );
  }
}

function emptyScopeBitmapSql(): SQL {
  return sql`(
    SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
    FROM (VALUES (0)) AS empty_bitmap_seed(empty_doc_id)
  )`;
}

function coalesceScopeBitmapSql(value: SQL): SQL {
  return sql`COALESCE(${value}, ${emptyScopeBitmapSql()})`;
}

function invalidFacetValueReason(row: InvalidFacetResolutionSqlRow): string {
  if (row.valueKind === "display") {
    if (row.valueEnabled === false) {
      return "display value is disabled";
    }
    if (row.valueReferenceStatus !== "VALID") {
      return `display value reference status is ${row.valueReferenceStatus ?? "unknown"}`;
    }
    return "display value is not a valid root storefront value";
  }

  if (row.valueKind === "source") {
    if (row.valueEnabled === false) {
      return "source value is disabled";
    }
    if (row.valueReferenceStatus !== "VALID") {
      return `source value reference status is ${row.valueReferenceStatus ?? "unknown"}`;
    }
    if (row.parentValueExists === false) {
      return "source value is not mapped to a display value";
    }
    if (row.parentValueEnabled === false) {
      return "source value parent display value is disabled";
    }
    if (row.parentValueReferenceStatus !== "VALID") {
      return `source value parent display value reference status is ${
        row.parentValueReferenceStatus ?? "unknown"
      }`;
    }
    return "source value is not mapped to a valid storefront display value";
  }

  return `unsupported facet value kind ${row.valueKind ?? "unknown"}`;
}
