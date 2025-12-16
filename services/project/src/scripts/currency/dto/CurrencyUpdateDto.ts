import type { CurrencyUpdatePayload } from "./shared.js";

export interface CurrencyFormatUpdateParams {
  projectId: string;
  code: string;
  decimalPlaces?: number;
  symbolLeft?: string;
  symbolRight?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
}

export type CurrencyFormatUpdateResult = CurrencyUpdatePayload;

export interface CurrencySetDefaultParams {
  projectId: string;
  currency: string;
}

export type CurrencySetDefaultResult = CurrencyUpdatePayload;
