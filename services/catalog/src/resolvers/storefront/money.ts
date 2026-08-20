import { CURRENCY_INFO, type CurrencyCode } from "@shopana/shared-references";
import { GraphQLError } from "graphql";

export interface StorefrontMoney {
  amount: string;
  currencyCode: string;
}

export function minorUnitsToMoney(amountMinor: number, currency: string): StorefrontMoney {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new GraphQLError("Catalog returned an invalid monetary amount", {
      extensions: { code: "INTERNAL_SERVER_ERROR" },
    });
  }

  const normalizedCurrency = currency.toUpperCase();
  const info = CURRENCY_INFO[normalizedCurrency as CurrencyCode];
  if (!info) {
    throw new GraphQLError(`Unsupported storefront currency: ${normalizedCurrency}`, {
      extensions: { code: "STORE_CONFIGURATION_ERROR" },
    });
  }

  const decimalPlaces = info.decimalPlaces;
  const digits = BigInt(amountMinor).toString();
  const padded = digits.padStart(decimalPlaces + 1, "0");
  const amount =
    decimalPlaces === 0
      ? digits
      : `${padded.slice(0, -decimalPlaces)}.${padded.slice(-decimalPlaces)}`;

  return { amount, currencyCode: normalizedCurrency };
}
