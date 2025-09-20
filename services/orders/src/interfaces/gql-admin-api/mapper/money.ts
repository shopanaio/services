import { Money } from "@shopana/shared-money";

export function moneyToApi(amount: Money) {
  return {
    amount,
    currencyCode: amount.currency().code,
  };
}
