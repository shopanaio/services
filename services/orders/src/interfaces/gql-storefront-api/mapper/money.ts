import { Money } from "@shopana/shared-money";
import type { ApiCurrencyCode } from "@src/interfaces/gql-storefront-api/types";

/**
 * Maps Money value to GraphQL Money representation.
 */
export function moneyToApi(amount: Money) {
  const currencyCode = amount.currency().code as ApiCurrencyCode;
  return {
    amount: amount.toRoundedUnit(), // Return rounded unit string for Decimal scalar
    currencyCode,
  };
}
