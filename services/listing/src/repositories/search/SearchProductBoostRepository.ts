import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, count, eq, getTableColumns, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { BaseRepository } from "../BaseRepository.js";
import {
  searchConfigurationAudit,
  searchProductBoost,
  searchProductBoostPhrase,
  searchProductBoostProduct,
  type NewSearchConfigurationAudit,
  type NewSearchProductBoost,
  type NewSearchProductBoostPhrase,
  type NewSearchProductBoostProduct,
  type SearchProductBoost,
  type SearchProductBoostPhrase,
  type SearchProductBoostProduct,
} from "../models/index.js";
import {
  assertNonEmpty,
  assertUnique,
  type SearchAuditInput,
  type SearchOptimisticMutationResult,
  type SearchProductBoostAggregate,
  type SearchProductBoostPhraseInput,
} from "./searchRepositoryTypes.js";

export interface SearchProductBoostCreateInput extends SearchAuditInput {
  locale: string;
  name: string;
  enabled: boolean;
  phrases: readonly SearchProductBoostPhraseInput[];
  productIds: readonly string[];
}

export interface SearchProductBoostUpdateInput
  extends SearchProductBoostCreateInput {
  boostId: string;
  expectedVersion: number;
}

export interface SearchProductBoostDeleteInput extends SearchAuditInput {
  boostId: string;
  expectedVersion: number;
}

export interface SearchProductBoostPage {
  nodes: SearchProductBoostAggregate[];
  totalCount: number;
}

