import type { StoreStatus, CurrencyCode, LocaleCode } from "../../../repositories/models/index.js";
import type { StorePayload } from "./shared.js";

export interface StoreCreateParams {
  organizationId: string;
  name: string;
  slug: string;
  locales: LocaleCode[];
  currencies: CurrencyCode[];
  defaultCurrency: CurrencyCode;
  status?: StoreStatus;
  timezone?: string;
  email?: string;
}

export type StoreCreateResult = StorePayload;
