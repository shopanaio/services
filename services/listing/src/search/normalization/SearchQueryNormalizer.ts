import { createHash } from "node:crypto";
import type { SearchTextField } from "../../repositories/search/searchRepositoryTypes.js";
import { normalizationFailure, SearchRuntimeError } from "../errors.js";
import { SEARCH_NORMALIZATION_LIMITS } from "./limits.js";
import {
  lengthPrefixedTuple,
  SearchNormalizationProfileRegistry,
  type SearchNormalizationProfile,
} from "./SearchNormalizationProfileRegistry.js";
import type {
  LexicalizedSearchQuery,
  NormalizedSearchDocumentElement,
  NormalizedSearchConfigurationValue,
  NormalizedSearchQuery,
  SearchDocumentElementInput,
  SearchIdentifierNormalizationResult,
  SearchLexicalUnit,
  SearchQueryNormalizationResult,
  SearchTokenKind,
  SearchTokenMetadata,
  SearchLocale,
} from "./types.js";

const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}]+/gu;
const UNICODE_WHITESPACE = /\s+/gu;
const APOSTROPHES = /[\u02bc\u2018\u2019\uff07]/gu;
const DASHES = /\p{Dash_Punctuation}/gu;
const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
const LETTER = /\p{Letter}/u;
const NUMBER = /\p{Number}/u;

interface LexicalizationResult {
  readonly tokens: readonly SearchTokenMetadata[];
  readonly units: readonly SearchLexicalUnit[];
  readonly preparedText: string;
  readonly surfaceTerms: readonly string[];
}

export class SearchQueryNormalizer {
  constructor(private readonly profiles = new SearchNormalizationProfileRegistry()) {}

  normalizeQuery(input: {
    storeId: string;
    locale: string;
    query: string;
  }): SearchQueryNormalizationResult {
    try {
      assertNonEmpty(input.storeId, "storeId");
      const profile = this.profiles.resolve(input.locale);
      const cleaned = cleanControls(input.query);
      const display = normalizeDisplay(cleaned);
      const codePointLength = codePoints(display);
      if (codePointLength === 0) {
        throw normalizationFailure("Search query is empty");
      }
      if (codePointLength > SEARCH_NORMALIZATION_LIMITS.queryCodePoints) {
        throw normalizationFailure(
          `Search query exceeds ${SEARCH_NORMALIZATION_LIMITS.queryCodePoints} Unicode code points`,
        );
      }

      const lookupKey = localeCaseFold(display, profile.metadata.locale);
      const lexical = lexicalize({
        cleanedSource: cleaned,
        normalizedText: lookupKey,
        profile,
        maximumUnits: SEARCH_NORMALIZATION_LIMITS.queryUnits,
        maximumLexemes: SEARCH_NORMALIZATION_LIMITS.queryLexemes,
      });
      if (lexical.units.length === 0) {
        throw normalizationFailure("Search query has no searchable units after stopword filtering");
      }

      const hash = sha256(
        lengthPrefixedTuple([
          input.storeId,
          profile.metadata.locale,
          profile.metadata.contractVersion,
          profile.metadata.profileRevision,
          lookupKey,
        ]),
      );
      const normalizedQuery: NormalizedSearchQuery = Object.freeze({
        display,
        lookupKey,
        hash,
        codePointLength,
      });
      const identifierForm = normalizeIdentifierValue(cleaned, profile.metadata.locale);
      const outputHash = sha256(
        lengthPrefixedTuple([
          hash,
          identifierForm,
          lexical.preparedText,
          ...lexical.units.flatMap((unit) => [
            String(unit.sourceIndex),
            unit.sourceText,
            unit.kind,
            ...unit.ftsLexemes,
            ...unit.typoTerms,
          ]),
        ]),
      );
      const lexicalizedQuery: LexicalizedSearchQuery = Object.freeze({
        originalUnits: freezeArray(lexical.units),
        tokens: freezeArray(lexical.tokens),
        identifierForm,
        wholeQueryPrimaryText: lexical.preparedText,
        normalizationContractVersion: profile.metadata.contractVersion,
        profileRevision: profile.metadata.profileRevision,
        outputHash,
      });

      return Object.freeze({
        normalizedQuery,
        lexicalizedQuery,
        profile: profile.metadata,
      });
    } catch (error) {
      if (error instanceof SearchRuntimeError) throw error;
      throw normalizationFailure("Search query normalization failed", error);
    }
  }

