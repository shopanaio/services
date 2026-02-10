import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  condition,
  type Condition,
  type NewCondition,
} from "../models/index.js";

export class ConditionRepository extends BaseRepository {
  async findById(id: string): Promise<Condition | null> {
    const rows = await this.connection
      .select()
      .from(condition)
      .where(
        and(eq(condition.projectId, this.storeId), eq(condition.id, id))
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByGroupId(groupId: string): Promise<Condition[]> {
    return this.connection
      .select()
      .from(condition)
      .where(
        and(
          eq(condition.projectId, this.storeId),
          eq(condition.groupId, groupId)
        )
      )
      .orderBy(asc(condition.sortIndex));
  }

  async findByGroupIds(groupIds: readonly string[]): Promise<Condition[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(condition)
      .where(
        and(
          eq(condition.projectId, this.storeId),
          inArray(condition.groupId, [...groupIds])
        )
      )
      .orderBy(asc(condition.sortIndex));
  }

  async getByIds(ids: readonly string[]): Promise<Condition[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(condition)
      .where(
        and(
          eq(condition.projectId, this.storeId),
          inArray(condition.id, [...ids])
        )
      );
  }

  async create(data: {
    groupId: string;
    category: string;
    subject: string;
    operator: string;
    targetType: string;
    targetId: string;
    value?: number | null;
    sortIndex?: number;
  }): Promise<Condition> {
    const insert: NewCondition = {
      id: randomUUID(),
      projectId: this.storeId,
      groupId: data.groupId,
      category: data.category,
      subject: data.subject,
      operator: data.operator,
      targetType: data.targetType,
      targetId: data.targetId,
      value: data.value ?? null,
      sortIndex: data.sortIndex ?? 0,
    };

    const rows = await this.connection.insert(condition).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      category: string;
      subject: string;
      operator: string;
      targetType: string;
      targetId: string;
      value: number | null;
      sortIndex: number;
    }>
  ): Promise<Condition | null> {
    const updates: Partial<NewCondition> = {};
    if (data.category !== undefined) updates.category = data.category;
    if (data.subject !== undefined) updates.subject = data.subject;
    if (data.operator !== undefined) updates.operator = data.operator;
    if (data.targetType !== undefined) updates.targetType = data.targetType;
    if (data.targetId !== undefined) updates.targetId = data.targetId;
    if (data.value !== undefined) updates.value = data.value;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const rows = await this.connection
      .update(condition)
      .set(updates)
      .where(
        and(eq(condition.projectId, this.storeId), eq(condition.id, id))
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(condition)
      .where(
        and(eq(condition.projectId, this.storeId), eq(condition.id, id))
      )
      .returning({ id: condition.id });
    return rows.length > 0;
  }

  async deleteByGroupId(groupId: string): Promise<void> {
    await this.connection
      .delete(condition)
      .where(
        and(
          eq(condition.projectId, this.storeId),
          eq(condition.groupId, groupId)
        )
      );
  }
}
