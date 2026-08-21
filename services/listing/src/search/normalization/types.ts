import type { SearchTextField } from "../../repositories/search/searchRepositoryTypes.js";

/** Canonical locale code supplied by the Store bounded context. */
export type SearchLocale = string;

export type SearchTokenKind = "language" | "code" | "foreign" | "mixed_script" | "stopword";

export interface SearchNormalizationProfileMetadata {
  readonly locale: SearchLocale;
  readonly contractVersion: string;
  readonly profileHash: string;
  readonly nodeVersion: string;
  readonly icuVersion: string;
  readonly unicodeVersion: string;
  readonly naturalVersion: string;
  readonly stopwordsVersion: string;
  readonly policyVersion: string;
}

export interface SearchTokenMetadata {
  readonly sourceIndex: number;
  readonly sourceText: string;
  readonly normalizedText: string;
  readonly start: number;
  readonly end: number;
  readonly isWordLike: boolean;
  readonly kind: SearchTokenKind;
  readonly removed: boolean;
  readonly ftsLexemes: readonly string[];
  readonly typoTerms: readonly string[];
}

export interface NormalizedSearchQuery {
  readonly display: string;
  readonly lookupKey: string;
  readonly hash: string;
  readonly codePointLength: number;
}

export interface SearchLexicalUnit {
  readonly sourceIndex: number;
  readonly sourceText: string;
  readonly normalizedText: string;
  readonly ftsLexemes: readonly string[];
  readonly typoTerms: readonly string[];
  readonly kind: Exclude<SearchTokenKind, "stopword">;
}

export interface LexicalizedSearchQuery {
  readonly originalUnits: readonly SearchLexicalUnit[];
  readonly tokens: readonly SearchTokenMetadata[];
  readonly identifierForm: string;
  readonly wholeQueryPrimaryText: string;
  readonly normalizationContractVersion: string;
  readonly profileHash: string;
  readonly outputHash: string;
}

export interface SearchQueryNormalizationResult {
  readonly normalizedQuery: NormalizedSearchQuery;
  readonly lexicalizedQuery: LexicalizedSearchQuery;
  readonly profile: SearchNormalizationProfileMetadata;
}

export interface SearchDocumentElementInput {
  readonly locale: string;
  readonly field: SearchTextField;
  readonly elementId: string;
  readonly sourceText: string;
}

export interface NormalizedSearchDocumentElement {
  readonly locale: SearchLocale;
  readonly field: SearchTextField;
  readonly elementId: string;
  readonly preparedText: string;
  readonly primaryLexemes: readonly string[];
  readonly surfaceTerms: readonly string[];
  readonly tokens: readonly SearchTokenMetadata[];
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
  readonly outputHash: string;
}

export interface SearchIdentifierNormalizationResult {
  readonly normalizedValue: string;
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
}

export interface NormalizedSearchConfigurationValue {
  readonly displayValue: string;
  readonly normalizedValue: string;
  readonly preparedText: string;
  readonly lexemes: readonly string[];
  readonly normalizationContractVersion: string;
  readonly normalizationProfileHash: string;
  readonly outputHash: string;
}
