import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  conditionGroup,
  type ConditionGroup,
  type NewConditionGroup,
} from "../models/index.js";

export class ConditionGroupRepository extends BaseRepository {
  async findById(id: string): Promise<ConditionGroup | null> {
    const rows = await this.connection
      .select()
      .from(conditionGroup)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          eq(conditionGroup.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByRuleId(ruleId: string): Promise<ConditionGroup[]> {
    return this.connection
      .select()
      .from(conditionGroup)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          eq(conditionGroup.ruleId, ruleId)
        )
      )
      .orderBy(asc(conditionGroup.sortIndex));
  }

  async findByRuleIds(ruleIds: readonly string[]): Promise<ConditionGroup[]> {
    if (ruleIds.length === 0) return [];
    return this.connection
      .select()
      .from(conditionGroup)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          inArray(conditionGroup.ruleId, [...ruleIds])
        )
      )
      .orderBy(asc(conditionGroup.sortIndex));
  }

  async getByIds(ids: readonly string[]): Promise<ConditionGroup[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(conditionGroup)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          inArray(conditionGroup.id, [...ids])
        )
      );
  }

  async create(data: {
    ruleId: string;
    logicOperator?: string;
    sortIndex?: number;
  }): Promise<ConditionGroup> {
    const insert: NewConditionGroup = {
      id: randomUUID(),
      projectId: this.storeId,
      ruleId: data.ruleId,
      logicOperator: data.logicOperator ?? "AND",
      sortIndex: data.sortIndex ?? 0,
    };

    const rows = await this.connection.insert(conditionGroup).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      logicOperator: string;
      sortIndex: number;
    }>
  ): Promise<ConditionGroup | null> {
    const updates: Partial<NewConditionGroup> = {};
    if (data.logicOperator !== undefined) updates.logicOperator = data.logicOperator;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const rows = await this.connection
      .update(conditionGroup)
      .set(updates)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          eq(conditionGroup.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(conditionGroup)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          eq(conditionGroup.id, id)
        )
      )
      .returning({ id: conditionGroup.id });
    return rows.length > 0;
  }

  async deleteByRuleId(ruleId: string): Promise<void> {
    await this.connection
      .delete(conditionGroup)
      .where(
        and(
          eq(conditionGroup.projectId, this.storeId),
          eq(conditionGroup.ruleId, ruleId)
        )
      );
  }
}
