import { and, eq } from "drizzle-orm";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import { locale, type Locale, type LocaleCode } from "../models/index.js";

export interface CreateLocaleData {
  code: LocaleCode;
  isActive?: boolean;
}

export interface UpdateLocaleData {
  isActive?: boolean;
}

export class LocaleRepository extends BaseRepository {
  @ReadOnly()
  async findByStoreId(storeId: string): Promise<Locale[]> {
    return this.connection
      .select()
      .from(locale)
      .where(eq(locale.storeId, storeId));
  }

  @Transactional()
  async create(storeId: string, data: CreateLocaleData): Promise<Locale | null> {
    const now = new Date();
    const [created] = await this.connection
      .insert(locale)
      .values({
        storeId,
        code: data.code,
        isActive: data.isActive ?? false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({
        target: [locale.storeId, locale.code],
      })
      .returning();
    return created ?? null;
  }

  @Transactional()
  async setActive(storeId: string, code: LocaleCode, isActive: boolean): Promise<void> {
    await this.connection
      .update(locale)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(locale.storeId, storeId), eq(locale.code, code)));
  }

  @Transactional()
  async delete(storeId: string, code: LocaleCode): Promise<boolean> {
    const deleted = await this.connection
      .delete(locale)
      .where(and(eq(locale.storeId, storeId), eq(locale.code, code)))
      .returning({ code: locale.code });
    return deleted.length > 0;
  }
}
