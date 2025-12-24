import type { CurrencyCode } from "../../../repositories/models/index.js";
import type { CurrencyUpdatePayload } from "./shared.js";

export interface CurrencySetDefaultParams {
  storeId: string;
  currency: CurrencyCode;
}

export type CurrencySetDefaultResult = CurrencyUpdatePayload;
