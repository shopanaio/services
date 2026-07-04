import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  assertNonNegativeSafeInteger,
  coalesceBitmapSql,
  normalizePositivePageSize,
} from "./sqlHelpers.js";
import { StorefrontRepositoryValidationError } from "./types.js";
import type {
  BitmapExpr,
  DecodedListingCursor,
  ListingPageCollectResult,
  ListingPageRow,
  VariantPricePageSqlRow,
} from "./types.js";

export class StorefrontVariantPriceCollectorRepository extends BaseRepository {
  @ReadOnly()
  async buildPriceRangeVariantBitmap(input: {
    currency: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
  }): Promise<BitmapExpr> {
    this.validatePriceRange(input);

    const minPredicate =
      input.minPriceMinor !== undefined
        ? sql`AND vp.price_minor >= ${input.minPriceMinor}`
        : sql``;
    const maxPredicate =
      input.maxPriceMinor !== undefined
        ? sql`AND vp.price_minor <= ${input.maxPriceMinor}`
        : sql``;

    return {
      sql: coalesceBitmapSql(sql`(
        SELECT rb_build_agg(vp.variant_doc_id)
        FROM listing.variant_listing_price_index vp
        JOIN listing.variant_listing_index vli
          ON vli.project_id = vp.project_id
         AND vli.variant_id = vp.variant_id
         AND vli.in_stock = true
        WHERE vp.project_id = ${this.storeId}::uuid
          AND vp.currency = ${input.currency}
          AND vp.has_price = true
          AND vp.price_minor IS NOT NULL
          AND vp.variant_doc_id IS NOT NULL
          AND vp.product_doc_id IS NOT NULL
          AND vp.product_id IS NOT NULL
          ${minPredicate}
          ${maxPredicate}
      )`),
      empty: false,
      source: "variant-price-range",
    };
  }

  @ReadOnly()
  async collectMatchedVariantPricePage(input: {
    currency: string;
    variantMatchesBitmap: BitmapExpr;
    productMatchesBitmap: BitmapExpr;
    direction: "asc" | "desc";
    first: number;
    after?: DecodedListingCursor | null;
    includePlusOne: boolean;
    strategy?: "chunked_application_dedupe" | "anti_join_reference";
  }): Promise<ListingPageCollectResult> {
    const first = normalizePositivePageSize(input.first);
    if (input.variantMatchesBitmap.empty || input.productMatchesBitmap.empty) {
      return { rows: [], hasNextPage: false };
    }

    if (input.strategy === "anti_join_reference" || input.after) {
      return this.collectReferencePage(input, first);
    }

    const target = input.includePlusOne ? first + 1 : first;
    const chunkLimit = Math.min(Math.max(target * 4, 100), 500);
    const maxScanBudget = Math.min(Math.max(first * 50, 1000), 10000);
    const collected: ListingPageRow[] = [];
    const seenProductIds = new Set<string>();
    let scanned = 0;
    let progress = this.progressFromCursor(input.after ?? null);

    while (collected.length < target && scanned < maxScanBudget) {
      const rows = await this.fetchVariantPriceChunk(input, chunkLimit, progress);
      if (rows.length === 0) {
        break;
      }

      scanned += rows.length;
      for (const row of rows) {
        progress = {
          priceMinor: row.priceMinor,
          productId: row.productId,
          variantDocId: row.variantDocId,
        };
        if (seenProductIds.has(row.productId)) {
          continue;
        }
        seenProductIds.add(row.productId);
        collected.push(this.toListingPageRow(row));
        if (collected.length >= target) {
          break;
        }
      }
    }

    if (collected.length < target && scanned >= maxScanBudget) {
      return this.collectReferencePage(input, first);
    }

    return {
      rows: collected.slice(0, first),
      hasNextPage: input.includePlusOne && collected.length > first,
    };
  }

  private async fetchVariantPriceChunk(
    input: {
      currency: string;
      variantMatchesBitmap: BitmapExpr;
      productMatchesBitmap: BitmapExpr;
      direction: "asc" | "desc";
    },
    limit: number,
    progress: PriceProgress | null
  ): Promise<VariantPricePageSqlRow[]> {
    const seek = this.buildPriceSeek(input.direction, progress);
    const orderBy =
      input.direction === "asc"
        ? sql`vp.price_minor ASC, vp.product_id ASC, vp.variant_doc_id ASC`
        : sql`vp.price_minor DESC, vp.product_id ASC, vp.variant_doc_id ASC`;

    return this.connection.execute<VariantPricePageSqlRow>(sql`
      SELECT
        vp.product_doc_id::int AS "productDocId",
        vp.product_id::text AS "productId",
        pli.in_stock AS "inStock",
        vp.variant_doc_id::int AS "variantDocId",
        vp.price_minor::double precision AS "priceMinor"
      FROM listing.variant_listing_price_index vp
      JOIN listing.variant_listing_index vli
        ON vli.project_id = vp.project_id
       AND vli.variant_id = vp.variant_id
       AND vli.in_stock = true
      JOIN listing.product_listing_index pli
        ON pli.project_id = vp.project_id
       AND pli.product_doc_id = vp.product_doc_id
       AND pli.product_id = vp.product_id
      WHERE vp.project_id = ${this.storeId}::uuid
        AND vp.currency = ${input.currency}
        AND vp.has_price = true
        AND vp.price_minor IS NOT NULL
        AND vp.variant_doc_id IS NOT NULL
        AND vp.product_doc_id IS NOT NULL
        AND vp.product_id IS NOT NULL
        AND ${input.variantMatchesBitmap.sql} @> vp.variant_doc_id
        AND ${input.productMatchesBitmap.sql} @> vp.product_doc_id
        ${seek}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `);
  }

