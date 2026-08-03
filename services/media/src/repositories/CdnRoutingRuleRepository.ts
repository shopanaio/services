import { and, asc, eq } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";
import {
  cdnRoutingRules,
  type CdnRoutingConditions,
  type CdnRoutingRule,
  type CdnTransformOverrides,
  type NewCdnRoutingRule,
} from "./models/index.js";
import { generateUuidV7 } from "./generateUuidV7.js";

export interface CdnRoutingRuleInput {
  cdnConfigurationId: string;
  name: string;
  priority?: number;
  enabled?: boolean;
  conditions?: CdnRoutingConditions;
  transformOverrides?: CdnTransformOverrides;
}

export type CdnRoutingRuleUpdateInput = Partial<CdnRoutingRuleInput>;

export class CdnRoutingRuleRepository {
  constructor(private readonly db: Database) {}

  async findById(
    assetGroupId: string,
    id: string
  ): Promise<CdnRoutingRule | null> {
    const rows = await this.db
      .select()
      .from(cdnRoutingRules)
      .where(
        and(
          eq(cdnRoutingRules.assetGroupId, assetGroupId),
          eq(cdnRoutingRules.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getAll(assetGroupId: string): Promise<CdnRoutingRule[]> {
    return this.db
      .select()
      .from(cdnRoutingRules)
      .where(eq(cdnRoutingRules.assetGroupId, assetGroupId))
      .orderBy(asc(cdnRoutingRules.priority), asc(cdnRoutingRules.id));
  }

  async getEnabled(assetGroupId: string): Promise<CdnRoutingRule[]> {
    return this.db
      .select()
      .from(cdnRoutingRules)
      .where(
        and(
          eq(cdnRoutingRules.assetGroupId, assetGroupId),
          eq(cdnRoutingRules.enabled, true)
        )
      )
      .orderBy(asc(cdnRoutingRules.priority), asc(cdnRoutingRules.id));
  }

  async create(
    assetGroupId: string,
    input: CdnRoutingRuleInput
  ): Promise<CdnRoutingRule> {
    const id = await generateUuidV7(this.db);
    const rows = await this.db
      .insert(cdnRoutingRules)
      .values({
        id,
        assetGroupId,
        cdnConfigurationId: input.cdnConfigurationId,
        name: input.name,
        priority: input.priority ?? 0,
        enabled: input.enabled ?? true,
        conditions: input.conditions ?? {},
        transformOverrides: input.transformOverrides ?? {},
      })
      .returning();
    return rows[0];
  }

  async update(
    assetGroupId: string,
    id: string,
    input: CdnRoutingRuleUpdateInput
  ): Promise<CdnRoutingRule | null> {
    const values: Partial<NewCdnRoutingRule> = {
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const rows = await this.db
      .update(cdnRoutingRules)
      .set(values)
      .where(
        and(
          eq(cdnRoutingRules.assetGroupId, assetGroupId),
          eq(cdnRoutingRules.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(assetGroupId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(cdnRoutingRules)
      .where(
        and(
          eq(cdnRoutingRules.assetGroupId, assetGroupId),
          eq(cdnRoutingRules.id, id)
        )
      )
      .returning({ id: cdnRoutingRules.id });
    return rows.length > 0;
  }
}
