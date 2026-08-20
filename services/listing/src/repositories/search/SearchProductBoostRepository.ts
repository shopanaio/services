import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { and, asc, eq, getTableColumns, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  searchProductBoost,
  searchProductBoostListView,
  searchProductBoostPhrase,
  searchProductBoostProduct,
  type NewSearchProductBoost,
  type NewSearchProductBoostPhrase,
  type NewSearchProductBoostProduct,
  type SearchProductBoost,
  type SearchProductBoostListView,
  type SearchProductBoostPhrase,
  type SearchProductBoostProduct,
} from "../models/index.js";
import {
  assertNonEmpty,
  assertUnique,
  type SearchOptimisticMutationResult,
  type SearchProductBoostAggregate,
  type SearchProductBoostPhraseInput,
} from "./searchRepositoryTypes.js";
import {
  decodeSearchProductBoostGlobalId,
  normalizeSearchRelayPagination,
} from "./searchConnectionInput.js";

export const searchProductBoostRelayQuery = createRelayQuery(
  createQuery(searchProductBoostListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeSearchProductBoostGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "searchProductBoost", tieBreaker: "id" },
);

export type SearchProductBoostRelayInput = InferRelayInput<typeof searchProductBoostRelayQuery>;

export type SearchProductBoostConnectionInput = SearchProductBoostRelayInput & {
  productIds?: readonly string[];
};

export interface SearchProductBoostConnectionResult {
  edges: Array<{ cursor: string; node: SearchProductBoostListView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

const IMPOSSIBLE_UUID = "00000000-0000-0000-0000-000000000000";

export interface SearchProductBoostCreateInput {
  locale: string;
  name: string;
  enabled: boolean;
  phrases: readonly SearchProductBoostPhraseInput[];
  productIds: readonly string[];
}

export interface SearchProductBoostUpdateInput extends SearchProductBoostCreateInput {
  boostId: string;
  expectedVersion: number;
}

export interface SearchProductBoostDeleteInput {
  boostId: string;
  expectedVersion: number;
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
        and(eq(searchProductBoost.storeId, this.storeId), eq(searchProductBoost.boostId, boostId)),
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
    const scope =
      locale !== undefined
        ? and(eq(searchProductBoost.storeId, this.storeId), eq(searchProductBoost.locale, locale))
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
  async getConnection(
    args: SearchProductBoostConnectionInput,
  ): Promise<SearchProductBoostConnectionResult> {
    const { productIds, ...relayInput } = args;
    const normalizedInput = normalizeSearchRelayPagination(relayInput);
    const { where, orderBy, ...paginationArgs } = normalizedInput;
    const effectiveOrderBy = orderBy ?? [{ field: "updatedAt", direction: "desc" }];
    const normalizedProductIds =
      productIds === undefined ? undefined : [...new Set(productIds)].sort();
    const matchingBoostIds =
      normalizedProductIds === undefined
        ? undefined
        : await this.findBoostIdsByProductIds(normalizedProductIds);
    const mergedWhere: SearchProductBoostRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        ...(where ? [where] : []),
        ...(matchingBoostIds === undefined
          ? []
          : [
              {
                id: {
                  _in: matchingBoostIds.length > 0 ? matchingBoostIds : [IMPOSSIBLE_UUID],
                },
              },
            ]),
      ],
    };
    const executeInput: SearchProductBoostRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: effectiveOrderBy,
      filters: {
        storeId: this.storeId,
        where: where ?? null,
        orderBy: effectiveOrderBy,
        productIds: normalizedProductIds ?? null,
      },
    };

