import {
  CurrencyCode,
  CurrencyDisplay,
  CurrencyGrouping,
  CurrencyRoundingMode,
  CurrencySign,
  CurrencySignDisplay,
  CurrencyTrailingZeroDisplay,
} from "@/graphql/types";
import type { StoreCurrencyFormValues } from "../types";

export const CURRENCY_DISPLAY_LABELS: Record<CurrencyDisplay, string> = {
  [CurrencyDisplay.Symbol]: "Symbol",
  [CurrencyDisplay.NarrowSymbol]: "Narrow symbol",
  [CurrencyDisplay.Code]: "Code",
  [CurrencyDisplay.Name]: "Name",
};

export const CURRENCY_SIGN_LABELS: Record<CurrencySign, string> = {
  [CurrencySign.Standard]: "Standard",
  [CurrencySign.Accounting]: "Accounting",
};

export const CURRENCY_GROUPING_LABELS: Record<CurrencyGrouping, string> = {
  [CurrencyGrouping.Auto]: "Auto",
  [CurrencyGrouping.Always]: "Always",
  [CurrencyGrouping.Min2]: "Minimum 2 digits",
  [CurrencyGrouping.Never]: "Never",
};

export const CURRENCY_SIGN_DISPLAY_LABELS: Record<CurrencySignDisplay, string> = {
  [CurrencySignDisplay.Auto]: "Auto",
  [CurrencySignDisplay.Always]: "Always",
  [CurrencySignDisplay.ExceptZero]: "Except zero",
  [CurrencySignDisplay.Negative]: "Negative",
  [CurrencySignDisplay.Never]: "Never",
};

export const CURRENCY_ROUNDING_MODE_LABELS: Record<CurrencyRoundingMode, string> = {
  [CurrencyRoundingMode.Ceil]: "Ceil",
  [CurrencyRoundingMode.Floor]: "Floor",
  [CurrencyRoundingMode.Expand]: "Expand",
  [CurrencyRoundingMode.Trunc]: "Truncate",
  [CurrencyRoundingMode.HalfCeil]: "Half ceil",
  [CurrencyRoundingMode.HalfFloor]: "Half floor",
  [CurrencyRoundingMode.HalfExpand]: "Half expand",
  [CurrencyRoundingMode.HalfTrunc]: "Half truncate",
  [CurrencyRoundingMode.HalfEven]: "Half even",
};

export const CURRENCY_TRAILING_ZERO_LABELS: Record<
  CurrencyTrailingZeroDisplay,
  string
> = {
  [CurrencyTrailingZeroDisplay.Auto]: "Auto",
  [CurrencyTrailingZeroDisplay.StripIfInteger]: "Strip if integer",
};

export const formatCurrencyName = (currencyCode: CurrencyCode) => {
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "currency" }).of(currencyCode) ??
      currencyCode
    );
  } catch {
    return currencyCode;
  }
};

export const formatCurrencySymbol = (currencyCode: CurrencyCode) => {
  try {
    return (
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find(({ type }) => type === "currency")?.value ?? currencyCode
    );
  } catch {
    return currencyCode;
  }
};

export const getCurrencyOptions = () =>
  Object.values(CurrencyCode).map((value) => ({
    value,
    label: `${formatCurrencyName(value)} (${value} ${formatCurrencySymbol(value)})`,
  }));

export const toIntlOptionValue = <T extends string>(value: T) =>
  value.toLowerCase().replaceAll(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

export const formatCurrencyPreview = (
  values: StoreCurrencyFormValues,
  amount = 1249,
) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: values.currencyCode,
      currencyDisplay: toIntlOptionValue(values.currencyDisplay),
      currencySign: toIntlOptionValue(values.currencySign),
      useGrouping: toIntlOptionValue(values.grouping),
      signDisplay: toIntlOptionValue(values.signDisplay),
      minimumFractionDigits: values.minimumFractionDigits,
      maximumFractionDigits: values.maximumFractionDigits,
      roundingMode: toIntlOptionValue(values.roundingMode),
      trailingZeroDisplay: toIntlOptionValue(values.trailingZeroDisplay),
    } as Intl.NumberFormatOptions).format(amount);
  } catch {
    return `${amount.toFixed(values.minimumFractionDigits)} ${values.currencyCode}`;
  }
};
