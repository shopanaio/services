import { sql, type SQL } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { type CanonicalCollectionRule } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  compileCollectionRules,
  type CollectionCreatedAtPredicate,
  type CollectionPricePredicate,
  type CollectionRuleDefinitionKey,
} from "../../collections/CollectionRuleCompiler.js";
import { compileVariantProjectionSql } from "../storefront/sql/compileVariantProjectionSql.js";

interface CollectionRuleBitmapRow extends Record<string, unknown> {
  bitmap: string;
  cardinality: number | string;
}

export class CollectionRuleEvaluationRepository extends BaseRepository {
  @ReadOnly()
  async evaluate(input: {
    rules: readonly CanonicalCollectionRule[];
    currency: string;
    universe?: "storefront" | "admin";
    definitionKey?: CollectionRuleDefinitionKey;
  }): Promise<{
    productBitmap: string;
    variantBitmap: string | null;
    membershipBitmap: string;
    cardinality: number;
  }> {
    const plan = compileCollectionRules({
      rules: input.rules,
      definitionKey: input.definitionKey,
    });
    this.ctx.kernel.getServices().logger.debug(
      {
        result: plan.matchesNothing ? "empty" : "compiled",
        definitionKind: plan.definitionKey.kind,
        ruleCount: input.rules.length,
        fieldCounts: countBy(input.rules.map((rule) => rule.field)),
        operatorCounts: countBy(input.rules.map((rule) => rule.operator)),
      },
      "Collection rules compiled",
    );
    if (plan.matchesNothing) {
      const empty = emptyBitmapSql();
      const rows = await this.connection.execute<CollectionRuleBitmapRow>(sql`
        SELECT (${empty})::text AS bitmap, 0::bigint AS cardinality
      `);
      const result = mapRow(rows[0]);
      return {
        productBitmap: result.bitmap,
        variantBitmap: null,
        membershipBitmap: result.bitmap,
        cardinality: 0,
      };
    }

    const productParts: SQL[] = [];
    const variantParts: SQL[] = [];
    for (const group of plan.productPostingGroups) {
      productParts.push(
        combineBitmaps(
          group.valueKeys.map((valueKey) => this.postingBitmap("product", group.field, valueKey)),
          group.operator,
        ),
      );
    }
    for (const predicate of plan.productCreatedAtPredicates) {
      productParts.push(this.createdAtBitmap(predicate));
    }
    for (const group of plan.variantPostingGroups) {
      variantParts.push(
        combineBitmaps(
          group.valueKeys.map((valueKey) => this.postingBitmap("variant", group.field, valueKey)),
          group.operator,
        ),
      );
    }
    for (const predicate of plan.variantPricePredicates) {
      variantParts.push(this.priceBitmap(predicate));
    }
    const variantBitmap = variantParts.length > 0 ? combineBitmaps(variantParts, "and") : null;
    const publishedBitmap = this.universeBitmapSql(input.universe ?? "storefront");
    const productBitmap = combineBitmaps([publishedBitmap, ...productParts], "and");
    const membershipBitmap = variantBitmap
      ? sql`(b.product_bitmap & ${this.projectVariants(sql`b.variant_bitmap`)})`
      : sql`b.product_bitmap`;
    const rows = await this.connection.execute<
      CollectionRuleBitmapRow & {
        productBitmap: string;
        variantBitmap: string | null;
      }
    >(sql`
      WITH bases AS MATERIALIZED (
        SELECT
          (${productBitmap}) AS product_bitmap,
          ${variantBitmap ? sql`(${variantBitmap})` : sql`NULL::roaringbitmap`} AS variant_bitmap
      ),
      evaluated AS MATERIALIZED (
        SELECT
          (${membershipBitmap}) AS bitmap,
          b.product_bitmap,
          b.variant_bitmap
        FROM bases b
      )
      SELECT
        bitmap::text AS bitmap,
        product_bitmap::text AS "productBitmap",
        variant_bitmap::text AS "variantBitmap",
        rb_cardinality(bitmap)::bigint AS cardinality
      FROM evaluated
    `);
    const mapped = mapRow(rows[0]);
    return {
      productBitmap: rows[0]!.productBitmap,
      variantBitmap: rows[0]!.variantBitmap,
      membershipBitmap: mapped.bitmap,
      cardinality: mapped.cardinality,
    };
  }

  @ReadOnly()
  async getManualMembership(
    collectionId: string,
    universe: "storefront" | "admin",
  ): Promise<string> {
    const rows = await this.connection.execute<{ bitmap: string }>(sql`
      SELECT (
        ${this.universeBitmapSql(universe)}
        & COALESCE((
          SELECT p.bitmap
          FROM listing.listing_posting_bitmap p
          WHERE p.store_id = ${this.storeId}::uuid
            AND p.entity_type = 'product'
            AND p.field = 'collection'
            AND p.value_key = ${collectionId}
        ), ${emptyBitmapSql()})
      )::text AS bitmap
    `);
    if (!rows[0]?.bitmap) {
      throw new Error("Manual collection membership returned no row");
    }
    return rows[0].bitmap;
  }

