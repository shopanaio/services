import { BaseRepository } from "../BaseRepository.js";

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
