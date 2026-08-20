import { createQuery, createRelayQuery, type InferRelayInput } from "@shopana/drizzle-query";
import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import { decodeRatingCriterionGlobalId } from "../global-id-where-mappers.js";
import {
  ratingCriterion,
  ratingCriterionAssignment,
  ratingCriterionTranslation,
  storeConfiguration,
  type NewRatingCriterion,
  type NewRatingCriterionAssignment,
  type NewRatingCriterionTranslation,
  type NewStoreConfiguration,
  type RatingCriterion,
  type RatingCriterionAssignment,
  type RatingCriterionTranslation,
  type StoreConfiguration,
} from "../models/index.js";
import type { OptimisticMutationResult, RepositoryConnectionResult } from "../types.js";

export const ratingCriterionRelayQuery = createRelayQuery(
  createQuery(ratingCriterion)
    .include(["id"])
    .mapWhereFields({ id: decodeRatingCriterionGlobalId })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "reviewRatingCriterion", tieBreaker: "id" },
);

export type RatingCriterionRelayInput = InferRelayInput<typeof ratingCriterionRelayQuery>;

export interface RatingCriterionAggregate {
  criterion: RatingCriterion;
  translations: RatingCriterionTranslation[];
  assignments: RatingCriterionAssignment[];
}

export type StoreConfigurationPatch = Partial<
  Pick<
    NewStoreConfiguration,
    | "reviewsEnabled"
    | "questionsEnabled"
    | "guestReviewsEnabled"
    | "guestQuestionsEnabled"
    | "customerAnswersEnabled"
    | "verifiedPurchaseRequired"
    | "reviewModerationMode"
    | "questionModerationMode"
    | "answerModerationMode"
    | "reviewDuplicatePolicy"
    | "reviewRequestsEnabled"
    | "reviewRequestDelayDays"
    | "reviewRequestExpiryDays"
    | "reviewEditWindowHours"
    | "questionEditWindowHours"
    | "answerEditWindowHours"
    | "maxReviewMediaCount"
    | "maxAnswersPerQuestion"
  >
>;

export type RatingCriterionPatch = Partial<
  Pick<
    NewRatingCriterion,
    | "code"
    | "defaultTitle"
    | "defaultDescription"
    | "weight"
    | "isRequired"
    | "isActive"
    | "appliesToAllProducts"
    | "sortIndex"
  >
>;

