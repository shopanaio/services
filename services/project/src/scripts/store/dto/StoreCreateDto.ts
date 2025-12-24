import type { StoreStatus, CurrencyCode, LocaleCode } from "../../../repositories/models/index.js";
import type { StorePayload } from "./shared.js";

export interface StoreCreateParams {
  name: string;
  slug: string;
  locales: LocaleCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string;
}

export type StoreCreateResult = StorePayload;
