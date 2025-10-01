import { Money } from "@shopana/shared-money";
import { ApiMoney } from "@src/interfaces/gql-storefront-api/types";

export function moneyToApi(amount: Money) {
  return {
    amount,
    currencyCode: amount.currency().code,
  } as ApiMoney;
}