  normalizeDocumentBatch(
    inputs: readonly SearchDocumentElementInput[],
  ): readonly NormalizedSearchDocumentElement[] {
    try {
      if (inputs.length > SEARCH_NORMALIZATION_LIMITS.documentBatchElements) {
        throw normalizationFailure(
          `Search document batch exceeds ${SEARCH_NORMALIZATION_LIMITS.documentBatchElements} elements`,
        );
      }

      const unique = new Set<string>();
      const results = inputs.map((input) => {
        assertNonEmpty(input.elementId, "elementId");
        assertTextField(input.field);
        const profile = this.profiles.resolve(input.locale);
        const key = JSON.stringify([profile.metadata.locale, input.field, input.elementId]);
        if (unique.has(key)) {
          throw normalizationFailure(`Duplicate search document element: ${key}`);
        }
        unique.add(key);

        const cleaned = cleanControls(input.sourceText);
        if (codePoints(cleaned) > SEARCH_NORMALIZATION_LIMITS.documentSourceCodePoints) {
          throw normalizationFailure(
            `Search document source exceeds ${SEARCH_NORMALIZATION_LIMITS.documentSourceCodePoints} Unicode code points`,
          );
        }
        const normalizedText = localeCaseFold(normalizeDisplay(cleaned), profile.metadata.locale);
        const lexical = lexicalize({
          cleanedSource: cleaned,
          normalizedText,
          profile,
          maximumUnits: SEARCH_NORMALIZATION_LIMITS.documentLexemesPerElement,
          maximumLexemes: SEARCH_NORMALIZATION_LIMITS.documentLexemesPerElement,
        });
        if (lexical.units.length === 0) {
          throw normalizationFailure(
            `Search document element ${input.elementId} has no searchable lexemes`,
          );
        }
        if (codePoints(lexical.preparedText) > SEARCH_NORMALIZATION_LIMITS.preparedTextCodePoints) {
          throw normalizationFailure(
            `Prepared search text exceeds ${SEARCH_NORMALIZATION_LIMITS.preparedTextCodePoints} Unicode code points`,
          );
        }

        const primaryLexemes = lexical.units.flatMap((unit) => unit.ftsLexemes);
        const outputHash = sha256(
          lengthPrefixedTuple([
            profile.metadata.locale,
            input.field,
            input.elementId,
            profile.metadata.contractVersion,
            profile.metadata.profileRevision,
            lexical.preparedText,
            ...lexical.surfaceTerms,
          ]),
        );
        return Object.freeze({
          locale: profile.metadata.locale,
          field: input.field,
          elementId: input.elementId,
          preparedText: lexical.preparedText,
          primaryLexemes: freezeArray(primaryLexemes),
          surfaceTerms: freezeArray(lexical.surfaceTerms),
          tokens: freezeArray(lexical.tokens),
          normalizationContractVersion: profile.metadata.contractVersion,
          normalizationProfileRevision: profile.metadata.profileRevision,
          outputHash,
        });
      });

      return freezeArray(
        results.sort(
          (left, right) =>
            left.locale.localeCompare(right.locale) ||
            left.field.localeCompare(right.field) ||
            left.elementId.localeCompare(right.elementId),
        ),
      );
    } catch (error) {
      if (error instanceof SearchRuntimeError) throw error;
      throw normalizationFailure("Search document normalization failed", error);
    }
  }

  normalizeIdentifier(input: {
    locale: string;
    value: string;
  }): SearchIdentifierNormalizationResult {
    const profile = this.profiles.resolve(input.locale);
    const normalizedValue = normalizeIdentifierValue(
      cleanControls(input.value),
      profile.metadata.locale,
    );
    if (!normalizedValue) {
      throw normalizationFailure("Search identifier is empty");
    }
    if (codePoints(normalizedValue) > SEARCH_NORMALIZATION_LIMITS.identifierCodePoints) {
      throw normalizationFailure(
        `Search identifier exceeds ${SEARCH_NORMALIZATION_LIMITS.identifierCodePoints} Unicode code points`,
      );
    }
    return Object.freeze({
      normalizedValue,
      normalizationContractVersion: profile.metadata.contractVersion,
      normalizationProfileRevision: profile.metadata.profileRevision,
    });
  }

  normalizeConfigurationValue(input: {
    storeId: string;
    locale: string;
    value: string;
  }): NormalizedSearchConfigurationValue {
    const result = this.normalizeQuery({
      storeId: input.storeId,
      locale: input.locale,
      query: input.value,
    });
    return Object.freeze({
      displayValue: result.normalizedQuery.display,
      normalizedValue: result.normalizedQuery.lookupKey,
      preparedText: result.lexicalizedQuery.wholeQueryPrimaryText,
      lexemes: freezeArray(
        result.lexicalizedQuery.originalUnits.flatMap((unit) => unit.ftsLexemes),
      ),
      normalizationContractVersion: result.lexicalizedQuery.normalizationContractVersion,
      normalizationProfileRevision: result.lexicalizedQuery.profileRevision,
      outputHash: result.lexicalizedQuery.outputHash,
    });
  }

  getProfile(locale: string) {
    return this.profiles.resolve(locale).metadata;
  }
}

