import type {
  IPriceHistoryRecord,
  PriceSource,
} from "../../components/pricing/types";

export interface IVariantPriceData {
  id: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  priceHistory: IPriceHistoryRecord[];
}

export interface IPriceHistoryModalPayload {
  currentPrice: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  priceSource?: PriceSource;
  priceHistory: IPriceHistoryRecord[];
  variants?: IVariantPriceData[];
  variantId?: string;
  formatPrice?: (amount: number) => string;
}

export type { IPriceHistoryRecord, PriceSource };
