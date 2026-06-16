import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  collectionRule,
  type CollectionRule,
  type NewCollectionRule,
} from "../models/index.js";

export class CollectionRuleRepository extends BaseRepository {
  async findByCollectionId(collectionId: string): Promise<CollectionRule[]> {
    return this.connection
      .select()
      .from(collectionRule)
      .where(
        and(
          eq(collectionRule.projectId, this.storeId),
          eq(collectionRule.collectionId, collectionId)
        )
      )
      .orderBy(asc(collectionRule.sortIndex), asc(collectionRule.id));
  }

  async replaceRules(
    collectionId: string,
    rules: Array<{ field: string; operator: string; value: unknown }>
  ): Promise<CollectionRule[]> {
    await this.connection
      .delete(collectionRule)
      .where(
        and(
          eq(collectionRule.projectId, this.storeId),
          eq(collectionRule.collectionId, collectionId)
        )
      );

    if (rules.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const inserts: NewCollectionRule[] = rules.map((rule, index) => ({
      id: randomUUID(),
      collectionId,
      projectId: this.storeId,
      field: rule.field,
      operator: rule.operator,
      value: rule.value,
      sortIndex: index,
      createdAt: now,
      updatedAt: now,
    }));

    return this.connection.insert(collectionRule).values(inserts).returning();
  }
}
