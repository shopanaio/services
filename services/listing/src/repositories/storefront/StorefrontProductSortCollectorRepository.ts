import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { normalizePositivePageSize } from "./sqlHelpers.js";
import { StorefrontRepositoryValidationError } from "./types.js";
import type {
  BitmapExpr,
  DecodedListingCursor,
  ListingPageCollectResult,
  ListingPageRow,
  ProductSortCollectKind,
  ProductSortPageSqlRow,
  SearchTieBreakerSql,
} from "./types.js";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

export class StorefrontProductSortCollectorRepository extends BaseRepository {
  @ReadOnly()
  async collectProductSortPage(input: {
    matchesBitmap: BitmapExpr;
    sort: ProductSortCollectKind;
    locale: string;
    currency: string;
    manualScopeId?: string;
    first: number;
    after?: DecodedListingCursor | null;
    includePlusOne: boolean;
    searchTieBreaker?: SearchTieBreakerSql | null;
  }): Promise<ListingPageCollectResult> {
    const first = normalizePositivePageSize(input.first);
    if (input.matchesBitmap.empty) {
      return { rows: [], hasNextPage: false };
    }

    const config = this.sortConfig(input);
    const limit = input.includePlusOne ? first + 1 : first;
    const seek = this.buildSeekPredicate(input.sort, input.after ?? null);

    const rows = await this.connection.execute<ProductSortPageSqlRow>(sql`
      SELECT
        s.product_doc_id::int AS "productDocId",
        s.product_id::text AS "productId",
        COALESCE(s.bool_value, false) AS "inStock",
        s.bool_value AS "boolValue",
        s.timestamptz_value AS "timestamptzValue",
        s.timestamptz_value_2 AS "timestamptzValue2",
        s.bigint_value::double precision AS "bigintValue",
        s.text_value AS "textValue"
      FROM listing.listing_posting_product_sort s
      WHERE s.store_id = ${this.storeId}::uuid
        AND s.sort_kind = ${config.sortKind}
        AND s.locale = ${config.locale}
        AND s.currency = ${config.currency}
        AND s.manual_scope_id = ${config.manualScopeId}::uuid
        AND ${input.matchesBitmap.sql} @> s.product_doc_id
        ${seek}
      ORDER BY ${config.orderBy}
      LIMIT ${limit}
    `);

    const pageRows = rows.slice(0, first).map((row) =>
      this.toListingPageRow(row, input.sort)
    );

    return {
      rows: pageRows,
      hasNextPage: input.includePlusOne && rows.length > first,
    };
  }

  private sortConfig(input: {
    sort: ProductSortCollectKind;
    locale: string;
    currency: string;
    manualScopeId?: string;
  }): {
    sortKind: string;
    locale: string;
    currency: string;
    manualScopeId: string;
    orderBy: SQL;
  } {
    switch (input.sort) {
      case "manual":
        if (!input.manualScopeId) {
          throw new StorefrontRepositoryValidationError(
            "Manual sort requires manual scope id"
          );
        }
        return {
          sortKind: "manual",
          locale: "",
          currency: "",
          manualScopeId: input.manualScopeId,
          orderBy: sql`s.bool_value DESC, s.text_value ASC NULLS LAST, s.product_id ASC`,
        };
      case "newest":
        return {
          sortKind: "newest",
          locale: "",
          currency: "",
          manualScopeId: ZERO_UUID,
          orderBy: sql`s.bool_value DESC, s.timestamptz_value DESC NULLS LAST, s.timestamptz_value_2 DESC NULLS LAST, s.product_id ASC`,
        };
      case "created":
        return {
          sortKind: "created",
          locale: "",
          currency: "",
          manualScopeId: ZERO_UUID,
          orderBy: sql`s.bool_value DESC, s.timestamptz_value DESC, s.product_id ASC`,
        };
      case "name_asc":
        return {
          sortKind: "name",
          locale: input.locale,
          currency: "",
          manualScopeId: ZERO_UUID,
          orderBy: sql`s.bool_value DESC, s.text_value ASC NULLS LAST, s.product_id ASC`,
        };
      case "name_desc":
        return {
          sortKind: "name",
          locale: input.locale,
          currency: "",
          manualScopeId: ZERO_UUID,
          orderBy: sql`s.bool_value DESC, s.text_value DESC NULLS LAST, s.product_id ASC`,
        };
      case "price_asc":
        return {
          sortKind: "price_asc",
          locale: "",
          currency: input.currency,
          manualScopeId: ZERO_UUID,
          orderBy: sql`s.bool_value DESC, s.bigint_value ASC NULLS LAST, s.product_id ASC`,
        };
      case "price_desc":
        return {
          sortKind: "price_desc",
          locale: "",
          currency: input.currency,
          manualScopeId: ZERO_UUID,
          orderBy: sql`s.bool_value DESC, s.bigint_value DESC NULLS LAST, s.product_id ASC`,
        };
    }
  }

