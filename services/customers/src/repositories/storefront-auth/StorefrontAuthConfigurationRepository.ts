import { and, eq } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import { BaseRepository } from "../BaseRepository.js";
import type { Database } from "../Repository.js";
import {
  storefrontAuthConfiguration,
  type StorefrontAuthConfiguration,
} from "../models/index.js";

export class StorefrontAuthConfigurationRepository extends BaseRepository {
  constructor(db: Database, txManager: TransactionManager<Database>) {
    super(db, txManager);
  }

  async findByStoreId(
    storeId: string,
  ): Promise<StorefrontAuthConfiguration | null> {
    const rows = await this.connection
      .select()
      .from(storefrontAuthConfiguration)
      .where(eq(storefrontAuthConfiguration.storeId, storeId))
      .limit(1);

    return rows[0] ?? null;
  }

  async createIfAbsent(input: {
    storeId: string;
    organizationId: string;
    applicationId: string;
  }): Promise<StorefrontAuthConfiguration> {
    await this.connection
      .insert(storefrontAuthConfiguration)
      .values(input)
      .onConflictDoNothing({ target: storefrontAuthConfiguration.storeId });

    const configuration = await this.findByStoreId(input.storeId);
    if (!configuration) {
      throw new Error("Failed to persist storefront auth configuration");
    }
    if (configuration.organizationId !== input.organizationId) {
      throw new Error("Storefront auth organization does not match store event");
    }

    return configuration;
  }

  async delete(input: {
    storeId: string;
    organizationId: string;
  }): Promise<boolean> {
    const rows = await this.connection
      .delete(storefrontAuthConfiguration)
      .where(
        and(
          eq(storefrontAuthConfiguration.storeId, input.storeId),
          eq(storefrontAuthConfiguration.organizationId, input.organizationId),
        ),
      )
      .returning({ storeId: storefrontAuthConfiguration.storeId });

    return rows.length > 0;
  }
}
