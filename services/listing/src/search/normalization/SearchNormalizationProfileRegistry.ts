import { createHash } from "node:crypto";
import {
  PorterStemmer,
  PorterStemmerRu,
  PorterStemmerUk,
  type Stemmer,
} from "natural/lib/natural/stemmers/index.js";
import { normalizationFailure } from "../errors.js";
import {
  getSearchStopwords,
  SEARCH_STOPWORDS_VERSION,
} from "./stopwords.js";
import type {
  SearchNormalizationProfileMetadata,
  SupportedSearchLocale,
} from "./types.js";

export const SEARCH_NORMALIZATION_CONTRACT_VERSION = "1";
export const SEARCH_NORMALIZATION_POLICY_VERSION = "2026-07-12.1";
export const SEARCH_NATURAL_VERSION = "8.1.1";

export interface SearchNormalizationProfile {
  readonly metadata: SearchNormalizationProfileMetadata;
  readonly segmenter: Intl.Segmenter;
  readonly stopwords: ReadonlySet<string>;
  readonly stem: (token: string) => string;
}

const STEMMERS: Readonly<Record<SupportedSearchLocale, Stemmer>> = {
  en: PorterStemmer,
  ru: PorterStemmerRu,
  uk: PorterStemmerUk,
};

const SUPPORTED_LOCALES = new Set<SupportedSearchLocale>(["en", "ru", "uk"]);

export class SearchNormalizationProfileRegistry {
  private readonly profiles = new Map<
    SupportedSearchLocale,
    SearchNormalizationProfile
  >();

  resolve(locale: string): SearchNormalizationProfile {
    const normalizedLocale = locale.trim().toLowerCase();
    if (!SUPPORTED_LOCALES.has(normalizedLocale as SupportedSearchLocale)) {
      throw normalizationFailure(
        `Unsupported search normalization locale: ${locale}`,
      );
    }

    const supportedLocale = normalizedLocale as SupportedSearchLocale;
    const cached = this.profiles.get(supportedLocale);
    if (cached) return cached;

    try {
      const metadata = buildMetadata(supportedLocale);
      const stemmer = STEMMERS[supportedLocale];
      const profile: SearchNormalizationProfile = Object.freeze({
        metadata,
        segmenter: new Intl.Segmenter(supportedLocale, {
          granularity: "word",
        }),
        stopwords: getSearchStopwords(supportedLocale),
        stem: (token: string) => stemmer.stem(token),
      });
      this.profiles.set(supportedLocale, profile);
      return profile;
    } catch (error) {
      throw normalizationFailure(
        `Search normalization profile is unavailable for locale: ${locale}`,
        error,
      );
    }
  }

  listSupportedLocales(): readonly SupportedSearchLocale[] {
    return ["en", "ru", "uk"];
  }
}

function buildMetadata(
  locale: SupportedSearchLocale,
): SearchNormalizationProfileMetadata {
  const nodeVersion = process.versions.node ?? "unknown";
  const icuVersion = process.versions.icu ?? "unknown";
  const unicodeVersion = process.versions.unicode ?? "unknown";
  const revisionPayload = [
    SEARCH_NORMALIZATION_CONTRACT_VERSION,
    locale,
    `node:${nodeVersion}`,
    `icu:${icuVersion}`,
    `unicode:${unicodeVersion}`,
    `natural:${SEARCH_NATURAL_VERSION}`,
    `stopwords:${SEARCH_STOPWORDS_VERSION}`,
    `policy:${SEARCH_NORMALIZATION_POLICY_VERSION}`,
    "tokenizer:Intl.Segmenter.word",
    "unicode:NFKC",
    "casefold:locale-lower",
    "diacritics:preserve",
    "apostrophe:ascii",
    "dash:ascii",
  ];
  const profileRevision = createHash("sha256")
    .update(lengthPrefixedTuple(revisionPayload))
    .digest("hex");

  return Object.freeze({
    locale,
    contractVersion: SEARCH_NORMALIZATION_CONTRACT_VERSION,
    profileRevision,
    nodeVersion,
    icuVersion,
    unicodeVersion,
    naturalVersion: SEARCH_NATURAL_VERSION,
    stopwordsVersion: SEARCH_STOPWORDS_VERSION,
    policyVersion: SEARCH_NORMALIZATION_POLICY_VERSION,
  });
}

export function lengthPrefixedTuple(values: readonly string[]): string {
  return values.map((value) => `${[...value].length}:${value}`).join("|");
}
