import { and, eq, inArray, sql } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { listingPostingBitmap } from "../models/index.js";
import {
  coalesceBitmapSql,
  emptyBitmapExpr,
  literalBitmapExpr,
  orBitmapExpr,
} from "./sqlHelpers.js";
import type {
  BitmapExpr,
  ProductPostingField,
  RoaringBitmapSqlValue,
  VariantPostingField,
} from "./types.js";
import { StorefrontRepositoryValidationError } from "./types.js";

type PostingEntityType = "product" | "variant";

export class StorefrontPostingBitmapQueryRepository extends BaseRepository {
  @ReadOnly()
  async getPostingBitmap(input: {
    entityType: PostingEntityType;
    field: ProductPostingField | VariantPostingField;
    valueKey: string;
  }): Promise<RoaringBitmapSqlValue | null> {
    this.assertPostingInput(input);

    const rows = await this.connection
      .select({ bitmap: listingPostingBitmap.bitmap })
      .from(listingPostingBitmap)
      .where(
        and(
          eq(listingPostingBitmap.storeId, this.storeId),
          eq(listingPostingBitmap.entityType, input.entityType),
          eq(listingPostingBitmap.field, input.field),
          eq(listingPostingBitmap.valueKey, input.valueKey)
        )
      )
      .limit(1);

    return rows[0]?.bitmap ?? null;
  }

  @ReadOnly()
  async getPostingBitmaps(input: {
    entityType: PostingEntityType;
    field: ProductPostingField | VariantPostingField;
    valueKeys: readonly string[];
  }): Promise<Map<string, RoaringBitmapSqlValue>> {
    this.assertPostingInput(input);
    const valueKeys = this.uniqueNonEmpty(input.valueKeys);
    if (valueKeys.length === 0) {
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
          eq(listingPostingBitmap.storeId, this.storeId),
          eq(listingPostingBitmap.entityType, input.entityType),
          eq(listingPostingBitmap.field, input.field),
          inArray(listingPostingBitmap.valueKey, valueKeys)
        )
      );

    return new Map(rows.map((row) => [row.valueKey, row.bitmap]));
  }

  buildOrGroup(input: {
    entityType: PostingEntityType;
    field: ProductPostingField | VariantPostingField;
    valueKeys: readonly string[];
    loaded: Map<string, RoaringBitmapSqlValue>;
  }): BitmapExpr {
    this.assertPostingInput(input);
    const valueKeys = this.uniqueNonEmpty(input.valueKeys);
    const parts = valueKeys.flatMap((valueKey) => {
      const bitmap = input.loaded.get(valueKey);
      return bitmap
        ? [literalBitmapExpr(bitmap, `${input.entityType}:${input.field}:${valueKey}`)]
        : [];
    });

    if (parts.length === 0) {
      return emptyBitmapExpr(`${input.entityType}:${input.field}:missing`);
    }

    return orBitmapExpr(parts);
  }

  buildAndGroups(input: {
    groups: readonly BitmapExpr[];
    emptyWhenNoGroups: boolean;
  }): BitmapExpr {
    if (input.groups.length === 0) {
      return emptyBitmapExpr(
        input.emptyWhenNoGroups ? "and-groups:required-empty" : "and-groups:none"
      );
    }

    const emptyGroup = input.groups.find((group) => group.empty);
    if (emptyGroup) {
      return emptyBitmapExpr(`and-groups:${emptyGroup.source}`);
    }

    return {
      sql: input.groups
        .slice(1)
        .reduce((acc, group) => sql`(${acc} & ${group.sql})`, input.groups[0].sql),
      empty: false,
      source: `and-groups(${input.groups.map((group) => group.source).join(",")})`,
    };
  }

  @ReadOnly()
  async buildPublishedProductScope(): Promise<BitmapExpr> {
    return {
      sql: coalesceBitmapSql(sql`(
        SELECT rb_build_agg(pli.product_doc_id)
        FROM listing.product_listing_index pli
        WHERE pli.store_id = ${this.storeId}::uuid
          AND pli.status = 'published'
      )`),
      empty: false,
      source: "published-products",
    };
  }

  @ReadOnly()
  async buildProductStockScope(input: {
    inStock: boolean;
  }): Promise<BitmapExpr> {
    return {
      sql: coalesceBitmapSql(sql`(
        SELECT rb_build_agg(pli.product_doc_id)
        FROM listing.product_listing_index pli
        WHERE pli.store_id = ${this.storeId}::uuid
          AND pli.status = 'published'
          AND pli.in_stock = ${input.inStock}
      )`),
      empty: false,
      source: `product-stock:${input.inStock}`,
    };
  }

  @ReadOnly()
  async buildVariantStockScope(input: {
    inStock: boolean;
  }): Promise<BitmapExpr> {
    return {
      sql: coalesceBitmapSql(sql`(
        SELECT rb_build_agg(vli.variant_doc_id)
        FROM listing.variant_listing_index vli
        WHERE vli.store_id = ${this.storeId}::uuid
          AND vli.in_stock = ${input.inStock}
      )`),
      empty: false,
      source: `variant-stock:${input.inStock}`,
    };
  }

  private assertPostingInput(input: {
    entityType: PostingEntityType;
    field: ProductPostingField | VariantPostingField;
  }): void {
    if (input.entityType === "product") {
      if (!["category", "vendor", "facet"].includes(input.field)) {
        throw new StorefrontRepositoryValidationError(
          `Unsupported product posting field: ${input.field}`
        );
      }
      return;
    }

    if (!["facet", "variant_product"].includes(input.field)) {
      throw new StorefrontRepositoryValidationError(
        `Unsupported variant posting field: ${input.field}`
      );
    }
  }

  private uniqueNonEmpty(values: readonly string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }
}
