import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productSearchText,
  type NewProductSearchText,
  type ProductSearchText,
} from "../models/index.js";
import {
  assertNonEmpty,
  assertPositiveInteger,
  assertUnique,
  chunk,
  type SearchTextElementInput,
  type SearchTextField,
} from "./searchRepositoryTypes.js";

const SEARCH_TEXT_FIELDS = new Set<SearchTextField>([
  "product_title",
  "variant_title",
  "vendor_name",
  "category_name",
]);

export class SearchTextElementRepository extends BaseRepository {
  @ReadOnly()
  async find(
    productId: string,
    locale: string,
    field: SearchTextField,
    elementId: string,
  ): Promise<ProductSearchText | null> {
    const rows = await this.connection
      .select()
      .from(productSearchText)
      .where(
        and(
          eq(productSearchText.storeId, this.storeId),
          eq(productSearchText.productId, productId),
          eq(productSearchText.locale, locale),
          eq(productSearchText.field, field),
          eq(productSearchText.elementId, elementId),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByProductId(productId: string, locale?: string): Promise<ProductSearchText[]> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope =
      locale !== undefined
        ? and(
            eq(productSearchText.storeId, this.storeId),
            eq(productSearchText.productId, productId),
            eq(productSearchText.locale, locale),
          )
        : and(
            eq(productSearchText.storeId, this.storeId),
            eq(productSearchText.productId, productId),
          );

    return this.connection
      .select()
      .from(productSearchText)
      .where(scope)
      .orderBy(
        asc(productSearchText.locale),
        asc(productSearchText.field),
        asc(productSearchText.elementId),
      );
  }

  @ReadOnly()
  async getByProductIds(
    productIds: readonly string[],
    locale?: string,
  ): Promise<ProductSearchText[]> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    if (productIds.length === 0) return [];

    const uniqueProductIds = [...new Set(productIds)];
    const scope =
      locale !== undefined
        ? and(
            eq(productSearchText.storeId, this.storeId),
            inArray(productSearchText.productId, uniqueProductIds),
            eq(productSearchText.locale, locale),
          )
        : and(
            eq(productSearchText.storeId, this.storeId),
            inArray(productSearchText.productId, uniqueProductIds),
          );

    return this.connection.select().from(productSearchText).where(scope);
  }

  @ReadOnly()
  async count(locale?: string): Promise<number> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope =
      locale !== undefined
        ? and(eq(productSearchText.storeId, this.storeId), eq(productSearchText.locale, locale))
        : eq(productSearchText.storeId, this.storeId);
    const rows = await this.connection
      .select({ value: count() })
      .from(productSearchText)
      .where(scope);
    return rows[0]?.value ?? 0;
  }

  @Transactional()
  async upsertMany(inputs: readonly SearchTextElementInput[]): Promise<ProductSearchText[]> {
    if (inputs.length === 0) return [];
    assertUnique(
      inputs,
      (row) => `${row.productId}:${row.locale}:${row.field}:${row.elementId}`,
      "search text element",
    );

    const indexedAt = new Date().toISOString();
    const result: ProductSearchText[] = [];
    for (const batch of chunk(inputs)) {
      const rows = await this.connection
        .insert(productSearchText)
        .values(batch.map((row) => this.toInsert(row, indexedAt)))
        .onConflictDoUpdate({
          target: [
            productSearchText.productId,
            productSearchText.locale,
            productSearchText.field,
            productSearchText.elementId,
          ],
          setWhere: eq(productSearchText.storeId, this.storeId),
          set: {
            productDocId: sql`excluded.product_doc_id`,
            preparedText: sql`excluded.prepared_text`,
            normalizationContractVersion: sql`excluded.normalization_contract_version`,
            normalizationProfileHash: sql`excluded.normalization_profile_hash`,
            indexedAt,
          },
        })
        .returning();
      result.push(...rows);
    }
    return result;
  }

  async upsert(input: SearchTextElementInput): Promise<ProductSearchText> {
    const rows = await this.upsertMany([input]);
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert search text element");
    return row;
  }

  @Transactional()
  async replaceForProduct(
    productId: string,
    inputs: readonly SearchTextElementInput[],
  ): Promise<ProductSearchText[]> {
    for (const input of inputs) {
      if (input.productId !== productId) {
        throw new Error("Search text element productId must match replace key");
      }
    }
    await this.deleteByProductId(productId);
    return this.upsertMany(inputs);
  }

  @Transactional()
  async replaceForProducts(
    inputsByProductId: ReadonlyMap<string, readonly SearchTextElementInput[]>,
  ): Promise<ProductSearchText[]> {
    if (inputsByProductId.size === 0) return [];
    const productIds = [...inputsByProductId.keys()];
    const inputs = [...inputsByProductId.entries()].flatMap(([productId, productInputs]) => {
      for (const input of productInputs) {
        if (input.productId !== productId) {
          throw new Error("Search text element productId must match replace map key");
        }
      }
      return [...productInputs];
    });
    await this.deleteByProductIds(productIds);
    return this.upsertMany(inputs);
  }

  async deleteByProductId(productId: string): Promise<number> {
    const rows = await this.connection
      .delete(productSearchText)
      .where(
        and(
          eq(productSearchText.storeId, this.storeId),
          eq(productSearchText.productId, productId),
        ),
      )
      .returning({ productId: productSearchText.productId });
    return rows.length;
  }

  async delete(
    productId: string,
    locale: string,
    field: SearchTextField,
    elementId: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .delete(productSearchText)
      .where(
        and(
          eq(productSearchText.storeId, this.storeId),
          eq(productSearchText.productId, productId),
          eq(productSearchText.locale, locale),
          eq(productSearchText.field, field),
          eq(productSearchText.elementId, elementId),
        ),
      )
      .returning({ productId: productSearchText.productId });
    return rows.length > 0;
  }

  @Transactional()
  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) return 0;
    let deleted = 0;
    for (const batch of chunk([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(productSearchText)
        .where(
          and(
            eq(productSearchText.storeId, this.storeId),
            inArray(productSearchText.productId, batch),
          ),
        )
        .returning({ productId: productSearchText.productId });
      deleted += rows.length;
    }
    return deleted;
  }

  async deleteByLocale(locale: string): Promise<number> {
    assertNonEmpty(locale, "locale");
    const rows = await this.connection
      .delete(productSearchText)
      .where(and(eq(productSearchText.storeId, this.storeId), eq(productSearchText.locale, locale)))
      .returning({ productId: productSearchText.productId });
    return rows.length;
  }

  private toInsert(input: SearchTextElementInput, indexedAt: string): NewProductSearchText {
    assertPositiveInteger(input.productDocId, "productDocId");
    assertNonEmpty(input.locale, "locale");
    assertNonEmpty(input.preparedText, "preparedText");
    assertNonEmpty(input.normalizationContractVersion, "normalizationContractVersion");
    assertNonEmpty(input.normalizationProfileHash, "normalizationProfileHash");
    if (!SEARCH_TEXT_FIELDS.has(input.field)) {
      throw new Error(`Unsupported search text field: ${input.field}`);
    }
    return { ...input, storeId: this.storeId, indexedAt };
  }
}
