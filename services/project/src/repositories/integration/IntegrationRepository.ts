import { eq, and } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  storeIntegration,
  type StoreIntegration,
  type IntegrationType,
  type IntegrationStatus,
} from "../models/index.js";

export interface CreateIntegrationData {
  storeId: string;
  type: IntegrationType;
  provider: string;
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

export interface UpdateIntegrationData {
  status?: IntegrationStatus;
  config?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  lastSyncAt?: Date;
  errorMessage?: string | null;
}

export class IntegrationRepository extends BaseRepository {
  /**
   * Create a new integration
   */
  async create(data: CreateIntegrationData): Promise<StoreIntegration> {
    const [result] = await this.connection
      .insert(storeIntegration)
      .values({
        storeId: data.storeId,
        type: data.type,
        provider: data.provider,
        status: data.status ?? "active",
        config: data.config ?? {},
        credentials: data.credentials ?? {},
      })
      .returning();

    return result;
  }

  /**
   * Find integration by store and type
   */
  async findByType(
    storeId: string,
    type: IntegrationType
  ): Promise<StoreIntegration | undefined> {
    const [result] = await this.connection
      .select()
      .from(storeIntegration)
      .where(
        and(
          eq(storeIntegration.storeId, storeId),
          eq(storeIntegration.type, type)
        )
      );

    return result;
  }

  /**
   * Find all integrations for a store
   */
  async findByStore(storeId: string): Promise<StoreIntegration[]> {
    return this.connection
      .select()
      .from(storeIntegration)
      .where(eq(storeIntegration.storeId, storeId));
  }

  /**
   * Update integration
   */
  async update(
    storeId: string,
    type: IntegrationType,
    data: UpdateIntegrationData
  ): Promise<StoreIntegration | undefined> {
    const [result] = await this.connection
      .update(storeIntegration)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeIntegration.storeId, storeId),
          eq(storeIntegration.type, type)
        )
      )
      .returning();

    return result;
  }

  /**
   * Upsert integration (create or update)
   */
  async upsert(data: CreateIntegrationData): Promise<StoreIntegration> {
    const existing = await this.findByType(data.storeId, data.type);

    if (existing) {
      const updated = await this.update(data.storeId, data.type, {
        status: data.status,
        config: data.config,
        credentials: data.credentials,
      });
      return updated!;
    }

    return this.create(data);
  }

  /**
   * Delete integration
   */
  async delete(storeId: string, type: IntegrationType): Promise<boolean> {
    const result = await this.connection
      .delete(storeIntegration)
      .where(
        and(
          eq(storeIntegration.storeId, storeId),
          eq(storeIntegration.type, type)
        )
      )
      .returning({ id: storeIntegration.id });

    return result.length > 0;
  }
}