    const [result, totalCount] = await Promise.all([
      searchProductBoostRelayQuery.execute(this.connection, executeInput),
      searchProductBoostRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);

    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, node })),
      pageInfo: result.pageInfo,
      totalCount,
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
  async create(input: SearchProductBoostCreateInput): Promise<SearchProductBoostAggregate> {
    this.assertWriteInput(input);
    const now = new Date().toISOString();
    const boostId = await this.generateUuidV7();
    const row: NewSearchProductBoost = {
      storeId: this.storeId,
      boostId,
      locale: input.locale,
      name: input.name,
      enabled: input.enabled,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const boosts = await this.connection.insert(searchProductBoost).values(row).returning();
    const boost = boosts[0];
    if (!boost) throw new Error("Failed to create search product boost");
    const phrases = await this.insertPhrases(boostId, input.phrases);
    const products = await this.insertProducts(boostId, input.productIds);
    const aggregate = { boost, phrases, products };
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
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(searchProductBoost.storeId, this.storeId),
          eq(searchProductBoost.boostId, input.boostId),
          eq(searchProductBoost.version, input.expectedVersion),
        ),
      )
      .returning();
    const boost = boosts[0];
    if (!boost) throw new Error("Search product boost update lost its locked row");
    const phrases = await this.insertPhrases(input.boostId, input.phrases);
    const products = await this.insertProducts(input.boostId, input.productIds);
    const aggregate = { boost, phrases, products };
    return { status: "applied", value: aggregate };
  }

  @Transactional()
  async delete(
    input: SearchProductBoostDeleteInput,
  ): Promise<SearchOptimisticMutationResult<SearchProductBoostAggregate>> {
    this.assertExpectedVersion(input.expectedVersion);
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
          eq(searchProductBoost.version, input.expectedVersion),
        ),
      )
      .returning({ boostId: searchProductBoost.boostId });
    if (rows.length !== 1) {
      throw new Error("Search product boost delete lost its locked row");
    }
    return { status: "applied", value: aggregate };
  }

  private async lockBoost(boostId: string): Promise<SearchProductBoost | null> {
    const rows = await this.connection
      .select()
      .from(searchProductBoost)
      .where(
        and(eq(searchProductBoost.storeId, this.storeId), eq(searchProductBoost.boostId, boostId)),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new Error("expectedVersion must be a positive integer");
    }
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
      .orderBy(asc(searchProductBoostPhrase.boostId), asc(searchProductBoostPhrase.position));
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
      .orderBy(asc(searchProductBoostProduct.boostId), asc(searchProductBoostProduct.position));
  }

  private async findBoostIdsByProductIds(productIds: readonly string[]): Promise<string[]> {
    if (productIds.length === 0) return [];

    const rows = await this.connection
      .selectDistinct({ boostId: searchProductBoostProduct.boostId })
      .from(searchProductBoostProduct)
      .where(
        and(
          eq(searchProductBoostProduct.storeId, this.storeId),
          inArray(searchProductBoostProduct.productId, [...productIds]),
        ),
      )
      .orderBy(asc(searchProductBoostProduct.boostId));

    return rows.map((row) => row.boostId);
  }

  private async loadAggregates(
    boosts: readonly SearchProductBoost[],
  ): Promise<SearchProductBoostAggregate[]> {
    const ids = boosts.map((boost) => boost.boostId);
    const [phrases, products] = await Promise.all([this.getPhrases(ids), this.getProducts(ids)]);
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
    const ids = await this.generateUuidV7s(phrases.length);
    const rows: NewSearchProductBoostPhrase[] = phrases.map((phrase, index) => ({
      storeId: this.storeId,
      boostId,
      phraseId: ids[index],
      position: index + 1,
      ...phrase,
    }));
    return this.connection.insert(searchProductBoostPhrase).values(rows).returning();
  }

  private async insertProducts(
    boostId: string,
    productIds: readonly string[],
  ): Promise<SearchProductBoostProduct[]> {
    const rows: NewSearchProductBoostProduct[] = productIds.map((productId, index) => ({
      storeId: this.storeId,
      boostId,
      productId,
      position: index + 1,
    }));
    return this.connection.insert(searchProductBoostProduct).values(rows).returning();
  }

  private assertWriteInput(input: SearchProductBoostCreateInput): void {
    assertNonEmpty(input.locale, "locale");
    assertNonEmpty(input.name, "name");
    if (input.phrases.length < 1 || input.phrases.length > 20) {
      throw new Error("A product boost must contain between 1 and 20 phrases");
    }
    if (input.productIds.length < 1 || input.productIds.length > 50) {
      throw new Error("A product boost must contain between 1 and 50 products");
    }
    assertUnique(input.phrases, (phrase) => phrase.normalizedPhrase, "product boost phrase");
    assertUnique(input.productIds, (productId) => productId, "boost product");
    const firstPhrase = input.phrases[0];
    for (const phrase of input.phrases) {
      assertNonEmpty(phrase.displayPhrase, "displayPhrase");
      assertNonEmpty(phrase.normalizedPhrase, "normalizedPhrase");
      assertNonEmpty(phrase.normalizationContractVersion, "normalizationContractVersion");
      assertNonEmpty(phrase.normalizationProfileRevision, "normalizationProfileRevision");
      if (
        phrase.normalizationContractVersion !== firstPhrase.normalizationContractVersion ||
        phrase.normalizationProfileRevision !== firstPhrase.normalizationProfileRevision
      ) {
        throw new Error("All boost phrases must use one normalization profile");
      }
    }
  }
}
