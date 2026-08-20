import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productSearchIdentifier,
  type NewProductSearchIdentifier,
  type ProductSearchIdentifier,
} from "../models/index.js";
import {
  assertNonEmpty,
  assertPositiveInteger,
  assertUnique,
  chunk,
  type SearchIdentifierCandidate,
  type SearchIdentifierInput,
} from "./searchRepositoryTypes.js";

export class SearchIdentifierRepository extends BaseRepository {
  @ReadOnly()
  async find(
    productId: string,
    locale: string,
    elementId: string,
  ): Promise<ProductSearchIdentifier | null> {
    const rows = await this.connection
      .select()
      .from(productSearchIdentifier)
      .where(
        and(
          eq(productSearchIdentifier.storeId, this.storeId),
          eq(productSearchIdentifier.productId, productId),
          eq(productSearchIdentifier.locale, locale),
          eq(productSearchIdentifier.kind, "SKU"),
          eq(productSearchIdentifier.elementId, elementId),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getByProductId(productId: string, locale?: string): Promise<ProductSearchIdentifier[]> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope =
      locale !== undefined
        ? and(
            eq(productSearchIdentifier.storeId, this.storeId),
            eq(productSearchIdentifier.productId, productId),
            eq(productSearchIdentifier.locale, locale),
          )
        : and(
            eq(productSearchIdentifier.storeId, this.storeId),
            eq(productSearchIdentifier.productId, productId),
          );
    return this.connection
      .select()
      .from(productSearchIdentifier)
      .where(scope)
      .orderBy(asc(productSearchIdentifier.locale), asc(productSearchIdentifier.elementId));
  }

  @ReadOnly()
  async getByProductIds(
    productIds: readonly string[],
    locale?: string,
  ): Promise<ProductSearchIdentifier[]> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    if (productIds.length === 0) return [];
    const scope =
      locale !== undefined
        ? and(
            eq(productSearchIdentifier.storeId, this.storeId),
            inArray(productSearchIdentifier.productId, [...new Set(productIds)]),
            eq(productSearchIdentifier.locale, locale),
          )
        : and(
            eq(productSearchIdentifier.storeId, this.storeId),
            inArray(productSearchIdentifier.productId, [...new Set(productIds)]),
          );
    return this.connection.select().from(productSearchIdentifier).where(scope);
  }

  @ReadOnly()
  async findCandidates(
    locale: string,
    normalizedValue: string,
    allowPrefix: boolean,
  ): Promise<SearchIdentifierCandidate[]> {
    assertNonEmpty(locale, "locale");
    assertNonEmpty(normalizedValue, "normalizedValue");
    const prefixAllowed = allowPrefix && [...normalizedValue].length >= 3;
    const rows = await this.connection.execute<ProductSearchIdentifier & { priority: number }>(sql`
      SELECT
        identifier.store_id AS "storeId",
        identifier.product_id AS "productId",
        identifier.product_doc_id AS "productDocId",
        identifier.locale AS "locale",
        identifier.element_id AS "elementId",
        identifier.kind AS "kind",
        identifier.normalized_value AS "normalizedValue",
        identifier.indexed_at AS "indexedAt",
        CASE
          WHEN identifier.normalized_value = ${normalizedValue} THEN 3
          ELSE 2
        END::int AS priority
      FROM ${productSearchIdentifier} AS identifier
      WHERE identifier.store_id = ${this.storeId}
        AND identifier.locale = ${locale}
        AND identifier.kind = 'SKU'
        AND (
          identifier.normalized_value = ${normalizedValue}
          OR (
            ${prefixAllowed}
            AND identifier.normalized_value LIKE
              replace(replace(replace(${normalizedValue}, '!', '!!'), '%', '!%'), '_', '!_') || '%'
              ESCAPE '!'
          )
        )
      ORDER BY priority DESC, identifier.product_id, identifier.element_id
    `);

    return (rows as unknown as Array<ProductSearchIdentifier & { priority: number }>).map(
      ({ priority, ...row }) => ({
        row,
        priority: priority === 3 ? 3 : 2,
      }),
    );
  }

  @ReadOnly()
  async count(locale?: string): Promise<number> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope =
      locale !== undefined
        ? and(
            eq(productSearchIdentifier.storeId, this.storeId),
            eq(productSearchIdentifier.locale, locale),
          )
        : eq(productSearchIdentifier.storeId, this.storeId);
    const rows = await this.connection
      .select({ value: count() })
      .from(productSearchIdentifier)
      .where(scope);
    return rows[0]?.value ?? 0;
  }

