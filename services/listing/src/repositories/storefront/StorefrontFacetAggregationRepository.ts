import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { listingPostingBitmap } from "../models/index.js";
import {
  andBitmapExpr,
  coalesceBitmapSql,
  emptyBitmapExpr,
  literalBitmapExpr,
  orBitmapExpr,
} from "./sqlHelpers.js";
import type {
  BitmapExpr,
  CountSqlRow,
  FacetCountResult,
  FacetRuntimeType,
  PriceRangeResult,
  PriceRangeSqlRow,
  ResolvedFacetFilterGroup,
  ResolvedFacetValue,
  RoaringBitmapSqlValue,
} from "./types.js";

export class StorefrontFacetAggregationRepository extends BaseRepository {
  @ReadOnly()
  async countProducts(input: { matchesBitmap: BitmapExpr }): Promise<number> {
    if (input.matchesBitmap.empty) {
      return 0;
    }

    return this.countBitmap(input.matchesBitmap.sql);
  }

  @ReadOnly()
  async countProductFacetValues(input: {
    productBaseBitmap: BitmapExpr;
    activeProductGroups: readonly ResolvedFacetFilterGroup[];
    facetValues: readonly ResolvedFacetValue[];
  }): Promise<FacetCountResult[]> {
    const values = input.facetValues.filter((value) =>
      this.isProductFacetType(value.facetType)
    );
    if (values.length === 0 || input.productBaseBitmap.empty) {
      return values.map((value) => this.zeroCount(value));
    }

    const activeBitmaps = await this.loadFacetGroupBitmaps(
      "product",
      input.activeProductGroups
    );
    const valueBitmaps = await this.loadPostingBitmapMap(
      "product",
      values.map((value) => value.valueKey)
    );

    const counts: FacetCountResult[] = [];
    for (const value of values) {
      const valueBitmap = valueBitmaps.get(value.valueKey);
      if (!valueBitmap) {
        counts.push(this.zeroCount(value));
        continue;
      }

      const isolated = this.buildIsolatedProductBitmap(
        input.productBaseBitmap,
        input.activeProductGroups,
        activeBitmaps,
        value.facetId
      );
      if (isolated.empty) {
        counts.push(this.zeroCount(value));
        continue;
      }

      const count = await this.countBitmap(
        sql`(${isolated.sql} & ${literalBitmapExpr(valueBitmap, value.valueKey).sql})`
      );
      counts.push({
        facetId: value.facetId,
        facetType: value.facetType,
        valueKey: value.valueKey,
        count,
      });
    }

    return counts;
  }

  @ReadOnly()
  async countOptionFacetValues(input: {
    productBaseBitmap: BitmapExpr;
    activeOptionGroups: readonly ResolvedFacetFilterGroup[];
    priceVariantBitmap?: BitmapExpr | null;
    inStockVariantBitmap: BitmapExpr;
    facetValues: readonly ResolvedFacetValue[];
  }): Promise<FacetCountResult[]> {
    const values = input.facetValues.filter((value) => value.facetType === "OPTION");
    if (
      values.length === 0 ||
      input.productBaseBitmap.empty ||
      input.inStockVariantBitmap.empty ||
      input.priceVariantBitmap?.empty
    ) {
      return values.map((value) => this.zeroCount(value));
    }

    const activeBitmaps = await this.loadFacetGroupBitmaps(
      "variant",
      input.activeOptionGroups
    );
    const valueBitmaps = await this.loadPostingBitmapMap(
      "variant",
      values.map((value) => value.valueKey)
    );

    const counts: FacetCountResult[] = [];
    for (const value of values) {
      const valueBitmap = valueBitmaps.get(value.valueKey);
      if (!valueBitmap) {
        counts.push(this.zeroCount(value));
        continue;
      }

      const variantParts: BitmapExpr[] = [input.inStockVariantBitmap];
      const optionBase = this.buildIsolatedGroupBitmap(
        input.activeOptionGroups,
        activeBitmaps,
        value.facetId
      );
      if (optionBase?.empty) {
        counts.push(this.zeroCount(value));
        continue;
      }
      if (optionBase) {
        variantParts.push(optionBase);
      }
      if (input.priceVariantBitmap) {
        variantParts.push(input.priceVariantBitmap);
      }
      variantParts.push(literalBitmapExpr(valueBitmap, value.valueKey));

      const variantBitmap = andBitmapExpr(variantParts);
      const projected = this.projectVariantBitmapSql(variantBitmap.sql);
      const count = await this.countBitmap(
        sql`(${projected} & ${input.productBaseBitmap.sql})`
      );

      counts.push({
        facetId: value.facetId,
        facetType: value.facetType,
        valueKey: value.valueKey,
        count,
      });
    }

    return counts;
  }

