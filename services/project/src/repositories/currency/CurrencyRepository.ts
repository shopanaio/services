import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  currency,
  type Currency,
  type NewCurrency,
} from "../models/index.js";

export interface CreateCurrencyData {
  code: string;
  isActive?: boolean;
  exchangeRate?: number;
  exchangeRateAmount?: bigint;
  exchangeRateScale?: number;
}

const DEFAULT_EXCHANGE_RATE_SCALE = 8;
const IDENTITY_EXCHANGE_RATE = 1;

/**
 * Converts a floating exchange rate into an integer fraction (amount/10^scale).
 * Uses rounding, because the input is already a float and cannot be represented exactly.
 */
function exchangeRateToFraction(
  exchangeRate: number,
  scale: number,
): { amount: bigint; scale: number } {
  if (!Number.isFinite(exchangeRate)) {
    throw new Error("Exchange rate must be a finite number");
  }
  if (!Number.isInteger(scale) || scale < 0) {
    throw new Error("Exchange rate scale must be a non-negative integer");
  }

  const multiplier = 10 ** scale;
  const scaled = Math.round(exchangeRate * multiplier);

  if (!Number.isSafeInteger(scaled)) {
    throw new Error("Exchange rate is too large to convert safely from float");
  }

  return { amount: BigInt(scaled), scale };
}

/** Converts an integer fraction (amount/10^scale) into a float for legacy APIs. */
function exchangeRateFromFraction(amount: bigint, scale: number): number {
  return Number(amount) / 10 ** scale;
}

function defaultScaleForExchangeRate(exchangeRate: number): number {
  return exchangeRate === IDENTITY_EXCHANGE_RATE ? 0 : DEFAULT_EXCHANGE_RATE_SCALE;
}

export class CurrencyRepository extends BaseRepository {
  // ============ CRUD ============

  async findByProjectId(projectId: string): Promise<Currency[]> {
    return this.connection
      .select()
      .from(currency)
      .where(eq(currency.projectId, projectId));
  }

  async findByCode(projectId: string, code: string): Promise<Currency | null> {
    const result = await this.connection
      .select()
      .from(currency)
      .where(
        and(
          eq(currency.projectId, projectId),
          eq(currency.code, code)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(projectId: string, data: CreateCurrencyData): Promise<Currency> {
    const now = new Date();

    const requestedExchangeRate = data.exchangeRate ?? IDENTITY_EXCHANGE_RATE;
    const exchangeRateScale =
      data.exchangeRateScale ??
      (data.exchangeRateAmount !== undefined ? 0 : defaultScaleForExchangeRate(requestedExchangeRate));
    const exchangeRateAmount =
      data.exchangeRateAmount ??
      exchangeRateToFraction(requestedExchangeRate, exchangeRateScale).amount;
    const exchangeRate = exchangeRateFromFraction(exchangeRateAmount, exchangeRateScale);

    const newCurrency: NewCurrency = {
      projectId,
      code: data.code,
      isActive: data.isActive ?? true,
      exchangeRateAmount,
      exchangeRateScale,
      exchangeRate,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(currency)
      .values(newCurrency)
      .returning();

    return result[0];
  }

  async createMany(projectId: string, data: CreateCurrencyData[]): Promise<Currency[]> {
    if (data.length === 0) return [];

    const now = new Date();

    const newCurrencies: NewCurrency[] = data.map((item) => {
      const requestedExchangeRate = item.exchangeRate ?? IDENTITY_EXCHANGE_RATE;
      const exchangeRateScale =
        item.exchangeRateScale ??
        (item.exchangeRateAmount !== undefined ? 0 : defaultScaleForExchangeRate(requestedExchangeRate));
      const exchangeRateAmount =
        item.exchangeRateAmount ??
        exchangeRateToFraction(requestedExchangeRate, exchangeRateScale).amount;
      const exchangeRate = exchangeRateFromFraction(exchangeRateAmount, exchangeRateScale);

      return {
        projectId,
        code: item.code,
        isActive: item.isActive ?? true,
        exchangeRateAmount,
        exchangeRateScale,
        exchangeRate,
        createdAt: now,
        updatedAt: now,
      };
    });

    return this.connection
      .insert(currency)
      .values(newCurrencies)
      .returning();
  }

  async delete(projectId: string, code: string): Promise<boolean> {
    const result = await this.connection
      .delete(currency)
      .where(
        and(
          eq(currency.projectId, projectId),
          eq(currency.code, code)
        )
      )
      .returning({ code: currency.code });

    return result.length > 0;
  }

  // ============ Loader ============

  async getByProjectIds(projectIds: readonly string[]): Promise<Currency[]> {
    return this.connection
      .select()
      .from(currency)
      .where(inArray(currency.projectId, [...projectIds]));
  }
}
