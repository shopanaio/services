import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  searchTermDictionary,
  type NewSearchTermDictionary,
  type SearchTermDictionary,
} from "../models/index.js";
import { assertNonEmpty, chunk, type SearchTermInput } from "./searchRepositoryTypes.js";

export class SearchTermRepository extends BaseRepository {
  @ReadOnly()
  async find(locale: string, term: string): Promise<SearchTermDictionary | null> {
    const rows = await this.connection
      .select()
      .from(searchTermDictionary)
      .where(
        and(
          eq(searchTermDictionary.storeId, this.storeId),
          eq(searchTermDictionary.locale, locale),
          eq(searchTermDictionary.term, term),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async list(locale: string): Promise<SearchTermDictionary[]> {
    assertNonEmpty(locale, "locale");
    return this.connection
      .select()
      .from(searchTermDictionary)
      .where(
        and(
          eq(searchTermDictionary.storeId, this.storeId),
          eq(searchTermDictionary.locale, locale),
        ),
      )
      .orderBy(asc(searchTermDictionary.term));
  }

  @ReadOnly()
  async count(locale?: string): Promise<number> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope =
      locale !== undefined
        ? and(
            eq(searchTermDictionary.storeId, this.storeId),
            eq(searchTermDictionary.locale, locale),
          )
        : eq(searchTermDictionary.storeId, this.storeId);
    const rows = await this.connection
      .select({ value: count() })
      .from(searchTermDictionary)
      .where(scope);
    return rows[0]?.value ?? 0;
  }

  @Transactional()
  async upsertMany(inputs: readonly SearchTermInput[]): Promise<SearchTermDictionary[]> {
    if (inputs.length === 0) return [];

    const uniqueInputs = [
      ...new Map(
        inputs.map((input) => [JSON.stringify([input.locale, input.term]), input]),
      ).values(),
    ].sort(
      (left, right) =>
        left.locale.localeCompare(right.locale) || left.term.localeCompare(right.term),
    );

    for (const batch of chunk(uniqueInputs)) {
      const values: NewSearchTermDictionary[] = batch.map((input) => {
        assertNonEmpty(input.locale, "locale");
        assertNonEmpty(input.term, "term");
        const codePointLength = [...input.term].length;
        if (codePointLength > 128) {
          throw new Error("Search dictionary term exceeds 128 code points");
        }
        return {
          storeId: this.storeId,
          locale: input.locale,
          term: input.term,
          codePointLength,
        };
      });

      await this.connection
        .insert(searchTermDictionary)
        .values(values)
        .onConflictDoUpdate({
          target: [
            searchTermDictionary.storeId,
            searchTermDictionary.locale,
            searchTermDictionary.term,
          ],
          set: { lastSeenAt: sql`now()` },
        });
    }

    const rows: SearchTermDictionary[] = [];
    const inputsByLocale = new Map<string, Set<string>>();
    for (const input of uniqueInputs) {
      const terms = inputsByLocale.get(input.locale) ?? new Set<string>();
      terms.add(input.term);
      inputsByLocale.set(input.locale, terms);
    }
    for (const [locale, terms] of inputsByLocale) {
      for (const termBatch of chunk([...terms])) {
        rows.push(
          ...(await this.connection
            .select()
            .from(searchTermDictionary)
            .where(
              and(
                eq(searchTermDictionary.storeId, this.storeId),
                eq(searchTermDictionary.locale, locale),
                inArray(searchTermDictionary.term, termBatch),
              ),
            )),
        );
      }
    }
    const byKey = new Map(rows.map((row) => [JSON.stringify([row.locale, row.term]), row]));
    return inputs.map((input) => {
      const row = byKey.get(JSON.stringify([input.locale, input.term]));
      if (!row) {
        throw new Error("Failed to load an upserted search dictionary term");
      }
      return row;
    });
  }

  async upsert(input: SearchTermInput): Promise<SearchTermDictionary> {
    const rows = await this.upsertMany([input]);
    const row = rows[0];
    if (!row) throw new Error("Failed to upsert search dictionary term");
    return row;
  }

  async deleteTerms(locale: string, terms: readonly string[]): Promise<number> {
    if (terms.length === 0) return 0;
    assertNonEmpty(locale, "locale");
    let deleted = 0;
    for (const batch of chunk([...new Set(terms)])) {
      const rows = await this.connection
        .delete(searchTermDictionary)
        .where(
          and(
            eq(searchTermDictionary.storeId, this.storeId),
            eq(searchTermDictionary.locale, locale),
            inArray(searchTermDictionary.term, batch),
          ),
        )
        .returning({ term: searchTermDictionary.term });
      deleted += rows.length;
    }
    return deleted;
  }

  async deleteByLocale(locale: string): Promise<number> {
    assertNonEmpty(locale, "locale");
    const rows = await this.connection
      .delete(searchTermDictionary)
      .where(
        and(
          eq(searchTermDictionary.storeId, this.storeId),
          eq(searchTermDictionary.locale, locale),
        ),
      )
      .returning({ term: searchTermDictionary.term });
    return rows.length;
  }

  /**
   * Bounded cleanup step for a completed full vocabulary reconciliation.
   * Callers must use the reconciliation start time as cutoff; item writes must
   * never invoke this method because the dictionary intentionally has no
   * product mappings.
   */
  @Transactional()
  async deleteStaleBefore(input: {
    locale: string;
    cutoff: string;
    maximumTerms: number;
  }): Promise<number> {
    assertNonEmpty(input.locale, "locale");
    const cutoff = new Date(input.cutoff);
    if (!Number.isFinite(cutoff.getTime()) || cutoff.toISOString() !== input.cutoff) {
      throw new Error("cutoff must be a canonical ISO timestamp");
    }
    if (
      !Number.isInteger(input.maximumTerms) ||
      input.maximumTerms <= 0 ||
      input.maximumTerms > 1_000
    ) {
      throw new Error("maximumTerms must be an integer between 1 and 1000");
    }
    const rows = await this.connection.execute<{ term: string } & Record<string, unknown>>(sql`
      WITH stale AS MATERIALIZED (
        SELECT dictionary.term
        FROM ${searchTermDictionary} dictionary
        WHERE dictionary.store_id = ${this.storeId}
          AND dictionary.locale = ${input.locale}
          AND dictionary.last_seen_at < ${input.cutoff}::timestamptz
        ORDER BY dictionary.last_seen_at ASC, dictionary.term ASC
        LIMIT ${input.maximumTerms}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM ${searchTermDictionary} dictionary
      USING stale
      WHERE dictionary.store_id = ${this.storeId}
        AND dictionary.locale = ${input.locale}
        AND dictionary.term = stale.term
      RETURNING dictionary.term
    `);
    return (rows as unknown as { term: string }[]).length;
  }
}