  private universeBitmapSql(universe: "storefront" | "admin"): SQL {
    const published = this.postingBitmap("product", "status", "published");
    return universe === "storefront"
      ? published
      : sql`(${published} | ${this.postingBitmap("product", "status", "draft")})`;
  }

  private postingBitmap(entityType: "product" | "variant", field: string, valueKey: string): SQL {
    return sql`COALESCE((
      SELECT p.bitmap
      FROM listing.listing_posting_bitmap p
      WHERE p.store_id = ${this.storeId}::uuid
        AND p.entity_type = ${entityType}
        AND p.field = ${field}
        AND p.value_key = ${valueKey}
    ), ${emptyBitmapSql()})`;
  }

  private priceBitmap(predicateInput: CollectionPricePredicate): SQL {
    const predicate = numericPredicate(
      sql`p.price_minor`,
      predicateInput.operator,
      predicateInput.value,
      predicateInput.maxValue,
    );
    return sql`COALESCE((
      SELECT rb_or_agg(price_segment.bitmap)
      FROM (
        SELECT
          projection.block_id,
          rb_build_agg(p.variant_doc_id) AS bitmap
        FROM listing.listing_posting_variant_storeion_block projection
        JOIN listing.variant_listing_price_index p
          ON p.store_id = projection.store_id
         AND p.variant_doc_id >= projection.variant_doc_from
         AND p.variant_doc_id < projection.variant_doc_to
        WHERE projection.store_id = ${this.storeId}::uuid
          AND p.currency = ${predicateInput.currencyCode}
          AND p.has_price = true
          AND p.price_minor IS NOT NULL
          AND ${predicate}
        GROUP BY projection.block_id
      ) price_segment
    ), ${emptyBitmapSql()})`;
  }

  private createdAtBitmap(predicateInput: CollectionCreatedAtPredicate): SQL {
    const predicate = timestampPredicate(
      sql`p.product_created_at`,
      predicateInput.operator,
      predicateInput.value,
      predicateInput.maxValue,
    );
    return sql`COALESCE((
      SELECT rb_or_agg(created_segment.bitmap)
      FROM (
        SELECT
          ((p.product_doc_id - 1) / 65536)::int AS segment_id,
          rb_build_agg(p.product_doc_id) AS bitmap
        FROM listing.product_listing_index p
        WHERE p.store_id = ${this.storeId}::uuid
          AND ${predicate}
        GROUP BY ((p.product_doc_id - 1) / 65536)::int
      ) created_segment
    ), ${emptyBitmapSql()})`;
  }

  private projectVariants(variantBitmap: SQL): SQL {
    return compileVariantProjectionSql({
      projectIdSql: sql`${this.storeId}::uuid`,
      variantBitmapSql: variantBitmap,
    });
  }
}

function emptyBitmapSql(): SQL {
  return sql`(
    SELECT rb_build_agg(empty_doc_id) - rb_build_agg(empty_doc_id)
    FROM (VALUES (0)) seed(empty_doc_id)
  )`;
}

function combineBitmaps(parts: readonly SQL[], operator: "and" | "or"): SQL {
  if (parts.length === 0) return emptyBitmapSql();
  return parts
    .slice(1)
    .reduce(
      (left, right) => (operator === "and" ? sql`(${left} & ${right})` : sql`(${left} | ${right})`),
      parts[0],
    );
}

function numericPredicate(
  column: SQL,
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "between",
  value: string,
  maxValue?: string,
): SQL {
  switch (operator) {
    case "eq":
      return sql`${column} = ${value}::bigint`;
    case "gt":
      return sql`${column} > ${value}::bigint`;
    case "gte":
      return sql`${column} >= ${value}::bigint`;
    case "lt":
      return sql`${column} < ${value}::bigint`;
    case "lte":
      return sql`${column} <= ${value}::bigint`;
    case "between":
      return sql`${column} BETWEEN ${value}::bigint AND ${maxValue!}::bigint`;
  }
}

function timestampPredicate(
  column: SQL,
  operator: "eq" | "gt" | "gte" | "lt" | "lte" | "between",
  value: string,
  maxValue?: string,
): SQL {
  switch (operator) {
    case "eq":
      return sql`${column} = ${value}::timestamptz`;
    case "gt":
      return sql`${column} > ${value}::timestamptz`;
    case "gte":
      return sql`${column} >= ${value}::timestamptz`;
    case "lt":
      return sql`${column} < ${value}::timestamptz`;
    case "lte":
      return sql`${column} <= ${value}::timestamptz`;
    case "between":
      return sql`${column} BETWEEN ${value}::timestamptz AND ${maxValue!}::timestamptz`;
  }
}

function mapRow(row: CollectionRuleBitmapRow | undefined): { bitmap: string; cardinality: number } {
  if (!row) throw new Error("Collection rule evaluation returned no row");
  const cardinality = Number(row.cardinality);
  if (!Number.isSafeInteger(cardinality) || cardinality < 0) {
    throw new Error("Collection rule evaluation returned invalid cardinality");
  }
  return { bitmap: row.bitmap, cardinality };
}

function countBy(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}