  @Transactional()
  async upsertMany(inputs: readonly SearchIdentifierInput[]): Promise<ProductSearchIdentifier[]> {
    if (inputs.length === 0) return [];
    assertUnique(
      inputs,
      (row) => `${row.productId}:${row.locale}:${row.kind}:${row.elementId}`,
      "search identifier",
    );
    const indexedAt = new Date().toISOString();
    const result: ProductSearchIdentifier[] = [];
    for (const batch of chunk(inputs)) {
      const rows = await this.connection
        .insert(productSearchIdentifier)
        .values(batch.map((row) => this.toInsert(row, indexedAt)))
        .onConflictDoUpdate({
          target: [
            productSearchIdentifier.productId,
            productSearchIdentifier.locale,
            productSearchIdentifier.kind,
            productSearchIdentifier.elementId,
          ],
          setWhere: eq(productSearchIdentifier.storeId, this.storeId),
          set: {
            productDocId: sql`excluded.product_doc_id`,
            normalizedValue: sql`excluded.normalized_value`,
            indexedAt,
          },
        })
        .returning();
      result.push(...rows);
    }
    return result;
  }

  async upsert(input: SearchIdentifierInput): Promise<ProductSearchIdentifier> {
    const rows = await this.upsertMany([input]);
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert search identifier");
    return row;
  }

  @Transactional()
  async replaceForProduct(
    productId: string,
    inputs: readonly SearchIdentifierInput[],
  ): Promise<ProductSearchIdentifier[]> {
    for (const input of inputs) {
      if (input.productId !== productId) {
        throw new Error("Search identifier productId must match replace key");
      }
    }
    await this.deleteByProductId(productId);
    return this.upsertMany(inputs);
  }

  @Transactional()
  async replaceForProducts(
    inputsByProductId: ReadonlyMap<string, readonly SearchIdentifierInput[]>,
  ): Promise<ProductSearchIdentifier[]> {
    if (inputsByProductId.size === 0) return [];
    const productIds = [...inputsByProductId.keys()];
    const inputs = [...inputsByProductId.entries()].flatMap(([productId, productInputs]) => {
      for (const input of productInputs) {
        if (input.productId !== productId) {
          throw new Error("Search identifier productId must match replace map key");
        }
      }
      return [...productInputs];
    });
    await this.deleteByProductIds(productIds);
    return this.upsertMany(inputs);
  }

  async deleteByProductId(productId: string): Promise<number> {
    const rows = await this.connection
      .delete(productSearchIdentifier)
      .where(
        and(
          eq(productSearchIdentifier.storeId, this.storeId),
          eq(productSearchIdentifier.productId, productId),
        ),
      )
      .returning({ productId: productSearchIdentifier.productId });
    return rows.length;
  }

  async delete(productId: string, locale: string, elementId: string): Promise<boolean> {
    const rows = await this.connection
      .delete(productSearchIdentifier)
      .where(
        and(
          eq(productSearchIdentifier.storeId, this.storeId),
          eq(productSearchIdentifier.productId, productId),
          eq(productSearchIdentifier.locale, locale),
          eq(productSearchIdentifier.kind, "SKU"),
          eq(productSearchIdentifier.elementId, elementId),
        ),
      )
      .returning({ productId: productSearchIdentifier.productId });
    return rows.length > 0;
  }

  @Transactional()
  async deleteByProductIds(productIds: readonly string[]): Promise<number> {
    if (productIds.length === 0) return 0;
    let deleted = 0;
    for (const batch of chunk([...new Set(productIds)])) {
      const rows = await this.connection
        .delete(productSearchIdentifier)
        .where(
          and(
            eq(productSearchIdentifier.storeId, this.storeId),
            inArray(productSearchIdentifier.productId, batch),
          ),
        )
        .returning({ productId: productSearchIdentifier.productId });
      deleted += rows.length;
    }
    return deleted;
  }

  async deleteByLocale(locale: string): Promise<number> {
    assertNonEmpty(locale, "locale");
    const rows = await this.connection
      .delete(productSearchIdentifier)
      .where(
        and(
          eq(productSearchIdentifier.storeId, this.storeId),
          eq(productSearchIdentifier.locale, locale),
        ),
      )
      .returning({ productId: productSearchIdentifier.productId });
    return rows.length;
  }

  private toInsert(input: SearchIdentifierInput, indexedAt: string): NewProductSearchIdentifier {
    assertPositiveInteger(input.productDocId, "productDocId");
    assertNonEmpty(input.locale, "locale");
    assertNonEmpty(input.normalizedValue, "normalizedValue");
    if (input.kind !== "SKU") {
      throw new Error(`Unsupported search identifier kind: ${input.kind}`);
    }
    return { ...input, storeId: this.storeId, indexedAt };
  }
}
