import {
  CURRENCY_INFO,
  LOCALE_INFO,
  type CurrencyCode,
  type LocaleCode,
} from "@shopana/shared-references";

export function countryValue(code: string) {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return { code, name: names.of(code) ?? code };
}

export function languageValue(code: LocaleCode) {
  return { code, name: LOCALE_INFO[code]?.name ?? code };
}

export function currencyValue(code: CurrencyCode) {
  const info = CURRENCY_INFO[code];
  return {
    code,
    name: info?.name ?? code,
    symbol: info?.symbol ?? code,
  };
}
