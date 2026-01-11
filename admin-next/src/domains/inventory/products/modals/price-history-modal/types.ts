import type { CurrencyCode } from "../../components/pricing/types";

export interface IPriceHistoryModalPayload {
  productId: string;
  formatPrice?: (amount: number, currency?: CurrencyCode) => string;
}