export class SearchProductBoostRepository extends BaseRepository {
  @ReadOnly()
  async listEnabledHeaders(locale: string): Promise<SearchProductBoost[]> {
    assertNonEmpty(locale, "locale");
    return this.connection
      .select()
      .from(searchProductBoost)
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.locale, locale),
          eq(searchProductBoost.enabled, true),
        ),
      )
      .orderBy(asc(searchProductBoost.boostId));
  }

  @ReadOnly()
  async findById(boostId: string): Promise<SearchProductBoostAggregate | null> {
    const boosts = await this.connection
      .select()
      .from(searchProductBoost)
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.boostId, boostId),
        ),
      )
      .limit(1);
    const boost = boosts[0];
    if (!boost) return null;
    const [phrases, products] = await Promise.all([
      this.getPhrases([boostId]),
      this.getProducts([boostId]),
    ]);
    return { boost, phrases, products };
  }

  @ReadOnly()
  async list(locale?: string): Promise<SearchProductBoostAggregate[]> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope = locale !== undefined
      ? and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.locale, locale),
        )
      : eq(searchProductBoost.storeId, this.storeId);
    const boosts = await this.connection
      .select()
      .from(searchProductBoost)
      .where(scope)
      .orderBy(
        asc(searchProductBoost.locale),
        asc(searchProductBoost.name),
        asc(searchProductBoost.boostId),
      );
    return this.loadAggregates(boosts);
  }

  @ReadOnly()
  async listPage(input: {
    locale?: string;
    limit: number;
    offset: number;
  }): Promise<SearchProductBoostPage> {
    this.assertPage(input.limit, input.offset);
    if (input.locale !== undefined) assertNonEmpty(input.locale, "locale");
    const scope = input.locale !== undefined
      ? and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.locale, input.locale),
        )
      : eq(searchProductBoost.storeId, this.storeId);
    const [boosts, countRows] = await Promise.all([
      this.connection
        .select()
        .from(searchProductBoost)
        .where(scope)
        .orderBy(
          asc(searchProductBoost.locale),
          asc(searchProductBoost.name),
          asc(searchProductBoost.boostId),
        )
        .limit(input.limit)
        .offset(input.offset),
      this.connection
        .select({ value: count() })
        .from(searchProductBoost)
        .where(scope),
    ]);
    return {
      nodes: await this.loadAggregates(boosts),
      totalCount: countRows[0]?.value ?? 0,
    };
  }

  @ReadOnly()
  async findApplicable(input: {
    locale: string;
    normalizedPhrase: string;
    normalizationContractVersion: string;
    normalizationProfileRevision: string;
  }): Promise<SearchProductBoostAggregate[]> {
    assertNonEmpty(input.locale, "locale");
    assertNonEmpty(input.normalizedPhrase, "normalizedPhrase");
    const rows = await this.connection
      .select({ ...getTableColumns(searchProductBoost) })
      .from(searchProductBoost)
      .innerJoin(
        searchProductBoostPhrase,
        and(
          eq(searchProductBoostPhrase.storeId, this.storeId),
          eq(searchProductBoostPhrase.boostId, searchProductBoost.boostId),
          eq(searchProductBoostPhrase.normalizedPhrase, input.normalizedPhrase),
          eq(
            searchProductBoostPhrase.normalizationContractVersion,
            input.normalizationContractVersion,
          ),
          eq(
            searchProductBoostPhrase.normalizationProfileRevision,
            input.normalizationProfileRevision,
          ),
        ),
      )
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.locale, input.locale),
          eq(searchProductBoost.enabled, true),
        ),
      )
      .orderBy(asc(searchProductBoost.boostId));

    const boosts = [...new Map(rows.map((boost) => [boost.boostId, boost])).values()];
    return this.loadAggregates(boosts);
  }

  @Transactional()
  async create(
    input: SearchProductBoostCreateInput,
  ): Promise<SearchProductBoostAggregate> {
    this.assertWriteInput(input);
    const now = new Date().toISOString();
    const boostId = uuidv7();
    const row: NewSearchProductBoost = {
      storeId: this.storeId,
      boostId,
      locale: input.locale,
      name: input.name,
      enabled: input.enabled,
      version: 1,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    const boosts = await this.connection
      .insert(searchProductBoost)
      .values(row)
      .returning();
    const boost = boosts[0];
    if (!boost) throw new Error("Failed to create search product boost");
    const phrases = await this.insertPhrases(boostId, input.phrases);
    const products = await this.insertProducts(boostId, input.productIds);
    const aggregate = { boost, phrases, products };
    await this.insertAudit({
      boostId,
      version: 1,
      action: "create",
      beforeValue: null,
      afterValue: this.toAuditValue(aggregate),
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return aggregate;
  }

  @Transactional()
  async update(
    input: SearchProductBoostUpdateInput,
  ): Promise<SearchOptimisticMutationResult<SearchProductBoostAggregate>> {
    this.assertWriteInput(input);
    this.assertExpectedVersion(input.expectedVersion);
    const current = await this.lockBoost(input.boostId);
    if (!current) return { status: "not_found" };
    if (current.version !== input.expectedVersion) {
      return { status: "conflict", currentVersion: current.version };
    }
    const before = await this.aggregateForLockedBoost(current);

    await this.connection
      .delete(searchProductBoostPhrase)
      .where(
        and(
          eq(searchProductBoostPhrase.storeId, this.storeId),
          eq(searchProductBoostPhrase.boostId, input.boostId),
        ),
      );
    await this.connection
      .delete(searchProductBoostProduct)
      .where(
        and(
          eq(searchProductBoostProduct.storeId, this.storeId),
          eq(searchProductBoostProduct.boostId, input.boostId),
        ),
      );

    const nextVersion = current.version + 1;
    const boosts = await this.connection
      .update(searchProductBoost)
      .set({
        locale: input.locale,
        name: input.name,
        enabled: input.enabled,
        version: nextVersion,
        updatedBy: input.actorId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.boostId, input.boostId),
          eq(searchProductBoost.version, current.version),
        ),
      )
      .returning();
    const boost = boosts[0];
    if (!boost) throw new Error("Search product boost update lost its locked row");
    const phrases = await this.insertPhrases(input.boostId, input.phrases);
    const products = await this.insertProducts(input.boostId, input.productIds);
    const aggregate = { boost, phrases, products };
    await this.insertAudit({
      boostId: input.boostId,
      version: nextVersion,
      action: "update",
      beforeValue: this.toAuditValue(before),
      afterValue: this.toAuditValue(aggregate),
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return { status: "applied", value: aggregate };
  }

  @Transactional()
  async delete(
    input: SearchProductBoostDeleteInput,
  ): Promise<SearchOptimisticMutationResult<SearchProductBoostAggregate>> {
    this.assertAudit(input);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion <= 0) {
      throw new Error("expectedVersion must be a positive integer");
    }
    const current = await this.lockBoost(input.boostId);
    if (!current) return { status: "not_found" };
    if (current.version !== input.expectedVersion) {
      return { status: "conflict", currentVersion: current.version };
    }
    const aggregate = await this.aggregateForLockedBoost(current);
    const rows = await this.connection
      .delete(searchProductBoost)
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.boostId, input.boostId),
          eq(searchProductBoost.version, current.version),
        ),
      )
      .returning({ boostId: searchProductBoost.boostId });
    if (rows.length !== 1) {
      throw new Error("Search product boost delete lost its locked row");
    }
    await this.insertAudit({
      boostId: input.boostId,
      version: current.version,
      action: "delete",
      beforeValue: this.toAuditValue(aggregate),
      afterValue: null,
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return { status: "applied", value: aggregate };
  }

  private async lockBoost(boostId: string): Promise<SearchProductBoost | null> {
    const rows = await this.connection
      .select()
      .from(searchProductBoost)
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.boostId, boostId),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  private async getPhrases(boostIds: readonly string[]): Promise<SearchProductBoostPhrase[]> {
    if (boostIds.length === 0) return [];
    return this.connection
      .select()
      .from(searchProductBoostPhrase)
      .where(
        and(
          eq(searchProductBoostPhrase.storeId, this.storeId),
          inArray(searchProductBoostPhrase.boostId, [...new Set(boostIds)]),
        ),
      )
      .orderBy(
        asc(searchProductBoostPhrase.boostId),
        asc(searchProductBoostPhrase.position),
      );
  }

  private async getProducts(boostIds: readonly string[]): Promise<SearchProductBoostProduct[]> {
    if (boostIds.length === 0) return [];
    return this.connection
      .select()
      .from(searchProductBoostProduct)
      .where(
        and(
          eq(searchProductBoostProduct.storeId, this.storeId),
          inArray(searchProductBoostProduct.boostId, [...new Set(boostIds)]),
        ),
      )
      .orderBy(
        asc(searchProductBoostProduct.boostId),
        asc(searchProductBoostProduct.position),
      );
  }

  private async loadAggregates(
    boosts: readonly SearchProductBoost[],
  ): Promise<SearchProductBoostAggregate[]> {
    const ids = boosts.map((boost) => boost.boostId);
    const [phrases, products] = await Promise.all([
      this.getPhrases(ids),
      this.getProducts(ids),
    ]);
    const phrasesByBoost = new Map<string, SearchProductBoostPhrase[]>();
    const productsByBoost = new Map<string, SearchProductBoostProduct[]>();
    for (const phrase of phrases) {
      const values = phrasesByBoost.get(phrase.boostId) ?? [];
      values.push(phrase);
      phrasesByBoost.set(phrase.boostId, values);
    }
    for (const product of products) {
      const values = productsByBoost.get(product.boostId) ?? [];
      values.push(product);
      productsByBoost.set(product.boostId, values);
    }
    return boosts.map((boost) => ({
      boost,
      phrases: phrasesByBoost.get(boost.boostId) ?? [],
      products: productsByBoost.get(boost.boostId) ?? [],
    }));
  }

  private async aggregateForLockedBoost(
    boost: SearchProductBoost,
  ): Promise<SearchProductBoostAggregate> {
    const [phrases, products] = await Promise.all([
      this.getPhrases([boost.boostId]),
      this.getProducts([boost.boostId]),
    ]);
    return { boost, phrases, products };
  }

  private async insertPhrases(
    boostId: string,
    phrases: readonly SearchProductBoostPhraseInput[],
  ): Promise<SearchProductBoostPhrase[]> {
    const rows: NewSearchProductBoostPhrase[] = phrases.map((phrase, index) => ({
      storeId: this.storeId,
      boostId,
      phraseId: uuidv7(),
      position: index + 1,
      ...phrase,
    }));
    return this.connection
      .insert(searchProductBoostPhrase)
      .values(rows)
      .returning();
  }

  private async insertProducts(
    boostId: string,
    productIds: readonly string[],
  ): Promise<SearchProductBoostProduct[]> {
    const rows: NewSearchProductBoostProduct[] = productIds.map(
      (productId, index) => ({
        storeId: this.storeId,
        boostId,
        productId,
        position: index + 1,
      }),
    );
    return this.connection
      .insert(searchProductBoostProduct)
      .values(rows)
      .returning();
  }

  private async insertAudit(input: {
    boostId: string;
    version: number;
    action: "create" | "update" | "delete";
    beforeValue: unknown | null;
    afterValue: unknown | null;
    actorId: string;
    requestId: string;
  }): Promise<void> {
    const audit: NewSearchConfigurationAudit = {
      storeId: this.storeId,
      auditId: uuidv7(),
      resourceVersion: input.version,
      resourceType: "product_boost",
      resourceId: input.boostId,
      action: input.action,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      actorId: input.actorId,
      requestId: input.requestId,
    };
    await this.connection.insert(searchConfigurationAudit).values(audit);
  }

  private toAuditValue(
    aggregate: SearchProductBoostAggregate,
  ): Record<string, unknown> {
    return {
      boostId: aggregate.boost.boostId,
      locale: aggregate.boost.locale,
      name: aggregate.boost.name,
      enabled: aggregate.boost.enabled,
      version: aggregate.boost.version,
      phrases: aggregate.phrases.map((phrase) => ({
        phraseId: phrase.phraseId,
        position: phrase.position,
        displayPhrase: phrase.displayPhrase,
      })),
      products: aggregate.products.map((product) => ({
        productId: product.productId,
        position: product.position,
      })),
    };
  }

  private assertWriteInput(input: SearchProductBoostCreateInput): void {
    this.assertAudit(input);
    assertNonEmpty(input.locale, "locale");
    assertNonEmpty(input.name, "name");
    if (input.phrases.length < 1 || input.phrases.length > 20) {
      throw new Error("A product boost must contain between 1 and 20 phrases");
    }
    if (input.productIds.length < 1 || input.productIds.length > 50) {
      throw new Error("A product boost must contain between 1 and 50 products");
    }
    assertUnique(
      input.phrases,
      (phrase) => phrase.normalizedPhrase,
      "product boost phrase",
    );
    assertUnique(input.productIds, (productId) => productId, "boost product");
    const firstPhrase = input.phrases[0];
    for (const phrase of input.phrases) {
      assertNonEmpty(phrase.displayPhrase, "displayPhrase");
      assertNonEmpty(phrase.normalizedPhrase, "normalizedPhrase");
      assertNonEmpty(
        phrase.normalizationContractVersion,
        "normalizationContractVersion",
      );
      assertNonEmpty(
        phrase.normalizationProfileRevision,
        "normalizationProfileRevision",
      );
      if (
        phrase.normalizationContractVersion !==
          firstPhrase.normalizationContractVersion ||
        phrase.normalizationProfileRevision !==
          firstPhrase.normalizationProfileRevision
      ) {
        throw new Error("All boost phrases must use one normalization profile");
      }
    }
  }

  private assertAudit(input: SearchAuditInput): void {
    assertNonEmpty(input.actorId, "actorId");
    assertNonEmpty(input.requestId, "requestId");
  }

  private assertPage(limit: number, offset: number): void {
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new Error("limit must be an integer between 1 and 100");
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("offset must be a non-negative integer");
    }
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new Error("expectedVersion must be a positive integer");
    }
  }
}
