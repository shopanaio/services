import type { LocaleCode } from "@/graphql/types";

const languageRegions: Partial<Record<LocaleCode, string>> = {
  uk: "UA",
  ru: "RU",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  pt: "PT",
};

export const getLanguageTag = (code: LocaleCode) =>
  languageRegions[code] ? `${code}-${languageRegions[code]}` : code;
