import {
  normalizeAddressKeys,
  normalizeBirthdayMonthDay,
  normalizeEmailDomain,
  normalizePreferredLocale,
  normalizeUnicodeSearchValue,
  SEGMENT_NORMALIZATION_CONTRACTS,
  SEGMENT_NORMALIZATION_DATA,
} from "../normalization.js";

describe("customer segment normalization contracts", () => {
  it("pins full Unicode case folding and whitespace collapse", () => {
    expect(SEGMENT_NORMALIZATION_CONTRACTS.unicode).toBe("unicode-nfkc-casefold-v1");
    expect(SEGMENT_NORMALIZATION_DATA).toMatchObject({
      unicodeVersion: "16.0.0",
      unicodeCaseFoldSha256: "97b00ff02d8ab202d343184b422f25c8ea8e0b30db3f9334ed3b2d909a615d02",
      unicodeNormalizationVersion: "16.0.0",
      unicodeNormalizationSha256:
        "1abcdeff5f2e65df658b3df6cad760a8b199804fd906562fcb9cfa171ff9eaed",
    });
    expect(normalizeUnicodeSearchValue("  Ｓｔｒａße\u00A0Σς  ")).toBe("strasse σσ");
  });

  it("uses non-transitional UTS #46 for email domains", () => {
    expect(normalizeEmailDomain("merchant@faß.de.")).toBe("xn--fa-hia.de");
    expect(normalizeEmailDomain("not-an-email")).toBeNull();
  });

  it("canonicalizes locale, address and birthday projection keys", () => {
    expect(normalizePreferredLocale("zh-hant-tw")).toBe("zh-Hant-TW");
    expect(
      normalizeAddressKeys({
        countryCode: "ua",
        regionCode: "30",
        city: "  КИЇВ  ",
        postalCode: " 01 001 ",
      }),
    ).toEqual({
      countryCode: "UA",
      regionKey: "UA-30",
      cityKey: "UA-30::київ",
      postalCodeNormalized: "01 001",
    });
    expect(normalizeBirthdayMonthDay("2000-02-29")).toBe("0229");
    expect(() => normalizeBirthdayMonthDay("2001-02-29")).toThrow();
  });
});
