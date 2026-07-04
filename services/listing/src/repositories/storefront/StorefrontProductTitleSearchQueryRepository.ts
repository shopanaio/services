import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import {
  coalesceBitmapSql,
  normalizePositivePageSize,
} from "./sqlHelpers.js";
import { StorefrontRepositoryValidationError } from "./types.js";
import type {
  BitmapExpr,
  DecodedListingCursor,
  ListingPageCollectResult,
  ListingPageRow,
  SearchPageSqlRow,
} from "./types.js";

export class StorefrontProductTitleSearchQueryRepository extends BaseRepository {
  normalizeQuery(query: string | undefined | null): string | null {
    if (!query) {
      return null;
    }

    const normalized = query.trim().replace(/\s+/g, " ");
    if (normalized.length === 0) {
      return null;
    }

    return normalized.length > 128 ? normalized.slice(0, 128) : normalized;
  }

  buildSearchCandidatesSql(input: {
    locale: string;
    normalizedQuery: string;
  }): SQL {
    if (!input.locale.trim()) {
      throw new StorefrontRepositoryValidationError("Locale is required");
    }
    if (!input.normalizedQuery.trim()) {
      throw new StorefrontRepositoryValidationError("Search query is required");
    }

    return sql`(
      SELECT
        pli.product_doc_id::int AS product_doc_id,
        pli.product_id AS product_id,
        pli.in_stock AS in_stock,
        pdb.score(ptsi.search_id)::double precision AS relevance_score
      FROM listing.product_title_bm25_search_index ptsi
      JOIN listing.product_listing_index pli
        ON pli.project_id = ptsi.project_id
       AND pli.product_id = ptsi.product_id
      WHERE ptsi.project_id = ${this.storeId}::uuid
        AND ptsi.locale = ${input.locale}
        AND ptsi.status = 'published'
        AND pli.status = 'published'
        AND ptsi.title @@@ ${input.normalizedQuery}
    )`;
  }

  @ReadOnly()
  async buildSearchCandidateBitmap(input: {
    locale: string;
    normalizedQuery: string;
  }): Promise<BitmapExpr> {
    const candidatesSql = this.buildSearchCandidatesSql(input);
    return {
      sql: coalesceBitmapSql(sql`(
        SELECT rb_build_agg(c.product_doc_id)
        FROM ${candidatesSql} c
      )`),
      empty: false,
      source: "title-search",
    };
  }

  @ReadOnly()
  async collectRelevancePage(input: {
    locale: string;
    normalizedQuery: string;
    matchesBitmap: BitmapExpr;
    first: number;
    after?: DecodedListingCursor | null;
    includePlusOne: boolean;
  }): Promise<ListingPageCollectResult> {
    const first = normalizePositivePageSize(input.first);
    if (input.matchesBitmap.empty) {
      return { rows: [], hasNextPage: false };
    }

    const candidatesSql = this.buildSearchCandidatesSql(input);
    const limit = input.includePlusOne ? first + 1 : first;
    const seek = this.buildSeekPredicate(input.after ?? null);

    const rows = await this.connection.execute<SearchPageSqlRow>(sql`
      WITH candidates AS ${candidatesSql}
      SELECT
        c.product_doc_id::int AS "productDocId",
        c.product_id::text AS "productId",
        c.in_stock AS "inStock",
        c.relevance_score::double precision AS "relevanceScore"
      FROM candidates c
      WHERE ${input.matchesBitmap.sql} @> c.product_doc_id
        ${seek}
      ORDER BY c.in_stock DESC, c.relevance_score DESC NULLS LAST, c.product_id ASC
      LIMIT ${limit}
    `);

    return {
      rows: rows.slice(0, first).map((row) => this.toListingPageRow(row)),
      hasNextPage: input.includePlusOne && rows.length > first,
    };
  }

  private buildSeekPredicate(cursor: DecodedListingCursor | null): SQL {
    if (!cursor) {
      return sql``;
    }

    const payload = cursor.payload;
    if (payload.relevanceScore === undefined || payload.relevanceScore === null) {
      throw new StorefrontRepositoryValidationError(
        "Relevance cursor is missing relevance score"
      );
    }

    const productSeek = sql`c.product_id > ${payload.productId}::uuid`;
    const scoreSeek = sql`(
      c.relevance_score < ${payload.relevanceScore}
      OR c.relevance_score IS NULL
      OR (c.relevance_score = ${payload.relevanceScore} AND ${productSeek})
    )`;

    if (payload.inStock) {
      return sql`AND (
        c.in_stock = false
        OR (c.in_stock = true AND ${scoreSeek})
      )`;
    }

    return sql`AND (c.in_stock = false AND ${scoreSeek})`;
  }

  private toListingPageRow(row: SearchPageSqlRow): ListingPageRow {
    return {
      productDocId: row.productDocId,
      productId: row.productId,
      inStock: row.inStock,
      relevanceScore: row.relevanceScore,
      cursorValues: {
        inStock: row.inStock,
        productId: row.productId,
        relevanceScore: row.relevanceScore,
      },
    };
  }
}
