import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  dependencyRule,
  type DependencyRule,
  type NewDependencyRule,
} from "../models/index.js";

export class DependencyRuleRepository extends BaseRepository {
  async findById(id: string): Promise<DependencyRule | null> {
    const rows = await this.connection
      .select()
      .from(dependencyRule)
      .where(
        and(
          eq(dependencyRule.projectId, this.storeId),
          eq(dependencyRule.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByProductId(productId: string): Promise<DependencyRule[]> {
    return this.connection
      .select()
      .from(dependencyRule)
      .where(
        and(
          eq(dependencyRule.projectId, this.storeId),
          eq(dependencyRule.productId, productId)
        )
      )
      .orderBy(asc(dependencyRule.priority));
  }

  async findByProductIds(productIds: string[]): Promise<DependencyRule[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyRule)
      .where(
        and(
          eq(dependencyRule.projectId, this.storeId),
          inArray(dependencyRule.productId, productIds)
        )
      )
      .orderBy(asc(dependencyRule.priority));
  }

  async getByIds(ids: readonly string[]): Promise<DependencyRule[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyRule)
      .where(
        and(
          eq(dependencyRule.projectId, this.storeId),
          inArray(dependencyRule.id, [...ids])
        )
      );
  }

  async create(data: {
    productId: string;
    name: string;
    enabled?: boolean;
    priority?: number;
    logicOperator?: string;
  }): Promise<DependencyRule> {
    const now = new Date().toISOString();
    const insert: NewDependencyRule = {
      id: randomUUID(),
      projectId: this.storeId,
      productId: data.productId,
      name: data.name,
      enabled: data.enabled ?? true,
      priority: data.priority ?? 0,
      logicOperator: data.logicOperator ?? "AND",
      createdAt: now,
      updatedAt: now,
    };

    const rows = await this.connection.insert(dependencyRule).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      enabled: boolean;
      priority: number;
      logicOperator: string;
    }>
  ): Promise<DependencyRule | null> {
    const updates: Partial<NewDependencyRule> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.name !== undefined) updates.name = data.name;
    if (data.enabled !== undefined) updates.enabled = data.enabled;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.logicOperator !== undefined) updates.logicOperator = data.logicOperator;

    const rows = await this.connection
      .update(dependencyRule)
      .set(updates)
      .where(
        and(
          eq(dependencyRule.projectId, this.storeId),
          eq(dependencyRule.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(dependencyRule)
      .where(
        and(
          eq(dependencyRule.projectId, this.storeId),
          eq(dependencyRule.id, id)
        )
      )
      .returning({ id: dependencyRule.id });
    return rows.length > 0;
  }
}
