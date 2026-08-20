import { createHash } from "node:crypto";
import { indexUnavailable, normalizationFailure } from "../errors.js";
import { SEARCH_NORMALIZATION_LIMITS } from "../normalization/limits.js";
import type { SearchLexicalUnit } from "../normalization/types.js";
import { SearchFieldRegistry } from "./SearchFieldRegistry.js";
import type {
  BuildSearchQueryPlanInput,
  CompiledLocaleSynonyms,
  CompiledSearchSynonymGroup,
  ExpandedFuzzySearchQueryPlan,
  SearchClause,
  SearchQueryPlan,
  SearchRequiredUnit,
  VerifiedTypoAlternative,
} from "./types.js";

interface SynonymMatch {
  readonly length: number;
  readonly groups: readonly CompiledSearchSynonymGroup[];
}

export class SearchQueryPlanBuilder {
  constructor(private readonly fields = new SearchFieldRegistry()) {}

  buildPrimary(input: BuildSearchQueryPlanInput): SearchQueryPlan {
    const enabledFields = this.fields.normalizeEnabledFields(input.enabledFields);
    const synonyms = validateSynonyms(input);
    const units = input.lexicalizedQuery.originalUnits;
    if (units.length === 0) {
      throw normalizationFailure("Cannot plan a query without lexical units");
    }

    const requiredUnits: SearchRequiredUnit[] = [];
    const matchedGroupIds = new Set<string>();
    let sourceIndex = 0;
    while (sourceIndex < units.length) {
      const match = findLongestSynonymMatch(units, sourceIndex, synonyms);
      const length = match?.length ?? 1;
      const sourceUnits = units.slice(sourceIndex, sourceIndex + length);
      const originalClause = textClause(
        sourceUnits.flatMap((unit) => unit.ftsLexemes),
        enabledFields,
      );
      const primaryAlternatives: SearchClause[] = [originalClause];

      for (const group of match?.groups ?? []) {
        matchedGroupIds.add(group.groupId);
        const alternatives = group.values.map((value) => textClause(value.lexemes, enabledFields));
        primaryAlternatives.push(
          Object.freeze({
            kind: "synonym",
            groupId: group.groupId,
            alternatives: freezeArray(alternatives),
          }),
        );
      }

      const identifierValue = sourceUnits.map((unit) => unit.normalizedText).join(" ");
      const identifierAlternatives = identifierClauses(identifierValue);
      const typoTerms = sourceUnits.flatMap((unit) => unit.typoTerms);
      requiredUnits.push(
        Object.freeze({
          index: requiredUnits.length,
          sourceUnitIndexes: freezeArray(sourceUnits.map((unit) => unit.sourceIndex)),
          primaryAlternatives: freezeArray(primaryAlternatives),
          originalTypoAlternative:
            typoTerms.length === 0
              ? null
              : Object.freeze({
                  kind: "typoTerms",
                  terms: freezeArray(typoTerms),
                  fields: enabledFields,
                  maxDistance: 1,
                  requireSameElement: sourceUnits.length > 1,
                }),
          originalIdentifierAlternatives: freezeArray(identifierAlternatives),
        }),
      );
      sourceIndex += length;
    }

    if (matchedGroupIds.size > SEARCH_NORMALIZATION_LIMITS.synonymGroupsPerQuery) {
      throw indexUnavailable(
        `Search query matches more than ${SEARCH_NORMALIZATION_LIMITS.synonymGroupsPerQuery} synonym groups`,
      );
    }

    const clauseCount = countClauses(requiredUnits);
    if (clauseCount > SEARCH_NORMALIZATION_LIMITS.plannerClauses) {
      throw indexUnavailable("Search query plan exceeds clause limits");
    }

    const applicableBoostProductIds = freezeArray(
      [...new Set(input.applicableBoostProductIds ?? [])].sort(),
    );
    const planWithoutFingerprint = {
      requiredUnits: freezeArray(requiredUnits),
      wholeQueryIdentifierAlternatives: freezeArray(
        identifierClauses(input.lexicalizedQuery.identifierForm),
      ),
      matchedSynonymGroupIds: freezeArray([...matchedGroupIds].sort()),
      applicableBoostProductIds,
      enabledFields,
      normalizationContractVersion: input.lexicalizedQuery.normalizationContractVersion,
      normalizationProfileRevision: input.lexicalizedQuery.profileRevision,
    };
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(planWithoutFingerprint))
      .digest("hex");

