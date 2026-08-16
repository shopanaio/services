import {
  fullUnicodeCaseFold,
  fullUnicodeNfkc,
  UNICODE_CASE_FOLD_SHA256,
  UNICODE_CASE_FOLD_VERSION,
  UNICODE_NORMALIZATION_SHA256,
  UNICODE_NORMALIZATION_VERSION,
} from "@shopana/customer-segment-dsl";
import tr46 from "tr46";

export const SEGMENT_NORMALIZATION_CONTRACTS = Object.freeze({
  unicode: "unicode-nfkc-casefold-v1",
  emailDomain: "tr46-5.1.1-uts46-nontransitional-v1",
  locale: "bcp47-canonical-v1",
  source: "ascii-source-code-v1",
  address: "canonical-address-v1",
  birthday: "birthday-month-day-v1",
});

export const SEGMENT_NORMALIZATION_DATA = Object.freeze({
  unicodeVersion: UNICODE_CASE_FOLD_VERSION,
  unicodeCaseFoldSha256: UNICODE_CASE_FOLD_SHA256,
  unicodeNormalizationVersion: UNICODE_NORMALIZATION_VERSION,
  unicodeNormalizationSha256: UNICODE_NORMALIZATION_SHA256,
  idnaImplementation: "tr46@5.1.1 (Unicode 16.0.0)",
  localeImplementation: "shopana-bcp47-canonical-v1",
});

const UNICODE_WHITESPACE = /[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+/gu;

export function normalizeUnicodeSearchValue(value: string): string {
  return fullUnicodeCaseFold(fullUnicodeNfkc(value))
    .replace(UNICODE_WHITESPACE, " ")
    .replace(/^ | $/gu, "");
}

export function normalizeEmailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const separator = email.lastIndexOf("@");
  if (separator < 0 || separator === email.length - 1) return null;
  const ascii = tr46.toASCII(email.slice(separator + 1).replace(/\.$/u, ""), {
    checkBidi: true,
    checkHyphens: true,
    checkJoiners: true,
    transitionalProcessing: false,
    useSTD3ASCIIRules: true,
    verifyDNSLength: true,
  });
  return ascii ? ascii.toLowerCase() : null;
}

export function normalizePreferredLocale(value: string | null | undefined): string | null {
  const normalized = trimUnicodeWhitespace(value ?? "");
  if (!normalized) return null;
  return canonicalizeBcp47(normalized);
}

export function normalizeCustomerSource(value: string | null | undefined): string {
  const normalized = (value?.trim() || "unknown").toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(normalized)) {
    throw new Error("Customer source must be an ASCII source code");
  }
  return normalized;
}

export function normalizeBirthdayMonthDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) throw new Error("dateOfBirth must be a calendar date");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(0);
  calendarDate.setUTCHours(0, 0, 0, 0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    throw new Error("dateOfBirth must be a calendar date");
  }
  return `${match[2]}${match[3]}`;
}

export function normalizeAddressKeys(input: {
  readonly countryCode: string;
  readonly regionCode?: string | null;
  readonly city: string;
  readonly postalCode?: string | null;
}): {
  readonly countryCode: string;
  readonly regionKey: string | null;
  readonly cityKey: string;
  readonly postalCodeNormalized: string | null;
} {
  const countryCode = input.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/u.test(countryCode)) throw new Error("Address countryCode is invalid");
  const regionSuffix = input.regionCode?.trim().toUpperCase() || null;
  if (regionSuffix && !/^[A-Z0-9]{1,3}$/u.test(regionSuffix)) {
    throw new Error("Address regionCode must be an ISO 3166-2 suffix");
  }
  const regionKey = regionSuffix ? `${countryCode}-${regionSuffix}` : null;
  const city = normalizeUnicodeSearchValue(input.city);
  return {
    countryCode,
    regionKey,
    cityKey: `${regionKey ?? countryCode}::${city}`,
    postalCodeNormalized: normalizePostalCodeValue(input.postalCode),
  };
}

export function normalizePostalCodeValue(value: string | null | undefined): string | null {
  const normalized = collapseUnicodeWhitespace(fullUnicodeNfkc(value ?? "")).toUpperCase();
  return normalized || null;
}

