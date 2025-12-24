import { eq } from "drizzle-orm";
import { ReadOnly } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { currency, type Currency } from "../models/index.js";

export interface CreateCurrencyData {
  code: string;
  isActive?: boolean;
  exchangeRate?: number;
  exchangeRateAmount?: bigint;
  exchangeRateScale?: number;
}

export class CurrencyRepository extends BaseRepository {
  @ReadOnly()
  async findByStoreId(storeId: string): Promise<Currency[]> {
    return this.connection
      .select()
      .from(currency)
      .where(eq(currency.storeId, storeId));
  }
}
