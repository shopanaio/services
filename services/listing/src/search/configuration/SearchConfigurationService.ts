import type { Cache } from "cache-manager";
import type { SearchProductBoostRepository } from "../../repositories/search/SearchProductBoostRepository.js";
import type { SearchSynonymRepository } from "../../repositories/search/SearchSynonymRepository.js";
import type { SearchProductBoostAggregate } from "../../repositories/search/searchRepositoryTypes.js";
import type {
  CompiledLocaleSynonyms,
  CompiledSearchSynonymGroup,
  CompiledSearchSynonymTrieNode,
} from "../planner/types.js";
import { searchProductBoostCacheKey, searchSynonymsCacheKey } from "./cacheKeys.js";

export interface CachedApplicableProductBoost {
  readonly boostId: string;
  readonly updatedAt: string;
  readonly locale: string;
  readonly normalizationContractVersion: string;
  readonly normalizationProfileRevision: string;
  readonly normalizedPhrases: readonly string[];
  readonly productIds: readonly string[];
}

export class SearchConfigurationService {
  constructor(
    private readonly cache: Cache,
    private readonly synonyms: SearchSynonymRepository,
    private readonly boosts: SearchProductBoostRepository,
  ) {}

  async loadSynonyms(input: {
    storeId: string;
    locale: string;
    normalizationContractVersion: string;
    normalizationProfileRevision: string;
  }): Promise<CompiledLocaleSynonyms> {
    return this.loadSynonymsConsistently(input, 0);
  }

  private async loadSynonymsConsistently(
    input: {
      storeId: string;
      locale: string;
      normalizationContractVersion: string;
      normalizationProfileRevision: string;
    },
    retry: number,
  ): Promise<CompiledLocaleSynonyms> {
    const key = searchSynonymsCacheKey(input.storeId, input.locale);
    const fingerprint = synonymHeadersFingerprint(
      await this.synonyms.listEnabledHeaders(input.locale),
    );
    const cached = await this.cache.get<CompiledLocaleSynonyms>(key);
    if (
      cached &&
      cached.resourceFingerprint === fingerprint &&
      cached.normalizationContractVersion === input.normalizationContractVersion &&
      cached.normalizationProfileRevision === input.normalizationProfileRevision
    ) {
      return cached;
    }

    const rows = await this.synonyms.findEnabledByLocale(input);
    const confirmedFingerprint = synonymHeadersFingerprint(
      await this.synonyms.listEnabledHeaders(input.locale),
    );
    if (confirmedFingerprint !== fingerprint) {
      if (retry >= 2) {
        throw new Error("Synonym configuration changed repeatedly during cache fill");
      }
      return this.loadSynonymsConsistently(input, retry + 1);
    }
    const compiled = compileLocaleSynonyms(rows, {
      ...input,
      resourceFingerprint: confirmedFingerprint,
    });
    await this.cache.set(key, compiled);
    return compiled;
  }

  async loadApplicableBoosts(input: {
    storeId: string;
    locale: string;
    normalizedPhrase: string;
    normalizationContractVersion: string;
    normalizationProfileRevision: string;
  }): Promise<readonly CachedApplicableProductBoost[]> {
    const headers = await this.boosts.listEnabledHeaders(input.locale);
    const compiled = await Promise.all(
      headers.map(async (header) => {
        const key = searchProductBoostCacheKey(input.storeId, input.locale, header.boostId);
        const cached = await this.cache.get<CachedApplicableProductBoost>(key);
        if (
          cached &&
          cached.updatedAt === header.updatedAt &&
          cached.normalizationContractVersion === input.normalizationContractVersion &&
          cached.normalizationProfileRevision === input.normalizationProfileRevision
        ) {
          return cached;
        }

        const aggregate = await this.boosts.findById(header.boostId);
        if (!aggregate || !aggregate.boost.enabled) return null;
        const value = compileProductBoost(aggregate);
        await this.cache.set(key, value);
        return value;
      }),
    );

    return Object.freeze(
      compiled
        .filter((value): value is CachedApplicableProductBoost => value !== null)
        .filter(
          (value) =>
            value.normalizationContractVersion === input.normalizationContractVersion &&
            value.normalizationProfileRevision === input.normalizationProfileRevision,
        )
        .filter((value) => value.normalizedPhrases.includes(input.normalizedPhrase))
        .sort((left, right) => left.boostId.localeCompare(right.boostId)),
    );
  }
}

