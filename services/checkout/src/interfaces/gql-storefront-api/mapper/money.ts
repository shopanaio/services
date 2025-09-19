import { Money } from "@shopana/money";

export function moneyToApi(amount: Money) {
  return {
    amount,
    currencyCode: amount.currency().code,
  };
}
