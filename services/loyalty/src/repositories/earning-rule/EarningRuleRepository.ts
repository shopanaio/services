import { and, asc, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { earningRules, type EarningRule, type NewEarningRule } from "../models/index.js";

export class EarningRuleRepository extends BaseRepository {
  async getByIds(ids: readonly string[]): Promise<EarningRule[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(earningRules)
      .where(and(eq(earningRules.storeId, this.storeId), inArray(earningRules.id, [...ids])));
  }

  async listForVersions(programVersionIds: readonly string[]): Promise<EarningRule[]> {
    if (programVersionIds.length === 0) return [];
    return this.connection
      .select()
      .from(earningRules)
      .where(
        and(
          eq(earningRules.storeId, this.storeId),
          inArray(earningRules.programVersionId, [...programVersionIds]),
        ),
      )
      .orderBy(
        asc(earningRules.programVersionId),
        asc(earningRules.priority),
        asc(earningRules.id),
      );
  }
  async findById(id: string): Promise<EarningRule | null> {
    const rows = await this.connection
      .select()
      .from(earningRules)
      .where(and(eq(earningRules.storeId, this.storeId), eq(earningRules.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByCode(programVersionId: string, code: string): Promise<EarningRule | null> {
    const rows = await this.connection
      .select()
      .from(earningRules)
      .where(
        and(
          eq(earningRules.storeId, this.storeId),
          eq(earningRules.programVersionId, programVersionId),
          eq(earningRules.code, code),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listForVersion(programVersionId: string): Promise<EarningRule[]> {
    return this.connection
      .select()
      .from(earningRules)
      .where(
        and(
          eq(earningRules.storeId, this.storeId),
          eq(earningRules.programVersionId, programVersionId),
        ),
      )
      .orderBy(asc(earningRules.priority), asc(earningRules.id));
  }

  async create(input: Omit<NewEarningRule, "storeId">): Promise<EarningRule> {
    const rows = await this.connection
      .insert(earningRules)
      .values({ ...input, storeId: this.storeId })
      .returning();
    return rows[0]!;
  }

  async update(
    id: string,
    input: Partial<Omit<NewEarningRule, "id" | "storeId" | "programVersionId" | "createdAt">>,
  ): Promise<EarningRule | null> {
    const rows = await this.connection
      .update(earningRules)
      .set(input)
      .where(and(eq(earningRules.storeId, this.storeId), eq(earningRules.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(earningRules)
      .where(and(eq(earningRules.storeId, this.storeId), eq(earningRules.id, id)))
      .returning({ id: earningRules.id });
    return rows.length > 0;
  }
}
