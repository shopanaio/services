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
      exchangeRate: data.exchangeRate ?? 1,
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
      exchangeRate: item.exchangeRate ?? 1,
      createdAt: now,
      updatedAt: now,
    }));

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
