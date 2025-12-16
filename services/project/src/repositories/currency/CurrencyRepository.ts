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
  decimalPlaces?: number;
  exchangeRate?: number;
  symbolLeft?: string;
  symbolRight?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
}

export interface UpdateCurrencyFormatData {
  decimalPlaces?: number;
  symbolLeft?: string;
  symbolRight?: string;
  decimalSeparator?: string;
  thousandsSeparator?: string;
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

    const newCurrency: NewCurrency = {
      projectId,
      code: data.code,
      isActive: data.isActive ?? true,
      decimalPlaces: data.decimalPlaces ?? 2,
      exchangeRate: data.exchangeRate ?? 1,
      symbolLeft: data.symbolLeft ?? "",
      symbolRight: data.symbolRight ?? "",
      decimalSeparator: data.decimalSeparator ?? ".",
      thousandsSeparator: data.thousandsSeparator ?? ",",
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

    const newCurrencies: NewCurrency[] = data.map((item) => ({
      projectId,
      code: item.code,
      isActive: item.isActive ?? true,
      decimalPlaces: item.decimalPlaces ?? 2,
      exchangeRate: item.exchangeRate ?? 1,
      symbolLeft: item.symbolLeft ?? "",
      symbolRight: item.symbolRight ?? "",
      decimalSeparator: item.decimalSeparator ?? ".",
      thousandsSeparator: item.thousandsSeparator ?? ",",
      createdAt: now,
      updatedAt: now,
    }));

    return this.connection
      .insert(currency)
      .values(newCurrencies)
      .returning();
  }

  async updateFormat(projectId: string, code: string, data: UpdateCurrencyFormatData): Promise<Currency | null> {
    const updateData: Partial<NewCurrency> = {
      updatedAt: new Date(),
    };

    if (data.decimalPlaces !== undefined) updateData.decimalPlaces = data.decimalPlaces;
    if (data.symbolLeft !== undefined) updateData.symbolLeft = data.symbolLeft;
    if (data.symbolRight !== undefined) updateData.symbolRight = data.symbolRight;
    if (data.decimalSeparator !== undefined) updateData.decimalSeparator = data.decimalSeparator;
    if (data.thousandsSeparator !== undefined) updateData.thousandsSeparator = data.thousandsSeparator;

    const result = await this.connection
      .update(currency)
      .set(updateData)
      .where(
        and(
          eq(currency.projectId, projectId),
          eq(currency.code, code)
        )
      )
      .returning();

    return result[0] ?? null;
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
