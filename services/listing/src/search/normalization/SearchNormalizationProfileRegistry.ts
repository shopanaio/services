import { createHash } from "node:crypto";
import {
  PorterStemmer,
  PorterStemmerRu,
  PorterStemmerUk,
  type Stemmer,
} from "natural/lib/natural/stemmers/index.js";
import { normalizationFailure } from "../errors.js";
import { getSearchStopwords, SEARCH_STOPWORDS_VERSION } from "./stopwords.js";
import type { SearchNormalizationProfileMetadata, SearchLocale } from "./types.js";

export const SEARCH_NORMALIZATION_CONTRACT_VERSION = "1";
export const SEARCH_NORMALIZATION_POLICY_VERSION = "2026-07-12.1";
export const SEARCH_NATURAL_VERSION = "8.1.1";

export interface SearchNormalizationProfile {
  readonly metadata: SearchNormalizationProfileMetadata;
  readonly segmenter: Intl.Segmenter;
  readonly stopwords: ReadonlySet<string>;
  readonly stem: (token: string) => string;
}

const STEMMERS: Readonly<Record<string, Stemmer>> = {
  en: PorterStemmer,
  ru: PorterStemmerRu,
  uk: PorterStemmerUk,
};

export class SearchNormalizationProfileRegistry {
  private readonly profiles = new Map<SearchLocale, SearchNormalizationProfile>();

  resolve(locale: string): SearchNormalizationProfile {
    let normalizedLocale: SearchLocale;
    try {
      const candidate = locale.trim().replaceAll("_", "-");
      normalizedLocale = Intl.getCanonicalLocales(candidate)[0];
      if (!normalizedLocale) throw new Error("Locale is empty");
    } catch (error) {
      throw normalizationFailure(`Invalid search normalization locale: ${locale}`, error);
    }

    const cached = this.profiles.get(normalizedLocale);
    if (cached) return cached;

    try {
      const metadata = buildMetadata(normalizedLocale);
      const language = new Intl.Locale(normalizedLocale).language;
      const stemmer = STEMMERS[language];
      const profile: SearchNormalizationProfile = Object.freeze({
        metadata,
        segmenter: new Intl.Segmenter(normalizedLocale, {
          granularity: "word",
        }),
        stopwords: getSearchStopwords(normalizedLocale),
        stem: stemmer ? (token: string) => stemmer.stem(token) : (token: string) => token,
      });
      this.profiles.set(normalizedLocale, profile);
      return profile;
    } catch (error) {
      throw normalizationFailure(
        `Search normalization profile is unavailable for locale: ${locale}`,
        error,
      );
    }
  }
}

function buildMetadata(locale: SearchLocale): SearchNormalizationProfileMetadata {
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