    return Object.freeze({ ...planWithoutFingerprint, fingerprint });
  }

  buildExpandedFuzzy(input: {
    primaryPlan: SearchQueryPlan;
    verifiedAlternativesByUnit: ReadonlyMap<number, readonly VerifiedTypoAlternative[]>;
  }): ExpandedFuzzySearchQueryPlan {
    const alternatives = new Map<number, readonly VerifiedTypoAlternative[]>();
    for (const unit of input.primaryPlan.requiredUnits) {
      const typoClause = unit.originalTypoAlternative;
      if (!typoClause || typoClause.kind !== "typoTerms") {
        alternatives.set(unit.index, Object.freeze([]));
        continue;
      }
      const expectedTerms = new Set(typoClause.terms);
      const unitAlternatives = [...(input.verifiedAlternativesByUnit.get(unit.index) ?? [])].sort(
        compareVerifiedAlternative,
      );
      const seen = new Set<string>();
      for (const alternative of unitAlternatives) {
        if (
          !expectedTerms.has(alternative.inputTerm) ||
          !alternative.vocabularyTerm ||
          (alternative.editDistance !== 0 && alternative.editDistance !== 1) ||
          !Number.isFinite(alternative.trigramSimilarity) ||
          alternative.trigramSimilarity < 0 ||
          alternative.trigramSimilarity > 1 ||
          alternative.ftsLexemes.length === 0 ||
          alternative.ftsLexemes.some((lexeme) => !lexeme || /\s/u.test(lexeme))
        ) {
          throw indexUnavailable("Expanded typo plan contains an invalid alternative");
        }
        const key = JSON.stringify([
          alternative.inputTerm,
          alternative.vocabularyTerm,
          alternative.ftsLexemes,
        ]);
        if (seen.has(key)) {
          throw indexUnavailable("Expanded typo plan contains duplicate alternatives");
        }
        seen.add(key);
      }
      alternatives.set(
        unit.index,
        freezeArray(
          unitAlternatives.map((value) =>
            Object.freeze({
              ...value,
              ftsLexemes: freezeArray(value.ftsLexemes),
            }),
          ),
        ),
      );
    }
    for (const key of input.verifiedAlternativesByUnit.keys()) {
      if (!input.primaryPlan.requiredUnits.some((unit) => unit.index === key)) {
        throw indexUnavailable("Expanded typo plan references an unknown unit");
      }
    }

    const serializedAlternatives = [...alternatives].map(([unitIndex, values]) => ({
      unitIndex,
      values,
    }));
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          primaryFingerprint: input.primaryPlan.fingerprint,
          verifiedAlternatives: serializedAlternatives,
        }),
      )
      .digest("hex");
    return Object.freeze({
      ...input.primaryPlan,
      fingerprint,
      verifiedAlternativesByUnit: new ReadonlyMapView(alternatives),
    });
  }
}

function compareVerifiedAlternative(
  left: VerifiedTypoAlternative,
  right: VerifiedTypoAlternative,
): number {
  return (
    left.inputTerm.localeCompare(right.inputTerm) ||
    left.editDistance - right.editDistance ||
    right.trigramSimilarity - left.trigramSimilarity ||
    left.vocabularyTerm.localeCompare(right.vocabularyTerm)
  );
}

class ReadonlyMapView<K, V> implements ReadonlyMap<K, V> {
  readonly #values: Map<K, V>;

  constructor(values: ReadonlyMap<K, V>) {
    this.#values = new Map(values);
    Object.freeze(this);
  }

  get size(): number {
    return this.#values.size;
  }

  get(key: K): V | undefined {
    return this.#values.get(key);
  }

  has(key: K): boolean {
    return this.#values.has(key);
  }