  @ReadOnly()
  async getPriceRange(input: {
    productBaseBitmap: BitmapExpr;
    activeOptionGroups: readonly ResolvedFacetFilterGroup[];
    activeProductGroups: readonly ResolvedFacetFilterGroup[];
    currency: string;
    excludeActivePrice: boolean;
  }): Promise<PriceRangeResult | null> {
    if (input.productBaseBitmap.empty) {
      return null;
    }

    const productGroups = await this.loadFacetGroupBitmaps(
      "product",
      input.activeProductGroups
    );
    const productBitmap = this.buildProductBaseWithGroups(
      input.productBaseBitmap,
      input.activeProductGroups,
      productGroups
    );
    if (productBitmap.empty) {
      return null;
    }

    const optionGroups = await this.loadFacetGroupBitmaps(
      "variant",
      input.activeOptionGroups
    );
    const variantBitmap = this.buildGroupBitmap(
      input.activeOptionGroups,
      optionGroups
    );
    if (variantBitmap?.empty) {
      return null;
    }

    const variantPredicate = variantBitmap
      ? sql`AND ${variantBitmap.sql} @> vp.variant_doc_id`
      : sql``;

    const rows = await this.connection.execute<PriceRangeSqlRow>(sql`
      SELECT
        MIN(vp.price_minor)::double precision AS "minPriceMinor",
        MAX(vp.price_minor)::double precision AS "maxPriceMinor"
      FROM listing.listing_posting_variant_price vp
      JOIN listing.variant_listing_index vli
        ON vli.project_id = vp.project_id
       AND vli.variant_doc_id = vp.variant_doc_id
       AND vli.product_doc_id = vp.product_doc_id
       AND vli.product_id = vp.product_id
       AND vli.in_stock = true
      WHERE vp.project_id = ${this.storeId}::uuid
        AND vp.currency = ${input.currency}
        AND ${productBitmap.sql} @> vp.product_doc_id
        ${variantPredicate}
    `);

    const row = rows[0];
    if (!row || row.minPriceMinor === null || row.maxPriceMinor === null) {
      return null;
    }

    return {
      minPriceMinor: row.minPriceMinor,
      maxPriceMinor: row.maxPriceMinor,
      currency: input.currency,
    };
  }

  @ReadOnly()
  async countInStock(input: {
    productBaseBitmap: BitmapExpr;
    activeProductGroups: readonly ResolvedFacetFilterGroup[];
    activeOptionGroups: readonly ResolvedFacetFilterGroup[];
    priceVariantBitmap?: BitmapExpr | null;
  }): Promise<number> {
    if (input.productBaseBitmap.empty || input.priceVariantBitmap?.empty) {
      return 0;
    }

    const productGroups = await this.loadFacetGroupBitmaps(
      "product",
      input.activeProductGroups
    );
    const productBitmap = this.buildProductBaseWithGroups(
      input.productBaseBitmap,
      input.activeProductGroups,
      productGroups
    );
    if (productBitmap.empty) {
      return 0;
    }

    if (input.activeOptionGroups.length > 0 || input.priceVariantBitmap) {
      const optionGroups = await this.loadFacetGroupBitmaps(
        "variant",
        input.activeOptionGroups
      );
      const optionBitmap = this.buildGroupBitmap(
        input.activeOptionGroups,
        optionGroups
      );
      if (optionBitmap?.empty) {
        return 0;
      }

      const inStockVariantBitmap = {
        sql: coalesceBitmapSql(sql`(
          SELECT rb_build_agg(vli.variant_doc_id)
          FROM listing.variant_listing_index vli
          WHERE vli.project_id = ${this.storeId}::uuid
            AND vli.in_stock = true
        )`),
        empty: false,
        source: "aggregation-in-stock-variants",
      };
      const variantParts = [inStockVariantBitmap];
      if (optionBitmap) {
        variantParts.push(optionBitmap);
      }
      if (input.priceVariantBitmap) {
        variantParts.push(input.priceVariantBitmap);
      }

      const projected = this.projectVariantBitmapSql(andBitmapExpr(variantParts).sql);
      return this.countBitmap(sql`(${projected} & ${productBitmap.sql})`);
    }

    const rows = await this.connection.execute<CountSqlRow>(sql`
      SELECT rb_cardinality(
        ${productBitmap.sql}
        & ${coalesceBitmapSql(sql`(
          SELECT rb_build_agg(pli.product_doc_id)
          FROM listing.product_listing_index pli
          WHERE pli.project_id = ${this.storeId}::uuid
            AND pli.status = 'published'
            AND pli.in_stock = true
        )`)}
      )::int AS "count"
    `);

    return rows[0]?.count ?? 0;
  }

  private async countBitmap(bitmapSql: SQL): Promise<number> {
    const rows = await this.connection.execute<CountSqlRow>(sql`
      SELECT rb_cardinality(${bitmapSql})::int AS "count"
    `);
    return rows[0]?.count ?? 0;
  }

  private async loadFacetGroupBitmaps(
    entityType: "product" | "variant",
    groups: readonly ResolvedFacetFilterGroup[]
  ): Promise<Map<string, RoaringBitmapSqlValue>> {
    return this.loadPostingBitmapMap(
      entityType,
      groups.flatMap((group) => group.valueKeys)
    );
  }

