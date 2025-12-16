import type { CurrencyUpdatePayload } from "./shared.js";

export interface CurrencySetDefaultParams {
  projectId: string;
  currency: string;
}

export type CurrencySetDefaultResult = CurrencyUpdatePayload;