  forEach(callbackfn: (value: V, key: K, map: ReadonlyMap<K, V>) => void, thisArg?: unknown): void {
    for (const [key, value] of this.#values) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  entries(): MapIterator<[K, V]> {
    return this.#values.entries();
  }

  keys(): MapIterator<K> {
    return this.#values.keys();
  }

  values(): MapIterator<V> {
    return this.#values.values();
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
}

function validateSynonyms(input: BuildSearchQueryPlanInput): CompiledLocaleSynonyms {
  const synonyms = input.synonyms ?? emptyCompiledSynonyms(input);
  if (
    synonyms.normalizationContractVersion !== input.lexicalizedQuery.normalizationContractVersion ||
    synonyms.normalizationProfileRevision !== input.lexicalizedQuery.profileRevision
  ) {
    throw indexUnavailable("Compiled synonym trie normalization profile does not match the query");
  }
  const groups = [...synonyms.groups].sort((left, right) =>
    left.groupId.localeCompare(right.groupId),
  );
  const seenGroups = new Set<string>();
  for (const group of groups) {
    if (!group.groupId || seenGroups.has(group.groupId)) {
      throw indexUnavailable("Synonym group IDs must be non-empty and unique");
    }
    seenGroups.add(group.groupId);
    if (
      group.values.length < 2 ||
      group.values.length > SEARCH_NORMALIZATION_LIMITS.synonymAlternativesPerUnit
    ) {
      throw indexUnavailable(`Synonym group ${group.groupId} has an invalid alternative count`);
    }
    const seenValues = new Set<string>();
    for (const value of group.values) {
      if (
        value.normalizationContractVersion !==
          input.lexicalizedQuery.normalizationContractVersion ||
        value.normalizationProfileRevision !== input.lexicalizedQuery.profileRevision
      ) {
        throw indexUnavailable(
          `Synonym group ${group.groupId} normalization profile does not match the query`,
        );
      }
      if (!value.preparedText || value.lexemes.length === 0) {
        throw indexUnavailable(`Synonym group ${group.groupId} contains an empty value`);
      }
      const key = value.lexemes.join("\u0000");
      if (seenValues.has(key)) {
        throw indexUnavailable(`Synonym group ${group.groupId} contains duplicate values`);
      }
      seenValues.add(key);
    }
  }
  return Object.freeze({
    ...synonyms,
    groups: freezeArray(groups),
  });
}

function findLongestSynonymMatch(
  units: readonly SearchLexicalUnit[],
  start: number,
  synonyms: CompiledLocaleSynonyms,
): SynonymMatch | null {
  const byId = new Map(synonyms.groups.map((group) => [group.groupId, group]));
  let node = synonyms.trie;
  let matchedLength = 0;
  let matchedGroupIds: readonly string[] = [];
  for (let index = start; index < units.length; index += 1) {
    for (const lexeme of units[index]!.ftsLexemes) {
      const next = node.children[lexeme];
      if (!next) {
        return matchedLength === 0 ? null : toSynonymMatch(matchedLength, matchedGroupIds, byId);
      }
      node = next;
    }
    if (node.groupIds.length > 0) {
      matchedLength = index - start + 1;
      matchedGroupIds = node.groupIds;
    }
  }

  return matchedLength === 0 ? null : toSynonymMatch(matchedLength, matchedGroupIds, byId);
}

function toSynonymMatch(
  length: number,
  groupIds: readonly string[],
  groups: ReadonlyMap<string, CompiledSearchSynonymGroup>,
): SynonymMatch {
  const matched = groupIds.map((groupId) => {
    const group = groups.get(groupId);
    if (!group) {
      throw indexUnavailable(`Synonym trie references unknown group ${groupId}`);
    }
    return group;
  });
  return Object.freeze({ length, groups: freezeArray(matched) });
}

function emptyCompiledSynonyms(input: BuildSearchQueryPlanInput): CompiledLocaleSynonyms {
  return Object.freeze({
    resourceFingerprint: "empty",
    normalizationContractVersion: input.lexicalizedQuery.normalizationContractVersion,
    normalizationProfileRevision: input.lexicalizedQuery.profileRevision,
    groups: Object.freeze([]),
    trie: Object.freeze({
      children: Object.freeze({}),
      groupIds: Object.freeze([]),
    }),
  });
}

function textClause(
  lexemes: readonly string[],
  fields: SearchQueryPlan["enabledFields"],
): SearchClause {
  if (lexemes.length === 0) {
    throw indexUnavailable("FTS clause must contain at least one lexeme");
  }
  const text = lexemes.join(" ");
  return lexemes.length === 1
    ? Object.freeze({
        kind: "ftsTerms",
        text,
        lexemes: freezeArray(lexemes),
        fields,
      })
    : Object.freeze({
        kind: "ftsPhrase",
        text,
        lexemes: freezeArray(lexemes),
        fields,
        requireSameElement: true,
      });
}

function identifierClauses(value: string): SearchClause[] {
  if (!value) return [];
  const clauses: SearchClause[] = [Object.freeze({ kind: "identifierExact", value })];
  if ([...value].length >= 3) {
    clauses.push(Object.freeze({ kind: "identifierPrefix", value }));
  }
  return clauses;
}

function countClauses(units: readonly SearchRequiredUnit[]): number {
  const count = (clause: SearchClause): number =>
    clause.kind === "synonym"
      ? 1 + clause.alternatives.reduce((total, alternative) => total + count(alternative), 0)
      : 1;
  return units.reduce(
    (total, unit) =>
      total +
      unit.primaryAlternatives.reduce((subtotal, clause) => subtotal + count(clause), 0) +
      unit.originalIdentifierAlternatives.length +
      (unit.originalTypoAlternative ? 1 : 0),
    0,
  );
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}