  private async loadPostingBitmapMap(
    entityType: "product" | "variant",
    valueKeys: readonly string[]
  ): Promise<Map<string, RoaringBitmapSqlValue>> {
    const uniqueValueKeys = [...new Set(valueKeys)].filter(Boolean);
    if (uniqueValueKeys.length === 0) {
      return new Map();
    }

    const rows = await this.connection
      .select({
        valueKey: listingPostingBitmap.valueKey,
        bitmap: listingPostingBitmap.bitmap,
      })
      .from(listingPostingBitmap)
      .where(
        and(
          eq(listingPostingBitmap.projectId, this.storeId),
          eq(listingPostingBitmap.entityType, entityType),
          eq(listingPostingBitmap.field, "facet"),
          inArray(listingPostingBitmap.valueKey, uniqueValueKeys)
        )
      );

    return new Map(rows.map((row) => [row.valueKey, row.bitmap]));
  }

  private buildProductBaseWithGroups(
    base: BitmapExpr,
    groups: readonly ResolvedFacetFilterGroup[],
    loaded: ReadonlyMap<string, RoaringBitmapSqlValue>
  ): BitmapExpr {
    const groupBitmap = this.buildGroupBitmap(groups, loaded);
    if (!groupBitmap) {
      return base;
    }
    if (groupBitmap.empty) {
      return emptyBitmapExpr(`product-base:${groupBitmap.source}`);
    }
    return andBitmapExpr([base, groupBitmap]);
  }

  private buildIsolatedProductBitmap(
    base: BitmapExpr,
    groups: readonly ResolvedFacetFilterGroup[],
    loaded: ReadonlyMap<string, RoaringBitmapSqlValue>,
    excludedFacetId: string
  ): BitmapExpr {
    const groupBitmap = this.buildIsolatedGroupBitmap(
      groups,
      loaded,
      excludedFacetId
    );
    if (!groupBitmap) {
      return base;
    }
    if (groupBitmap.empty) {
      return emptyBitmapExpr(`isolated-product:${groupBitmap.source}`);
    }
    return andBitmapExpr([base, groupBitmap]);
  }

  private buildGroupBitmap(
    groups: readonly ResolvedFacetFilterGroup[],
    loaded: ReadonlyMap<string, RoaringBitmapSqlValue>
  ): BitmapExpr | null {
    return this.buildIsolatedGroupBitmap(groups, loaded, null);
  }

  private buildIsolatedGroupBitmap(
    groups: readonly ResolvedFacetFilterGroup[],
    loaded: ReadonlyMap<string, RoaringBitmapSqlValue>,
    excludedFacetId: string | null
  ): BitmapExpr | null {
    const groupBitmaps = groups
      .filter((group) => group.facetId !== excludedFacetId)
      .map((group) => {
        const valueBitmaps = group.valueKeys.flatMap((valueKey) => {
          const bitmap = loaded.get(valueKey);
          return bitmap ? [literalBitmapExpr(bitmap, valueKey)] : [];
        });
        return valueBitmaps.length > 0
          ? orBitmapExpr(valueBitmaps)
          : emptyBitmapExpr(`missing-group:${group.facetId}`);
      });

    if (groupBitmaps.length === 0) {
      return null;
    }
    return andBitmapExpr(groupBitmaps);
  }

  private projectVariantBitmapSql(variantBitmapSql: SQL): SQL {
    return coalesceBitmapSql(sql`(
      WITH matched_blocks AS (
        SELECT
          b.variant_doc_from,
          b.variant_doc_to,
          b.variant_bitmap,
          b.product_bitmap,
          b.variant_count,
          (${variantBitmapSql} & b.variant_bitmap) AS block_match
        FROM listing.listing_posting_variant_projection_block b
        WHERE b.project_id = ${this.storeId}::uuid
          AND rb_cardinality(${variantBitmapSql} & b.variant_bitmap) > 0
      ),
      full_block_products AS (
        SELECT mb.product_bitmap
        FROM matched_blocks mb
        WHERE rb_cardinality(mb.block_match) = mb.variant_count
      ),
      partial_block_products AS (
        SELECT rb_build_agg(vli.product_doc_id) AS product_bitmap
        FROM matched_blocks mb
        JOIN listing.variant_listing_index vli
          ON vli.project_id = ${this.storeId}::uuid
         AND vli.variant_doc_id >= mb.variant_doc_from
         AND vli.variant_doc_id < mb.variant_doc_to
        WHERE rb_cardinality(mb.block_match) < mb.variant_count
          AND mb.block_match @> vli.variant_doc_id
      ),
      projected AS (
        SELECT rb_or_agg(product_bitmap) AS product_bitmap
        FROM (
          SELECT product_bitmap FROM full_block_products
          UNION ALL
          SELECT product_bitmap FROM partial_block_products
        ) x
      )
      SELECT product_bitmap
      FROM projected
    )`);
  }

  private isProductFacetType(facetType: FacetRuntimeType): boolean {
    return facetType === "TAG" || facetType === "FEATURE";
  }

  private zeroCount(value: ResolvedFacetValue): FacetCountResult {
    return {
      facetId: value.facetId,
      facetType: value.facetType,
      valueKey: value.valueKey,
      count: 0,
    };
  }
}
