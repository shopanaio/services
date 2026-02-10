import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  dependencyAction,
  type DependencyAction,
  type NewDependencyAction,
} from "../models/index.js";

export class DependencyActionRepository extends BaseRepository {
  async findById(id: string): Promise<DependencyAction | null> {
    const rows = await this.connection
      .select()
      .from(dependencyAction)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          eq(dependencyAction.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByRuleId(ruleId: string): Promise<DependencyAction[]> {
    return this.connection
      .select()
      .from(dependencyAction)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          eq(dependencyAction.ruleId, ruleId)
        )
      )
      .orderBy(asc(dependencyAction.sortIndex));
  }

  async findByRuleIds(ruleIds: readonly string[]): Promise<DependencyAction[]> {
    if (ruleIds.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyAction)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          inArray(dependencyAction.ruleId, [...ruleIds])
        )
      )
      .orderBy(asc(dependencyAction.sortIndex));
  }

  async getByIds(ids: readonly string[]): Promise<DependencyAction[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyAction)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          inArray(dependencyAction.id, [...ids])
        )
      );
  }

  async create(data: {
    ruleId: string;
    actionType: string;
    targetType: string;
    targetId?: string | null;
    requiredValue?: boolean | null;
    priceType?: string | null;
    priceValue?: number | null;
    stackable?: boolean;
    sortIndex?: number;
  }): Promise<DependencyAction> {
    const insert: NewDependencyAction = {
      id: randomUUID(),
      projectId: this.storeId,
      ruleId: data.ruleId,
      actionType: data.actionType,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      requiredValue: data.requiredValue ?? null,
      priceType: data.priceType ?? null,
      priceValue: data.priceValue ?? null,
      stackable: data.stackable ?? false,
      sortIndex: data.sortIndex ?? 0,
    };

    const rows = await this.connection.insert(dependencyAction).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      actionType: string;
      targetType: string;
      targetId: string | null;
      requiredValue: boolean | null;
      priceType: string | null;
      priceValue: number | null;
      stackable: boolean;
      sortIndex: number;
    }>
  ): Promise<DependencyAction | null> {
    const updates: Partial<NewDependencyAction> = {};
    if (data.actionType !== undefined) updates.actionType = data.actionType;
    if (data.targetType !== undefined) updates.targetType = data.targetType;
    if (data.targetId !== undefined) updates.targetId = data.targetId;
    if (data.requiredValue !== undefined) updates.requiredValue = data.requiredValue;
    if (data.priceType !== undefined) updates.priceType = data.priceType;
    if (data.priceValue !== undefined) updates.priceValue = data.priceValue;
    if (data.stackable !== undefined) updates.stackable = data.stackable;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const rows = await this.connection
      .update(dependencyAction)
      .set(updates)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          eq(dependencyAction.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(dependencyAction)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          eq(dependencyAction.id, id)
        )
      )
      .returning({ id: dependencyAction.id });
    return rows.length > 0;
  }

  async deleteByRuleId(ruleId: string): Promise<void> {
    await this.connection
      .delete(dependencyAction)
      .where(
        and(
          eq(dependencyAction.projectId, this.storeId),
          eq(dependencyAction.ruleId, ruleId)
        )
      );
  }
}