function lexicalize(input: {
  cleanedSource: string;
  normalizedText: string;
  profile: SearchNormalizationProfile;
  maximumUnits: number;
  maximumLexemes: number;
}): LexicalizationResult {
  const surfaceWordSegments = segmentWords(input.cleanedSource, input.profile.metadata.locale);
  const normalizedSegments = [...input.profile.segmenter.segment(input.normalizedText)];
  const tokens: SearchTokenMetadata[] = [];
  const units: SearchLexicalUnit[] = [];
  const surfaceTerms: string[] = [];
  let surfaceIndex = 0;

  for (const segment of normalizedSegments) {
    if (!segment.isWordLike) continue;
    const normalizedToken = segment.segment;
    const surfaceSegment = surfaceWordSegments[surfaceIndex];
    const surfaceText = surfaceSegment?.segment ?? normalizedToken;
    const tokenStart = surfaceSegment?.index ?? segment.index;
    const tokenEnd = tokenStart + surfaceText.length;
    const sourceIndex = surfaceIndex;
    surfaceIndex += 1;
    const kind = classifyToken(normalizedToken, input.profile.metadata.locale);
    const isStopword = input.profile.stopwords.has(normalizedToken);
    const tokenKind: SearchTokenKind = isStopword ? "stopword" : kind;
    const typoTerms = boundedTypoTerms(surfaceText);
    surfaceTerms.push(...typoTerms);

    if (isStopword) {
      tokens.push(
        Object.freeze({
          sourceIndex,
          sourceText: surfaceText,
          normalizedText: normalizedToken,
          start: tokenStart,
          end: tokenEnd,
          isWordLike: true,
          kind: tokenKind,
          removed: true,
          ftsLexemes: Object.freeze([]),
          typoTerms: freezeArray(typoTerms),
        }),
      );
      continue;
    }

    const lexeme = kind === "language" ? input.profile.stem(normalizedToken) : normalizedToken;
    if (!lexeme) {
      throw normalizationFailure(
        `Normalization silently removed non-stopword token: ${surfaceText}`,
      );
    }
    if (codePoints(lexeme) > SEARCH_NORMALIZATION_LIMITS.queryLexemeCodePoints) {
      throw normalizationFailure("Search lexeme exceeds the output limit");
    }

    const ftsLexemes = freezeArray([lexeme]);
    tokens.push(
      Object.freeze({
        sourceIndex,
        sourceText: surfaceText,
        normalizedText: normalizedToken,
        start: tokenStart,
        end: tokenEnd,
        isWordLike: true,
        kind: tokenKind,
        removed: false,
        ftsLexemes,
        typoTerms: freezeArray(typoTerms),
      }),
    );
    units.push(
      Object.freeze({
        sourceIndex,
        sourceText: surfaceText,
        normalizedText: normalizedToken,
        ftsLexemes,
        typoTerms: freezeArray(typoTerms),
        kind,
      }),
    );
  }

  const lexemeCount = units.reduce((count, unit) => count + unit.ftsLexemes.length, 0);
  if (units.length > input.maximumUnits || lexemeCount > input.maximumLexemes) {
    throw normalizationFailure("Search normalization output exceeds limits");
  }

  return Object.freeze({
    tokens: freezeArray(tokens),
    units: freezeArray(units),
    preparedText: units.flatMap((unit) => unit.ftsLexemes).join(" "),
    surfaceTerms: freezeArray(surfaceTerms),
  });
}

function classifyToken(token: string, locale: SearchLocale): Exclude<SearchTokenKind, "stopword"> {
  const hasLatin = LATIN.test(token);
  const hasCyrillic = CYRILLIC.test(token);
  if (hasLatin && hasCyrillic) return "mixed_script";
  if (NUMBER.test(token) || !LETTER.test(token)) return "code";

  const language = new Intl.Locale(locale).language;
  const expectedScript =
    language === "en" ? hasLatin : language === "ru" || language === "uk" ? hasCyrillic : false;
  return expectedScript ? "language" : "foreign";
}

function segmentWords(text: string, locale: SearchLocale) {
  return [...new Intl.Segmenter(locale, { granularity: "word" }).segment(text)].filter(
    (segment) => segment.isWordLike,
  );
}

function boundedTypoTerms(surfaceText: string): readonly string[] {
  const length = codePoints(surfaceText);
  return length > 0 && length <= SEARCH_NORMALIZATION_LIMITS.typoTermCodePoints
    ? [surfaceText]
    : [];
}

function cleanControls(value: string): string {
  return value.replace(CONTROL_CHARACTERS, " ");
}

function normalizeDisplay(value: string): string {
  return normalizePunctuation(value.normalize("NFKC")).trim().replace(UNICODE_WHITESPACE, " ");
}

function normalizeIdentifierValue(value: string, locale: SearchLocale): string {
  return localeCaseFold(normalizeDisplay(value), locale);
}

function localeCaseFold(value: string, locale: SearchLocale): string {
  return normalizePunctuation(value.toLocaleLowerCase(locale).normalize("NFKC"));
}

function normalizePunctuation(value: string): string {
  return value.replace(APOSTROPHES, "'").replace(DASHES, "-");
}

function assertTextField(field: SearchTextField): void {
  if (
    field !== "product_title" &&
    field !== "variant_title" &&
    field !== "vendor_name" &&
    field !== "category_name"
  ) {
    throw normalizationFailure(`Unsupported search text field: ${field}`);
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw normalizationFailure(`${label} is required`);
}

function codePoints(value: string): number {
  return [...value].length;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}