  private async collectReferencePage(
    input: {
      currency: string;
      variantMatchesBitmap: BitmapExpr;
      productMatchesBitmap: BitmapExpr;
      direction: "asc" | "desc";
      first: number;
      after?: DecodedListingCursor | null;
      includePlusOne: boolean;
    },
    normalizedFirst: number
  ): Promise<ListingPageCollectResult> {
    const limit = input.includePlusOne ? normalizedFirst + 1 : normalizedFirst;
    const seek = this.buildPriceSeek(
      input.direction,
      this.progressFromCursor(input.after ?? null),
      "chosen"
    );
    const candidateOrder =
      input.direction === "asc"
        ? sql`vp.product_id ASC, vp.price_minor ASC, vp.variant_doc_id ASC`
        : sql`vp.product_id ASC, vp.price_minor DESC, vp.variant_doc_id ASC`;
    const finalOrder =
      input.direction === "asc"
        ? sql`chosen.price_minor ASC, chosen.product_id ASC, chosen.variant_doc_id ASC`
        : sql`chosen.price_minor DESC, chosen.product_id ASC, chosen.variant_doc_id ASC`;

    const rows = await this.connection.execute<VariantPricePageSqlRow>(sql`
      WITH candidates AS (
        SELECT
          vp.product_doc_id,
          vp.product_id,
          vp.variant_doc_id,
          vp.price_minor
        FROM listing.variant_listing_price_index vp
        JOIN listing.variant_listing_index vli
          ON vli.project_id = vp.project_id
         AND vli.variant_id = vp.variant_id
         AND vli.in_stock = true
        WHERE vp.project_id = ${this.storeId}::uuid
          AND vp.currency = ${input.currency}
          AND vp.has_price = true
          AND vp.price_minor IS NOT NULL
          AND vp.variant_doc_id IS NOT NULL
          AND vp.product_doc_id IS NOT NULL
          AND vp.product_id IS NOT NULL
          AND ${input.variantMatchesBitmap.sql} @> vp.variant_doc_id
          AND ${input.productMatchesBitmap.sql} @> vp.product_doc_id
      ),
      chosen AS (
        SELECT DISTINCT ON (vp.product_id)
          vp.product_doc_id,
          vp.product_id,
          vp.variant_doc_id,
          vp.price_minor
        FROM candidates vp
        ORDER BY ${candidateOrder}
      )
      SELECT
        chosen.product_doc_id::int AS "productDocId",
        chosen.product_id::text AS "productId",
        pli.in_stock AS "inStock",
        chosen.variant_doc_id::int AS "variantDocId",
        chosen.price_minor::double precision AS "priceMinor"
      FROM chosen
      JOIN listing.product_listing_index pli
        ON pli.project_id = ${this.storeId}::uuid
       AND pli.product_doc_id = chosen.product_doc_id
       AND pli.product_id = chosen.product_id
      WHERE true
        ${seek}
      ORDER BY ${finalOrder}
      LIMIT ${limit}
    `);

    return {
      rows: rows.slice(0, normalizedFirst).map((row) => this.toListingPageRow(row)),
      hasNextPage: input.includePlusOne && rows.length > normalizedFirst,
    };
  }

  private buildPriceSeek(
    direction: "asc" | "desc",
    progress: PriceProgress | null,
    alias = "vp"
  ): SQL {
    if (!progress) {
      return sql``;
    }

    const priceComparison =
      direction === "asc"
        ? sql`${sql.raw(alias)}.price_minor > ${progress.priceMinor}`
        : sql`${sql.raw(alias)}.price_minor < ${progress.priceMinor}`;

    return sql`AND (
      ${priceComparison}
      OR (
        ${sql.raw(alias)}.price_minor = ${progress.priceMinor}
        AND (
          ${sql.raw(alias)}.product_id > ${progress.productId}::uuid
          OR (
            ${sql.raw(alias)}.product_id = ${progress.productId}::uuid
            AND ${sql.raw(alias)}.variant_doc_id > ${progress.variantDocId}
          )
        )
      )
    )`;
  }

  private progressFromCursor(cursor: DecodedListingCursor | null): PriceProgress | null {
    if (!cursor) {
      return null;
    }
    if (
      cursor.payload.priceMinor === undefined ||
      cursor.payload.priceMinor === null ||
      cursor.payload.variantDocId === undefined ||
      cursor.payload.variantDocId === null
    ) {
      throw new StorefrontRepositoryValidationError(
        "Matched price cursor is missing price or variant tie-breaker"
      );
    }

    return {
      priceMinor: cursor.payload.priceMinor,
      productId: cursor.payload.productId,
      variantDocId: cursor.payload.variantDocId,
    };
  }

  private validatePriceRange(input: {
    currency: string;
    minPriceMinor?: number;
    maxPriceMinor?: number;
  }): void {
    if (!input.currency.trim()) {
      throw new StorefrontRepositoryValidationError("Currency is required");
    }
    if (input.minPriceMinor === undefined && input.maxPriceMinor === undefined) {
      throw new StorefrontRepositoryValidationError(
        "Price range requires at least one bound"
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
        "Price range min bound must not exceed max bound"
      );
    }
  }

  private toListingPageRow(row: VariantPricePageSqlRow): ListingPageRow {
    return {
      productDocId: row.productDocId,
      productId: row.productId,
      inStock: row.inStock,
      matchedVariantDocId: row.variantDocId,
      matchedPriceMinor: row.priceMinor,
      cursorValues: {
        inStock: row.inStock,
        productId: row.productId,
        priceMinor: row.priceMinor,
        variantDocId: row.variantDocId,
      },
    };
  }
}

interface PriceProgress {
  priceMinor: number;
  productId: string;
  variantDocId: number;
}
