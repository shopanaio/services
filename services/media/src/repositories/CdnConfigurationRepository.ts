import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import {
  cdnConfigurations,
  type CdnConfiguration,
  type CdnProviderConfig,
  type CdnTransformConfig,
  type NewCdnConfiguration,
} from "./models/index.js";
import { generateUuidV7 } from "./generateUuidV7.js";

export interface CdnConfigurationInput {
  name: string;
  provider: string;
  baseUrl: string;
  pathPrefix?: string;
  enabled?: boolean;
  isDefault?: boolean;
  signingMode?: string;
  secretRef?: string | null;
  transformStrategy?: string;
  urlTemplate?: string | null;
  providerConfig?: CdnProviderConfig;
  transformConfig?: CdnTransformConfig;
}

export type CdnConfigurationUpdateInput = Partial<CdnConfigurationInput>;

export class CdnConfigurationRepository {
  constructor(private readonly db: Database) {}

  async findById(
    assetGroupId: string,
    id: string
  ): Promise<CdnConfiguration | null> {
    const rows = await this.db
      .select()
      .from(cdnConfigurations)
      .where(
        and(
          eq(cdnConfigurations.assetGroupId, assetGroupId),
          eq(cdnConfigurations.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getAll(assetGroupId: string): Promise<CdnConfiguration[]> {
    return this.db
      .select()
      .from(cdnConfigurations)
      .where(eq(cdnConfigurations.assetGroupId, assetGroupId))
      .orderBy(asc(cdnConfigurations.name), asc(cdnConfigurations.id));
  }

  async findDefault(assetGroupId: string): Promise<CdnConfiguration | null> {
    const rows = await this.db
      .select()
      .from(cdnConfigurations)
      .where(
        and(
          eq(cdnConfigurations.assetGroupId, assetGroupId),
          eq(cdnConfigurations.enabled, true),
          eq(cdnConfigurations.isDefault, true)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async create(
    assetGroupId: string,
    input: CdnConfigurationInput
  ): Promise<CdnConfiguration> {
    const id = await generateUuidV7(this.db);
    return this.db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(cdnConfigurations)
          .set({ isDefault: false, updatedAt: new Date().toISOString() })
          .where(eq(cdnConfigurations.assetGroupId, assetGroupId));
      }

      const rows = await tx
        .insert(cdnConfigurations)
        .values({
          id,
          assetGroupId,
          name: input.name,
          provider: input.provider,
          baseUrl: input.baseUrl,
          pathPrefix: input.pathPrefix ?? "",
          enabled: input.isDefault ? true : (input.enabled ?? true),
          isDefault: input.isDefault ?? false,
          signingMode: input.signingMode ?? "NONE",
          secretRef: input.secretRef ?? null,
          transformStrategy: input.transformStrategy ?? "NONE",
          urlTemplate: input.urlTemplate ?? null,
          providerConfig: input.providerConfig ?? {},
          transformConfig: input.transformConfig ?? {},
        })
        .returning();
      return rows[0];
    });
  }

  async update(
    assetGroupId: string,
    id: string,
    input: CdnConfigurationUpdateInput
  ): Promise<CdnConfiguration | null> {
    return this.db.transaction(async (tx) => {
      if (input.isDefault) {
        const configurations = await tx
          .select({ id: cdnConfigurations.id })
          .from(cdnConfigurations)
          .where(eq(cdnConfigurations.assetGroupId, assetGroupId))
          .orderBy(asc(cdnConfigurations.id))
          .for("update");

        if (!configurations.some((configuration) => configuration.id === id)) {
          return null;
        }

        await tx
          .update(cdnConfigurations)
          .set({ isDefault: false, updatedAt: new Date().toISOString() })
          .where(eq(cdnConfigurations.assetGroupId, assetGroupId));
      }

      const values: Partial<NewCdnConfiguration> = {
        ...input,
        updatedAt: new Date().toISOString(),
      };
      if (input.isDefault) values.enabled = true;

      const rows = await tx
        .update(cdnConfigurations)
        .set(values)
        .where(
          and(
            eq(cdnConfigurations.assetGroupId, assetGroupId),
            eq(cdnConfigurations.id, id)
          )
        )
        .returning();
      return rows[0] ?? null;
    });
  }

  async setDefault(
    assetGroupId: string,
    id: string
  ): Promise<CdnConfiguration | null> {
    return this.update(assetGroupId, id, { isDefault: true, enabled: true });
  }

  async delete(assetGroupId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(cdnConfigurations)
      .where(
        and(
          eq(cdnConfigurations.assetGroupId, assetGroupId),
          eq(cdnConfigurations.id, id)
        )
      )
      .returning({ id: cdnConfigurations.id });
    return rows.length > 0;
  }
}
