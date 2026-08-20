import { sql, type SQL } from "drizzle-orm";
import {
  StorefrontRepositoryValidationError,
  type BitmapExpr,
  type RoaringBitmapSqlValue,
} from "./types.js";

export function emptyRoaringBitmapSql(): SQL {
  return sql`(
    SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
    FROM (VALUES (0)) AS empty_bitmap_seed(empty_doc_id)
  )`;
}

export function coalesceBitmapSql(value: SQL): SQL {
  return sql`COALESCE(${value}, ${emptyRoaringBitmapSql()})`;
}

export function emptyBitmapExpr(source: string): BitmapExpr {
  return {
    sql: emptyRoaringBitmapSql(),
    empty: true,
    source,
  };
}

export function literalBitmapExpr(value: RoaringBitmapSqlValue, source: string): BitmapExpr {
  return {
    sql: sql`${value}::roaringbitmap`,
    empty: false,
    source,
  };
}

export function andBitmapExpr(parts: readonly BitmapExpr[]): BitmapExpr {
  if (parts.length === 0) {
    return emptyBitmapExpr("empty-and");
  }

  const emptyPart = parts.find((part) => part.empty);
  if (emptyPart) {
    return emptyBitmapExpr(`empty-and:${emptyPart.source}`);
  }

  return {
    sql: parts.slice(1).reduce((acc, part) => sql`(${acc} & ${part.sql})`, parts[0].sql),
    empty: false,
    source: `and(${parts.map((part) => part.source).join(",")})`,
  };
}

export function orBitmapExpr(parts: readonly BitmapExpr[]): BitmapExpr {
  const nonEmptyParts = parts.filter((part) => !part.empty);
  if (nonEmptyParts.length === 0) {
    return emptyBitmapExpr("empty-or");
  }

  return {
    sql: nonEmptyParts
      .slice(1)
      .reduce((acc, part) => sql`(${acc} | ${part.sql})`, nonEmptyParts[0].sql),
    empty: false,
    source: `or(${nonEmptyParts.map((part) => part.source).join(",")})`,
  };
}

export function normalizePositivePageSize(first: number): number {
  if (!Number.isSafeInteger(first) || first <= 0) {
    throw new StorefrontRepositoryValidationError(
      "Listing page size must be a positive safe integer",
    );
  }
  return Math.min(first, 250);
}

export function assertNonNegativeSafeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new StorefrontRepositoryValidationError(`${field} must be a non-negative safe integer`);
  }
}