function compileLocaleSynonyms(
  rows: Awaited<ReturnType<SearchSynonymRepository["findEnabledByLocale"]>>,
  profile: {
    resourceFingerprint: string;
    normalizationContractVersion: string;
    normalizationProfileRevision: string;
  },
): CompiledLocaleSynonyms {
  const groups: CompiledSearchSynonymGroup[] = rows.map((aggregate) =>
    Object.freeze({
      groupId: aggregate.group.groupId,
      values: Object.freeze(
        aggregate.values.map((value) =>
          Object.freeze({
            preparedText: value.preparedText,
            lexemes: Object.freeze(value.preparedText.split(/\s+/u).filter(Boolean)),
            normalizationContractVersion: value.normalizationContractVersion,
            normalizationProfileRevision: value.normalizationProfileRevision,
          }),
        ),
      ),
    }),
  );
  groups.sort((left, right) => left.groupId.localeCompare(right.groupId));
  return Object.freeze({
    resourceFingerprint: profile.resourceFingerprint,
    normalizationContractVersion: profile.normalizationContractVersion,
    normalizationProfileRevision: profile.normalizationProfileRevision,
    groups: Object.freeze(groups),
    trie: buildSynonymTrie(groups),
  });
}

function synonymHeadersFingerprint(
  headers: readonly { groupId: string; updatedAt: string }[],
): string {
  return JSON.stringify(headers.map((header) => [header.groupId, header.updatedAt]));
}

interface MutableTrieNode {
  children: Record<string, MutableTrieNode>;
  groupIds: Set<string>;
}

function buildSynonymTrie(
  groups: readonly CompiledSearchSynonymGroup[],
): CompiledSearchSynonymTrieNode {
  const root: MutableTrieNode = { children: {}, groupIds: new Set() };
  for (const group of groups) {
    for (const value of group.values) {
      let node = root;
      for (const lexeme of value.lexemes) {
        node.children[lexeme] ??= { children: {}, groupIds: new Set() };
        node = node.children[lexeme];
      }
      node.groupIds.add(group.groupId);
    }
  }
  return freezeTrie(root);
}

function freezeTrie(node: MutableTrieNode): CompiledSearchSynonymTrieNode {
  const children = Object.fromEntries(
    Object.entries(node.children)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([lexeme, child]) => [lexeme, freezeTrie(child)]),
  );
  return Object.freeze({
    children: Object.freeze(children),
    groupIds: Object.freeze([...node.groupIds].sort()),
  });
}

function compileProductBoost(aggregate: SearchProductBoostAggregate): CachedApplicableProductBoost {
  const firstPhrase = aggregate.phrases[0];
  if (!firstPhrase) {
    throw new Error(`Product boost ${aggregate.boost.boostId} has no phrases`);
  }
  if (
    aggregate.phrases.some(
      (phrase) =>
        phrase.normalizationContractVersion !== firstPhrase.normalizationContractVersion ||
        phrase.normalizationProfileRevision !== firstPhrase.normalizationProfileRevision,
    )
  ) {
    throw new Error(
      `Product boost ${aggregate.boost.boostId} contains mixed normalization profiles`,
    );
  }
  return Object.freeze({
    boostId: aggregate.boost.boostId,
    updatedAt: aggregate.boost.updatedAt,
    locale: aggregate.boost.locale,
    normalizationContractVersion: firstPhrase.normalizationContractVersion,
    normalizationProfileRevision: firstPhrase.normalizationProfileRevision,
    normalizedPhrases: Object.freeze(
      aggregate.phrases
        .map((phrase) => phrase.normalizedPhrase)
        .sort((left, right) => left.localeCompare(right)),
    ),
    productIds: Object.freeze(
      aggregate.products
        .map((product) => product.productId)
        .sort((left, right) => left.localeCompare(right)),
    ),
  });
}
