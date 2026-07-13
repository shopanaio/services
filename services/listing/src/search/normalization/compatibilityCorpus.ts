import { normalizationFailure } from "../errors.js";
import { SearchQueryNormalizer } from "./SearchQueryNormalizer.js";
import type { SearchLocale } from "./types.js";

export interface SearchNormalizationCompatibilityCase {
  readonly id: string;
  readonly locale: SearchLocale;
  readonly input: string;
  readonly expectedDisplay: string;
  readonly expectedLookupKey: string;
  readonly expectedIdentifierForm: string;
  readonly expectedLexemes: readonly string[];
  readonly expectedSurfaceTerms: readonly string[];
}

export const SEARCH_NORMALIZATION_COMPATIBILITY_CORPUS:
readonly SearchNormalizationCompatibilityCase[] = Object.freeze([
  Object.freeze({
    id: "en-stemming-stopwords",
    locale: "en",
    input: "Running shoes and jackets",
    expectedDisplay: "Running shoes and jackets",
    expectedLookupKey: "running shoes and jackets",
    expectedIdentifierForm: "running shoes and jackets",
    expectedLexemes: Object.freeze(["run", "shoe", "jacket"]),
    expectedSurfaceTerms: Object.freeze([
      "Running",
      "shoes",
      "and",
      "jackets",
    ]),
  }),
  Object.freeze({
    id: "ru-stemming-stopwords",
    locale: "ru",
    input: "Красивые зимние куртки и ботинки",
    expectedDisplay: "Красивые зимние куртки и ботинки",
    expectedLookupKey: "красивые зимние куртки и ботинки",
    expectedIdentifierForm: "красивые зимние куртки и ботинки",
    expectedLexemes: Object.freeze(["красив", "зимн", "куртк", "ботинк"]),
    expectedSurfaceTerms: Object.freeze([
      "Красивые",
      "зимние",
      "куртки",
      "и",
      "ботинки",
    ]),
  }),
  Object.freeze({
    id: "uk-stemming-stopwords",
    locale: "uk",
    input: "Красиві зимові куртки та черевики",
    expectedDisplay: "Красиві зимові куртки та черевики",
    expectedLookupKey: "красиві зимові куртки та черевики",
    expectedIdentifierForm: "красиві зимові куртки та черевики",
    expectedLexemes: Object.freeze(["красив", "зим", "куртк", "черевик"]),
    expectedSurfaceTerms: Object.freeze([
      "Красиві",
      "зимові",
      "куртки",
      "та",
      "черевики",
    ]),
  }),
  Object.freeze({
    id: "nfkc-code-preservation",
    locale: "en",
    input: "ＡＢＣ‐１２３",
    expectedDisplay: "ABC-123",
    expectedLookupKey: "abc-123",
    expectedIdentifierForm: "abc-123",
    expectedLexemes: Object.freeze(["abc", "123"]),
    expectedSurfaceTerms: Object.freeze(["ＡＢＣ", "１２３"]),
  }),
  Object.freeze({
    id: "mixed-script-preservation",
    locale: "uk",
    input: "Nike АБВ42",
    expectedDisplay: "Nike АБВ42",
    expectedLookupKey: "nike абв42",
    expectedIdentifierForm: "nike абв42",
    expectedLexemes: Object.freeze(["nike", "абв42"]),
    expectedSurfaceTerms: Object.freeze(["Nike", "АБВ42"]),
  }),
]);

export function verifySearchNormalizationCompatibility(
  normalizer = new SearchQueryNormalizer(),
): void {
  for (const entry of SEARCH_NORMALIZATION_COMPATIBILITY_CORPUS) {
    const result = normalizer.normalizeQuery({
      storeId: "00000000-0000-7000-8000-000000000000",
      locale: entry.locale,
      query: entry.input,
    });
    const actualLexemes = result.lexicalizedQuery.originalUnits.flatMap(
      (unit) => unit.ftsLexemes,
    );
    const actualSurfaceTerms = result.lexicalizedQuery.tokens.flatMap(
      (token) => token.typoTerms,
    );

    assertEqual(entry, "display", result.normalizedQuery.display, entry.expectedDisplay);
    assertEqual(
      entry,
      "lookupKey",
      result.normalizedQuery.lookupKey,
      entry.expectedLookupKey,
    );
    assertEqual(
      entry,
      "identifierForm",
      result.lexicalizedQuery.identifierForm,
      entry.expectedIdentifierForm,
    );
    assertArrayEqual(entry, "lexemes", actualLexemes, entry.expectedLexemes);
    assertArrayEqual(
      entry,
      "surfaceTerms",
      actualSurfaceTerms,
      entry.expectedSurfaceTerms,
    );
  }
}

function assertEqual(
  entry: SearchNormalizationCompatibilityCase,
  field: string,
  actual: string,
  expected: string,
): void {
  if (actual !== expected) {
    throw normalizationFailure(
      `Compatibility corpus ${entry.id} failed for ${field}`,
    );
  }
}

function assertArrayEqual(
  entry: SearchNormalizationCompatibilityCase,
  field: string,
  actual: readonly string[],
  expected: readonly string[],
): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw normalizationFailure(
      `Compatibility corpus ${entry.id} failed for ${field}`,
    );
  }
}