  private buildSeekPredicate(
    sort: ProductSortCollectKind,
    cursor: DecodedListingCursor | null
  ): SQL {
    if (!cursor) {
      return sql``;
    }

    const payload = cursor.payload;
    const productSeek = sql`s.product_id > ${payload.productId}::uuid`;
    let downstream: SQL;

    switch (sort) {
      case "manual":
      case "name_asc":
        downstream = this.ascNullsLastSeek(
          sql`s.text_value`,
          payload.textValue ?? null,
          productSeek
        );
        break;
      case "name_desc":
        downstream = this.descNullsLastSeek(
          sql`s.text_value`,
          payload.textValue ?? null,
          productSeek
        );
        break;
      case "newest":
        downstream = this.descNullsLastSeek(
          sql`s.timestamptz_value`,
          payload.publishedAt ?? null,
          this.descNullsLastSeek(
            sql`s.timestamptz_value_2`,
            payload.productCreatedAt ?? null,
            productSeek
          )
        );
        break;
      case "created":
        if (!payload.productCreatedAt) {
          throw new StorefrontRepositoryValidationError(
            "Created sort cursor is missing productCreatedAt"
          );
        }
        downstream = sql`(
          s.timestamptz_value < ${payload.productCreatedAt}
          OR (s.timestamptz_value = ${payload.productCreatedAt} AND ${productSeek})
        )`;
        break;
      case "price_asc":
        downstream = this.ascNullsLastSeek(
          sql`s.bigint_value`,
          payload.bigintValue ?? null,
          productSeek
        );
        break;
      case "price_desc":
        downstream = this.descNullsLastSeek(
          sql`s.bigint_value`,
          payload.bigintValue ?? null,
          productSeek
        );
        break;
    }

    return sql`AND ${this.boolDescSeek(payload.inStock, downstream)}`;
  }

  private boolDescSeek(cursorValue: boolean, downstream: SQL): SQL {
    if (cursorValue) {
      return sql`(
        COALESCE(s.bool_value, false) = false
        OR (COALESCE(s.bool_value, false) = true AND ${downstream})
      )`;
    }
    return sql`(COALESCE(s.bool_value, false) = false AND ${downstream})`;
  }

  private ascNullsLastSeek(column: SQL, value: string | number | null, next: SQL): SQL {
    if (value === null) {
      return sql`(${column} IS NULL AND ${next})`;
    }
    return sql`(
      ${column} > ${value}
      OR ${column} IS NULL
      OR (${column} = ${value} AND ${next})
    )`;
  }

  private descNullsLastSeek(column: SQL, value: string | number | null, next: SQL): SQL {
    if (value === null) {
      return sql`(${column} IS NULL AND ${next})`;
    }
    return sql`(
      ${column} < ${value}
      OR ${column} IS NULL
      OR (${column} = ${value} AND ${next})
    )`;
  }

  private toListingPageRow(
    row: ProductSortPageSqlRow,
    sort: ProductSortCollectKind
  ): ListingPageRow {
    const cursorValues: ListingPageRow["cursorValues"] = {
      inStock: row.inStock,
      productId: row.productId,
    };

    switch (sort) {
      case "manual":
      case "name_asc":
      case "name_desc":
        cursorValues.textValue = row.textValue;
        break;
      case "newest":
        cursorValues.publishedAt = row.timestamptzValue;
        cursorValues.productCreatedAt = row.timestamptzValue2;
        break;
      case "created":
        cursorValues.productCreatedAt = row.timestamptzValue;
        break;
      case "price_asc":
      case "price_desc":
        cursorValues.bigintValue = row.bigintValue;
        break;
    }

    return {
      productDocId: row.productDocId,
      productId: row.productId,
      inStock: row.inStock,
      cursorValues,
    };
  }
}
