import type { SearchTextField } from "../../repositories/search/searchRepositoryTypes.js";
import type { LexicalizedSearchQuery } from "../normalization/types.js";

export type SearchClause =
  | {
      readonly kind: "ftsTerms";
      readonly text: string;
      readonly lexemes: readonly string[];
      readonly fields: readonly SearchTextField[];
    }
  | {
      readonly kind: "ftsPhrase";
      readonly text: string;
      readonly lexemes: readonly string[];
      readonly fields: readonly SearchTextField[];
      readonly requireSameElement: true;
    }
  | {
      readonly kind: "synonym";
      readonly groupId: string;
      readonly alternatives: readonly SearchClause[];
    }
  | {
      readonly kind: "typoTerms";
      readonly terms: readonly string[];
      readonly fields: readonly SearchTextField[];
      readonly maxDistance: 1;
      readonly requireSameElement: boolean;
    }
  | { readonly kind: "identifierExact"; readonly value: string }
  | { readonly kind: "identifierPrefix"; readonly value: string };

export interface SearchRequiredUnit {
  readonly index: number;
  readonly sourceUnitIndexes: readonly number[];
  readonly primaryAlternatives: readonly SearchClause[];
  readonly originalTypoAlternative: SearchClause | null;
  readonly originalIdentifierAlternatives: readonly SearchClause[];
}

export interface SearchQueryPlan {
  readonly requiredUnits: readonly SearchRequiredUnit[];
  readonly wholeQueryIdentifierAlternatives: readonly SearchClause[];
  readonly matchedSynonymGroupIds: readonly string[];
  readonly applicableBoostProductIds: readonly string[];
  readonly enabledFields: readonly SearchTextField[];
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
  readonly fingerprint: string;
}

export interface VerifiedTypoAlternative {
  readonly inputTerm: string;
  readonly vocabularyTerm: string;
  readonly editDistance: 0 | 1;
  readonly trigramSimilarity: number;
  readonly ftsLexemes: readonly string[];
}

export interface ExpandedFuzzySearchQueryPlan extends SearchQueryPlan {
  readonly verifiedAlternativesByUnit: ReadonlyMap<number, readonly VerifiedTypoAlternative[]>;
}

export interface CompiledSearchSynonymValue {
  readonly preparedText: string;
  readonly lexemes: readonly string[];
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
}

export interface CompiledSearchSynonymGroup {
  readonly groupId: string;
  readonly values: readonly CompiledSearchSynonymValue[];
}

export interface CompiledSearchSynonymTrieNode {
  readonly children: Readonly<Record<string, CompiledSearchSynonymTrieNode>>;
  readonly groupIds: readonly string[];
}

export interface CompiledLocaleSynonyms {
  readonly resourceFingerprint: string;
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
  readonly groups: readonly CompiledSearchSynonymGroup[];
  readonly trie: CompiledSearchSynonymTrieNode;
}

export interface BuildSearchQueryPlanInput {
  readonly lexicalizedQuery: LexicalizedSearchQuery;
  readonly enabledFields: readonly SearchTextField[];
  readonly synonyms?: CompiledLocaleSynonyms;
  readonly applicableBoostProductIds?: readonly string[];
}
