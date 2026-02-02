import { eq, and } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import {
  warehouseTranslation,
  type WarehouseTranslation,
  type NewWarehouseTranslation,
} from "../models";

export class TranslationRepository {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  /**
   * Get active connection (transaction if in tx, otherwise db)
   */
  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Warehouse Translations
  // ─────────────────────────────────────────────────────────────────────────

  async getWarehouseTranslation(
    warehouseId: string,
    locale: string
  ): Promise<WarehouseTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(warehouseTranslation)
      .where(
        and(
          eq(warehouseTranslation.warehouseId, warehouseId),
          eq(warehouseTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async upsertWarehouseTranslation(
    data: NewWarehouseTranslation
  ): Promise<WarehouseTranslation> {
    const result = await this.connection
      .insert(warehouseTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [warehouseTranslation.warehouseId, warehouseTranslation.locale],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }
}
