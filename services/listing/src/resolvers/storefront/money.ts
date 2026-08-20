import { CURRENCY_INFO, type CurrencyCode } from "@shopana/shared-references";
import { GraphQLError } from "graphql";

export interface StorefrontMoney {
  amount: string;
  currencyCode: string;
}

export function currencyDecimalPlaces(currency: string): number {
  const info = CURRENCY_INFO[currency.toUpperCase() as CurrencyCode];
  if (!info) {
    throw new GraphQLError(`Unsupported storefront currency: ${currency}`, {
      extensions: { code: "STORE_CONFIGURATION_ERROR" },
    });
  }
  return info.decimalPlaces;
}

export function minorUnitsToMoney(amountMinor: number, currency: string): StorefrontMoney {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new GraphQLError("Listing returned an invalid monetary amount", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }

  const decimalPlaces = currencyDecimalPlaces(currency);
  const digits = BigInt(amountMinor).toString();
  const amount =
    decimalPlaces === 0
      ? digits
      : `${digits.padStart(decimalPlaces + 1, "0").slice(0, -decimalPlaces)}.${digits
          .padStart(decimalPlaces + 1, "0")
          .slice(-decimalPlaces)}`;

  return { amount, currencyCode: currency.toUpperCase() };
}
