import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  locale,
  type Locale,
  type NewLocale,
} from "../models/index.js";

export interface CreateLocaleData {
  code: string;
  isActive?: boolean;
}

export interface UpdateLocaleData {
  isActive?: boolean;
}

export class LocaleRepository extends BaseRepository {
  // ============ CRUD ============

  async findByProjectId(projectId: string): Promise<Locale[]> {
    return this.connection
      .select()
      .from(locale)
      .where(eq(locale.projectId, projectId));
  }

  async findByCode(projectId: string, code: string): Promise<Locale | null> {
    const result = await this.connection
      .select()
      .from(locale)
      .where(
        and(
          eq(locale.projectId, projectId),
          eq(locale.code, code)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async create(projectId: string, data: CreateLocaleData): Promise<Locale> {
    const now = new Date();

    const newLocale: NewLocale = {
      projectId,
      code: data.code,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.connection
      .insert(locale)
      .values(newLocale)
      .returning();

    return result[0];
  }

  async createMany(projectId: string, data: CreateLocaleData[]): Promise<Locale[]> {
    if (data.length === 0) return [];

    const now = new Date();

    const newLocales: NewLocale[] = data.map((item) => ({
      projectId,
      code: item.code,
      isActive: item.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    }));

    return this.connection
      .insert(locale)
      .values(newLocales)
      .returning();
  }

  async update(projectId: string, code: string, data: UpdateLocaleData): Promise<Locale | null> {
    const updateData: Partial<NewLocale> = {
      updatedAt: new Date(),
    };

    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const result = await this.connection
      .update(locale)
      .set(updateData)
      .where(
        and(
          eq(locale.projectId, projectId),
          eq(locale.code, code)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async delete(projectId: string, code: string): Promise<boolean> {
    const result = await this.connection
      .delete(locale)
      .where(
        and(
          eq(locale.projectId, projectId),
          eq(locale.code, code)
        )
      )
      .returning({ code: locale.code });

    return result.length > 0;
  }

  async deleteMany(projectId: string, codes: string[]): Promise<number> {
    if (codes.length === 0) return 0;

    const result = await this.connection
      .delete(locale)
      .where(
        and(
          eq(locale.projectId, projectId),
          inArray(locale.code, codes)
        )
      )
      .returning({ code: locale.code });

    return result.length;
  }

  // ============ Loader ============

  async getByProjectIds(projectIds: readonly string[]): Promise<Locale[]> {
    return this.connection
      .select()
      .from(locale)
      .where(inArray(locale.projectId, [...projectIds]));
  }
}