export function canonicalizeBcp47(value: string): string {
  const grandfathered = GRANDFATHERED_TAGS.get(value.toLowerCase());
  if (grandfathered) return grandfathered;
  const parts = value.split("-");
  if (parts.some((part) => part.length === 0 || !/^[A-Za-z0-9]+$/u.test(part))) {
    throw new Error("Customer locale must be a BCP 47 language tag");
  }
  if (parts[0]!.toLowerCase() === "x") {
    if (parts.length < 2 || parts.slice(1).some((part) => part.length > 8)) {
      throw new Error("Customer locale must be a BCP 47 language tag");
    }
    return parts.map((part) => part.toLowerCase()).join("-");
  }
  if (!/^[A-Za-z]{2,8}$/u.test(parts[0]!)) {
    throw new Error("Customer locale must be a BCP 47 language tag");
  }
  const canonical = [parts[0]!.toLowerCase()];
  let index = 1;
  if (parts[0]!.length <= 3) {
    for (let count = 0; count < 3 && /^[A-Za-z]{3}$/u.test(parts[index] ?? ""); count += 1) {
      canonical.push(parts[index]!.toLowerCase());
      index += 1;
    }
  }
  if (/^[A-Za-z]{4}$/u.test(parts[index] ?? "")) {
    const script = parts[index]!.toLowerCase();
    canonical.push(`${script[0]!.toUpperCase()}${script.slice(1)}`);
    index += 1;
  }
  if (/^(?:[A-Za-z]{2}|\d{3})$/u.test(parts[index] ?? "")) {
    canonical.push(parts[index]!.toUpperCase());
    index += 1;
  }
  const variants = new Set<string>();
  while (/^(?:[A-Za-z0-9]{5,8}|\d[A-Za-z0-9]{3})$/u.test(parts[index] ?? "")) {
    const variant = parts[index]!.toLowerCase();
    if (variants.has(variant)) throw new Error("Customer locale repeats a BCP 47 variant");
    variants.add(variant);
    canonical.push(variant);
    index += 1;
  }
  const extensions = new Set<string>();
  while (/^[0-9A-WY-Za-wy-z]$/u.test(parts[index] ?? "")) {
    const singleton = parts[index]!.toLowerCase();
    if (extensions.has(singleton)) throw new Error("Customer locale repeats a BCP 47 extension");
    extensions.add(singleton);
    canonical.push(singleton);
    index += 1;
    const start = index;
    while (/^[A-Za-z0-9]{2,8}$/u.test(parts[index] ?? "")) {
      canonical.push(parts[index]!.toLowerCase());
      index += 1;
    }
    if (index === start) throw new Error("Customer locale has an empty BCP 47 extension");
  }
  if ((parts[index] ?? "").toLowerCase() === "x") {
    canonical.push("x");
    index += 1;
    const start = index;
    while (/^[A-Za-z0-9]{1,8}$/u.test(parts[index] ?? "")) {
      canonical.push(parts[index]!.toLowerCase());
      index += 1;
    }
    if (index === start) throw new Error("Customer locale has an empty private-use section");
  }
  if (index !== parts.length) throw new Error("Customer locale must be a BCP 47 language tag");
  return canonical.join("-");
}

function collapseUnicodeWhitespace(value: string): string {
  return value.replace(UNICODE_WHITESPACE, " ").replace(/^ | $/gu, "");
}

function trimUnicodeWhitespace(value: string): string {
  return value.replace(/^[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+|[\u0009-\u000D\u0020\u0085\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+$/gu, "");
}

const GRANDFATHERED_TAGS = new Map<string, string>([
  ["art-lojban", "jbo"],
  ["cel-gaulish", "cel-gaulish"],
  ["en-gb-oed", "en-GB-oxendict"],
  ["i-ami", "ami"],
  ["i-bnn", "bnn"],
  ["i-default", "i-default"],
  ["i-enochian", "i-enochian"],
  ["i-hak", "hak"],
  ["i-klingon", "tlh"],
  ["i-lux", "lb"],
  ["i-mingo", "i-mingo"],
  ["i-navajo", "nv"],
  ["i-pwn", "pwn"],
  ["i-tao", "tao"],
  ["i-tay", "tay"],
  ["i-tsu", "tsu"],
  ["no-bok", "nb"],
  ["no-nyn", "nn"],
  ["sgn-be-fr", "sfb"],
  ["sgn-be-nl", "vgt"],
  ["sgn-ch-de", "sgg"],
  ["zh-guoyu", "cmn"],
  ["zh-hakka", "hak"],
  ["zh-min", "zh-min"],
  ["zh-min-nan", "nan"],
  ["zh-xiang", "hsn"],
]);
