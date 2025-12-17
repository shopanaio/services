import { BaseRepository } from "../BaseRepository.js";
import { type Currency } from "../models/index.js";

export interface CreateCurrencyData {
  code: string;
  isActive?: boolean;
  exchangeRate?: number;
  exchangeRateAmount?: bigint;
  exchangeRateScale?: number;
}

export class CurrencyRepository extends BaseRepository {
  // TODO
}
