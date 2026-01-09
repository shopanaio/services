import type {
  IPriceHistoryRecord,
  IScheduledPriceRecord,
  PriceSource,
} from "../../components/pricing/types";

export interface IVariantPriceData {
  id: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  priceHistory: IPriceHistoryRecord[];
  scheduledPrices?: IScheduledPriceRecord[];
}

export interface IPriceHistoryModalPayload {
  currentPrice: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  priceSource?: PriceSource;
  priceHistory: IPriceHistoryRecord[];
  scheduledPrices?: IScheduledPriceRecord[];
  variants?: IVariantPriceData[];
  variantId?: string;
  formatPrice?: (amount: number) => string;
  onAddScheduled?: () => void;
  onEditScheduled?: (id: string) => void;
  onDeleteScheduled?: (id: string) => void;
}

export type { IPriceHistoryRecord, IScheduledPriceRecord, PriceSource };