export class ConfigurationRepository extends BaseRepository {
  @ReadOnly()
  async findStoreConfiguration(): Promise<StoreConfiguration | null> {
    const rows = await this.connection
      .select()
      .from(storeConfiguration)
      .where(eq(storeConfiguration.storeId, this.storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  @Transactional()
  async createStoreConfiguration(
    values: StoreConfigurationPatch = {},
  ): Promise<StoreConfiguration> {
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(storeConfiguration)
      .values({
        id: await this.generateUuidV7(),
        storeId: this.storeId,
        ...values,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    const created = rows[0];
    if (!created) throw new Error("Failed to create reviews store configuration");
    return created;
  }

  @Transactional()
  async updateStoreConfiguration(
    id: string,
    expectedRevision: number,
    patch: StoreConfigurationPatch,
  ): Promise<OptimisticMutationResult<StoreConfiguration>> {
    const rows = await this.connection
      .update(storeConfiguration)
      .set({
        ...patch,
        revision: sql`${storeConfiguration.revision} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(storeConfiguration.storeId, this.storeId),
          eq(storeConfiguration.id, id),
          eq(storeConfiguration.revision, expectedRevision),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };

    const current = await this.findStoreConfigurationById(id);
    return current ? { status: "conflict", current } : { status: "not_found" };
  }

  @ReadOnly()
  async findCriterionById(id: string): Promise<RatingCriterionAggregate | null> {
    const rows = await this.connection
      .select()
      .from(ratingCriterion)
      .where(
        and(
          eq(ratingCriterion.storeId, this.storeId),
          eq(ratingCriterion.id, id),
          isNull(ratingCriterion.deletedAt),
        ),
      )
      .limit(1);
    const criterion = rows[0];
    if (!criterion) return null;

    const [translations, assignments] = await Promise.all([
      this.getCriterionTranslations(id),
      this.getCriterionAssignments(id),
    ]);
    return { criterion, translations, assignments };
  }

  @ReadOnly()
  async getCriteriaByIds(ids: readonly string[]): Promise<RatingCriterion[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(ratingCriterion)
      .where(
        and(
          eq(ratingCriterion.storeId, this.storeId),
          inArray(ratingCriterion.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async getCriterionTranslationsByCriterionIds(
    criterionIds: readonly string[],
  ): Promise<RatingCriterionTranslation[]> {
    if (criterionIds.length === 0) return [];
    return this.connection
      .select()
      .from(ratingCriterionTranslation)
      .where(
        and(
          eq(ratingCriterionTranslation.storeId, this.storeId),
          inArray(ratingCriterionTranslation.criterionId, [...new Set(criterionIds)]),
        ),
      )
      .orderBy(asc(ratingCriterionTranslation.criterionId), asc(ratingCriterionTranslation.locale));
  }

  @ReadOnly()
  async getCriterionAssignmentsByCriterionIds(
    criterionIds: readonly string[],
  ): Promise<RatingCriterionAssignment[]> {
    if (criterionIds.length === 0) return [];
    return this.connection
      .select()
      .from(ratingCriterionAssignment)
      .where(
        and(
          eq(ratingCriterionAssignment.storeId, this.storeId),
          inArray(ratingCriterionAssignment.criterionId, [...new Set(criterionIds)]),
        ),
      )
      .orderBy(
        asc(ratingCriterionAssignment.criterionId),
        asc(ratingCriterionAssignment.createdAt),
      );
  }

  @ReadOnly()
  async getCriterionAssignmentsByIds(ids: readonly string[]): Promise<RatingCriterionAssignment[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(ratingCriterionAssignment)
      .where(
        and(
          eq(ratingCriterionAssignment.storeId, this.storeId),
          inArray(ratingCriterionAssignment.id, [...new Set(ids)]),
        ),
      );
  }

  @ReadOnly()
  async findCriterionAssignmentById(id: string): Promise<RatingCriterionAssignment | null> {
    const rows = await this.connection
      .select()
      .from(ratingCriterionAssignment)
      .where(
        and(
          eq(ratingCriterionAssignment.storeId, this.storeId),
          eq(ratingCriterionAssignment.id, id),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  @ReadOnly()
  async getCriterionConnection(
    args: RatingCriterionRelayInput,
  ): Promise<RepositoryConnectionResult> {
    const { where, orderBy, ...pagination } = args;
    const mergedWhere: RatingCriterionRelayInput["where"] = {
      _and: [
        { storeId: { _eq: this.storeId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const executeInput: RatingCriterionRelayInput = {
      ...pagination,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "sortIndex", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      ratingCriterionRelayQuery.execute(this.connection, executeInput),
      ratingCriterionRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);
    return {
      edges: result.edges.map(({ cursor, node }) => ({
        cursor,
        nodeId: node.id,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @Transactional()
  async createCriterion(input: {
    criterion: Omit<NewRatingCriterion, "id" | "storeId" | "createdAt" | "updatedAt" | "deletedAt">;
    translations?: readonly Omit<
      NewRatingCriterionTranslation,
      "storeId" | "criterionId" | "createdAt" | "updatedAt"
    >[];
    assignments?: readonly Omit<
      NewRatingCriterionAssignment,
      "id" | "storeId" | "criterionId" | "createdAt"
    >[];
  }): Promise<RatingCriterionAggregate> {
    const id = await this.generateUuidV7();
    const now = new Date().toISOString();
    const rows = await this.connection
      .insert(ratingCriterion)
      .values({
        ...input.criterion,
        id,
        storeId: this.storeId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .returning();
    const criterion = rows[0];
    if (!criterion) throw new Error("Failed to create rating criterion");

    const translations = await this.replaceCriterionTranslations(id, input.translations ?? []);
    const assignments = await this.replaceCriterionAssignments(id, input.assignments ?? []);
    return { criterion, translations, assignments };
  }

  @Transactional()
  async updateCriterion(
    id: string,
    expectedUpdatedAt: string,
    patch: RatingCriterionPatch,
  ): Promise<OptimisticMutationResult<RatingCriterion>> {
    const rows = await this.connection
      .update(ratingCriterion)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(ratingCriterion.storeId, this.storeId),
          eq(ratingCriterion.id, id),
          eq(ratingCriterion.updatedAt, expectedUpdatedAt),
          isNull(ratingCriterion.deletedAt),
        ),
      )
      .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findCriterionRowById(id);
    return current ? { status: "conflict", current } : { status: "not_found" };
  }

  @Transactional()
  async updateCriterionWithinVersion(
    id: string,
    patch: RatingCriterionPatch,
  ): Promise<RatingCriterion | null> {
    const rows = await this.connection
      .update(ratingCriterion)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(ratingCriterion.storeId, this.storeId),
          eq(ratingCriterion.id, id),
          isNull(ratingCriterion.deletedAt),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  @Transactional()
  async replaceCriterionTranslations(
    criterionId: string,
    items: readonly Omit<
      NewRatingCriterionTranslation,
      "storeId" | "criterionId" | "createdAt" | "updatedAt"
    >[],
  ): Promise<RatingCriterionTranslation[]> {
    await this.connection
      .delete(ratingCriterionTranslation)
      .where(
        and(
          eq(ratingCriterionTranslation.storeId, this.storeId),
          eq(ratingCriterionTranslation.criterionId, criterionId),
        ),
      );
    if (items.length === 0) return [];
    const now = new Date().toISOString();
    return this.connection
      .insert(ratingCriterionTranslation)
      .values(
        items.map((item) => ({
          ...item,
          storeId: this.storeId,
          criterionId,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .returning();
  }

  @Transactional()
  async replaceCriterionAssignments(
    criterionId: string,
    items: readonly Omit<
      NewRatingCriterionAssignment,
      "id" | "storeId" | "criterionId" | "createdAt"
    >[],
  ): Promise<RatingCriterionAssignment[]> {
    await this.connection
      .delete(ratingCriterionAssignment)
      .where(
        and(
          eq(ratingCriterionAssignment.storeId, this.storeId),
          eq(ratingCriterionAssignment.criterionId, criterionId),
        ),
      );
    if (items.length === 0) return [];
    const ids = await this.generateUuidV7s(items.length);
    const now = new Date().toISOString();
    return this.connection
      .insert(ratingCriterionAssignment)
      .values(
        items.map((item, index) => ({
          ...item,
          id: ids[index]!,
          storeId: this.storeId,
          criterionId,
          createdAt: now,
        })),
      )
      .returning();
  }

  @Transactional()
  async deleteCriterion(input: {
    id: string;
    expectedUpdatedAt: string;
    permanent?: boolean;
  }): Promise<OptimisticMutationResult<RatingCriterion>> {
    const conditions = and(
      eq(ratingCriterion.storeId, this.storeId),
      eq(ratingCriterion.id, input.id),
      eq(ratingCriterion.updatedAt, input.expectedUpdatedAt),
      isNull(ratingCriterion.deletedAt),
    );
    const rows = input.permanent
      ? await this.connection.delete(ratingCriterion).where(conditions).returning()
      : await this.connection
          .update(ratingCriterion)
          .set({
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(conditions)
          .returning();
    if (rows[0]) return { status: "applied", value: rows[0] };
    const current = await this.findCriterionRowById(input.id, true);
    return current ? { status: "conflict", current } : { status: "not_found" };
  }

  private async findStoreConfigurationById(id: string): Promise<StoreConfiguration | null> {
    const rows = await this.connection
      .select()
      .from(storeConfiguration)
      .where(and(eq(storeConfiguration.storeId, this.storeId), eq(storeConfiguration.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  private async findCriterionRowById(
    id: string,
    includeDeleted = false,
  ): Promise<RatingCriterion | null> {
    const rows = await this.connection
      .select()
      .from(ratingCriterion)
      .where(
        and(
          eq(ratingCriterion.storeId, this.storeId),
          eq(ratingCriterion.id, id),
          ...(includeDeleted ? [] : [isNull(ratingCriterion.deletedAt)]),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private getCriterionTranslations(criterionId: string): Promise<RatingCriterionTranslation[]> {
    return this.connection
      .select()
      .from(ratingCriterionTranslation)
      .where(
        and(
          eq(ratingCriterionTranslation.storeId, this.storeId),
          eq(ratingCriterionTranslation.criterionId, criterionId),
        ),
      )
      .orderBy(asc(ratingCriterionTranslation.locale));
  }

  private getCriterionAssignments(criterionId: string): Promise<RatingCriterionAssignment[]> {
    return this.connection
      .select()
      .from(ratingCriterionAssignment)
      .where(
        and(
          eq(ratingCriterionAssignment.storeId, this.storeId),
          eq(ratingCriterionAssignment.criterionId, criterionId),
        ),
      )
      .orderBy(asc(ratingCriterionAssignment.createdAt));
  }
}
