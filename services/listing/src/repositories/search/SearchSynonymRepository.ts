import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  searchSynonymClaim,
  searchSynonymGroup,
  searchSynonymGroupListView,
  searchSynonymValue,
  type NewSearchSynonymClaim,
  type NewSearchSynonymGroup,
  type NewSearchSynonymValue,
  type SearchSynonymGroup,
  type SearchSynonymGroupListView,
  type SearchSynonymValue,
} from "../models/index.js";
import {
  assertNonEmpty,
  assertUnique,
  type SearchOptimisticMutationResult,
  type SearchSynonymGroupAggregate,
  type SearchSynonymValueInput,
} from "./searchRepositoryTypes.js";
import {
  decodeSearchSynonymGroupGlobalId,
  normalizeSearchRelayPagination,
} from "./searchConnectionInput.js";

export const searchSynonymGroupRelayQuery = createRelayQuery(
  createQuery(searchSynonymGroupListView)
    .include(["id"])
    .mapWhereFields({
      id: decodeSearchSynonymGroupGlobalId,
    })
    .maxLimit(100)
    .defaultLimit(20),
  { name: "searchSynonymGroup", tieBreaker: "id" },
);

export type SearchSynonymGroupRelayInput = InferRelayInput<typeof searchSynonymGroupRelayQuery>;

export interface SearchSynonymGroupConnectionResult {
  edges: Array<{ cursor: string; node: SearchSynonymGroupListView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface SearchSynonymGroupCreateInput {
  locale: string;
  name: string;
  enabled: boolean;
  values: readonly SearchSynonymValueInput[];
}

export interface SearchSynonymGroupUpdateInput extends SearchSynonymGroupCreateInput {
  groupId: string;
  expectedVersion: number;
}

export interface SearchSynonymGroupDeleteInput {
  groupId: string;
  expectedVersion: number;
}

export interface SearchSynonymClaimConflict {
  normalizedValue: string;
  groupId: string;
}

export class SearchSynonymRepository extends BaseRepository {
  @ReadOnly()
  async listEnabledHeaders(
    locale: string,
  ): Promise<Array<Pick<SearchSynonymGroup, "groupId" | "version">>> {
    assertNonEmpty(locale, "locale");
    return this.connection
      .select({
        groupId: searchSynonymGroup.groupId,
        version: searchSynonymGroup.version,
      })
      .from(searchSynonymGroup)
      .where(
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.locale, locale),
          eq(searchSynonymGroup.enabled, true),
        ),
      )
      .orderBy(asc(searchSynonymGroup.groupId));
  }

  @ReadOnly()
  async findById(groupId: string): Promise<SearchSynonymGroupAggregate | null> {
    const groups = await this.connection
      .select()
      .from(searchSynonymGroup)
      .where(
        and(eq(searchSynonymGroup.storeId, this.storeId), eq(searchSynonymGroup.groupId, groupId)),
      )
      .limit(1);
    const group = groups[0];
    if (!group) return null;
    const values = await this.getValues([groupId]);
    return { group, values };
  }

  @ReadOnly()
  async list(locale?: string): Promise<SearchSynonymGroupAggregate[]> {
    if (locale !== undefined) assertNonEmpty(locale, "locale");
    const scope =
      locale !== undefined
        ? and(eq(searchSynonymGroup.storeId, this.storeId), eq(searchSynonymGroup.locale, locale))
        : eq(searchSynonymGroup.storeId, this.storeId);
    const groups = await this.connection
      .select()
      .from(searchSynonymGroup)
      .where(scope)
      .orderBy(
        asc(searchSynonymGroup.locale),
        asc(searchSynonymGroup.name),
        asc(searchSynonymGroup.groupId),
      );
    return this.toAggregates(groups, await this.getValues(groups.map((g) => g.groupId)));
  }

  @ReadOnly()
  async getConnection(
    args: SearchSynonymGroupRelayInput,
  ): Promise<SearchSynonymGroupConnectionResult> {
    const normalizedInput = normalizeSearchRelayPagination(args);
    const { where, orderBy, ...paginationArgs } = normalizedInput;
    const effectiveOrderBy = orderBy ?? [{ field: "updatedAt", direction: "desc" }];
    const mergedWhere: SearchSynonymGroupRelayInput["where"] = {
      _and: [{ storeId: { _eq: this.storeId } }, ...(where ? [where] : [])],
    };
    const executeInput: SearchSynonymGroupRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: effectiveOrderBy,
      filters: {
        storeId: this.storeId,
        where: where ?? null,
        orderBy: effectiveOrderBy,
      },
    };

    const [result, totalCount] = await Promise.all([
      searchSynonymGroupRelayQuery.execute(this.connection, executeInput),
      searchSynonymGroupRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);

    return {
      edges: result.edges.map(({ cursor, node }) => ({ cursor, node })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  @ReadOnly()
  async findEnabledByLocale(input: {
    locale: string;
    normalizationContractVersion: string;
    normalizationProfileRevision: string;
  }): Promise<SearchSynonymGroupAggregate[]> {
    assertNonEmpty(input.locale, "locale");
    const groups = await this.connection
      .select()
      .from(searchSynonymGroup)
      .where(
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.locale, input.locale),
          eq(searchSynonymGroup.enabled, true),
        ),
      )
      .orderBy(asc(searchSynonymGroup.groupId));
    const values = await this.getValues(groups.map((group) => group.groupId));
    return this.toAggregates(groups, values).filter(
      (aggregate) =>
        aggregate.values.length >= 2 &&
        aggregate.values.every(
          (value) =>
            value.normalizationContractVersion === input.normalizationContractVersion &&
            value.normalizationProfileRevision === input.normalizationProfileRevision,
        ),
    );
  }

  @ReadOnly()
  async findClaimConflicts(
    locale: string,
    normalizedValues: readonly string[],
    excludingGroupId?: string,
  ): Promise<SearchSynonymClaimConflict[]> {
    if (normalizedValues.length === 0) return [];
    const conditions = [
      eq(searchSynonymClaim.storeId, this.storeId),
      eq(searchSynonymClaim.locale, locale),
      inArray(searchSynonymClaim.normalizedValue, [...new Set(normalizedValues)]),
    ];
    if (excludingGroupId) {
      conditions.push(ne(searchSynonymClaim.groupId, excludingGroupId));
    }
    return this.connection
      .select({
        normalizedValue: searchSynonymClaim.normalizedValue,
        groupId: searchSynonymClaim.groupId,
      })
      .from(searchSynonymClaim)
      .where(and(...conditions))
      .orderBy(asc(searchSynonymClaim.normalizedValue));
  }

  @Transactional()
  async create(input: SearchSynonymGroupCreateInput): Promise<SearchSynonymGroupAggregate> {
    this.assertWriteInput(input);
    const now = new Date().toISOString();
    const groupId = await this.generateUuidV7();
    const groupRow: NewSearchSynonymGroup = {
      storeId: this.storeId,
      groupId,
      locale: input.locale,
      name: input.name,
      enabled: input.enabled,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    const groups = await this.connection.insert(searchSynonymGroup).values(groupRow).returning();
    const group = groups[0];
    if (!group) throw new Error("Failed to create search synonym group");
    const values = await this.insertValues(groupId, input.values);
    if (input.enabled) {
      await this.insertClaims(groupId, input.locale, input.values);
    }
    const aggregate = { group, values };
    return aggregate;
  }

  @Transactional()
  async update(
    input: SearchSynonymGroupUpdateInput,
  ): Promise<SearchOptimisticMutationResult<SearchSynonymGroupAggregate>> {
    this.assertWriteInput(input);
    this.assertExpectedVersion(input.expectedVersion);
    const current = await this.lockGroup(input.groupId);
    if (!current) return { status: "not_found" };
    if (current.version !== input.expectedVersion) {
      return { status: "conflict", currentVersion: current.version };
    }
    await this.connection
      .delete(searchSynonymClaim)
      .where(
        and(
          eq(searchSynonymClaim.storeId, this.storeId),
          eq(searchSynonymClaim.groupId, input.groupId),
        ),
      );
    await this.connection
      .delete(searchSynonymValue)
      .where(
        and(
          eq(searchSynonymValue.storeId, this.storeId),
          eq(searchSynonymValue.groupId, input.groupId),
        ),
      );

    const nextVersion = current.version + 1;
    const groups = await this.connection
      .update(searchSynonymGroup)
      .set({
        locale: input.locale,
        name: input.name,
        enabled: input.enabled,
        version: nextVersion,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.groupId, input.groupId),
          eq(searchSynonymGroup.version, input.expectedVersion),
        ),
      )
      .returning();
    const group = groups[0];
    if (!group) throw new Error("Search synonym update lost its locked row");
    const values = await this.insertValues(input.groupId, input.values);
    if (input.enabled) {
      await this.insertClaims(input.groupId, input.locale, input.values);
    }
    const aggregate = { group, values };
    return { status: "applied", value: aggregate };
  }

  @Transactional()
  async delete(
    input: SearchSynonymGroupDeleteInput,
  ): Promise<SearchOptimisticMutationResult<SearchSynonymGroupAggregate>> {
    this.assertExpectedVersion(input.expectedVersion);
    const current = await this.lockGroup(input.groupId);
    if (!current) return { status: "not_found" };
    if (current.version !== input.expectedVersion) {
      return { status: "conflict", currentVersion: current.version };
    }
    const aggregate = {
      group: current,
      values: await this.getValues([input.groupId]),
    };
    const rows = await this.connection
      .delete(searchSynonymGroup)
      .where(
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.groupId, input.groupId),
          eq(searchSynonymGroup.version, input.expectedVersion),
        ),
      )
      .returning({ groupId: searchSynonymGroup.groupId });
    if (rows.length !== 1) {
      throw new Error("Search synonym delete lost its locked row");
    }
    return { status: "applied", value: aggregate };
  }

  private async lockGroup(groupId: string): Promise<SearchSynonymGroup | null> {
    const rows = await this.connection
      .select()
      .from(searchSynonymGroup)
      .where(
        and(eq(searchSynonymGroup.storeId, this.storeId), eq(searchSynonymGroup.groupId, groupId)),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new Error("expectedVersion must be a positive integer");
    }
  }

  private async getValues(groupIds: readonly string[]): Promise<SearchSynonymValue[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(searchSynonymValue)
      .where(
        and(
          eq(searchSynonymValue.storeId, this.storeId),
          inArray(searchSynonymValue.groupId, [...new Set(groupIds)]),
        ),
      )
      .orderBy(asc(searchSynonymValue.groupId), asc(searchSynonymValue.position));
  }

  private async insertValues(
    groupId: string,
    values: readonly SearchSynonymValueInput[],
  ): Promise<SearchSynonymValue[]> {
    const ids = await this.generateUuidV7s(values.length);
    const rows: NewSearchSynonymValue[] = values.map((value, index) => ({
      storeId: this.storeId,
      groupId,
      valueId: ids[index],
      position: index + 1,
      ...value,
    }));
    return this.connection.insert(searchSynonymValue).values(rows).returning();
  }

  private async insertClaims(
    groupId: string,
    locale: string,
    values: readonly SearchSynonymValueInput[],
  ): Promise<void> {
    const claims: NewSearchSynonymClaim[] = values.map((value) => ({
      storeId: this.storeId,
      locale,
      normalizedValue: value.normalizedValue,
      groupId,
    }));
    await this.connection.insert(searchSynonymClaim).values(claims);
  }

  private toAggregates(
    groups: readonly SearchSynonymGroup[],
    values: readonly SearchSynonymValue[],
  ): SearchSynonymGroupAggregate[] {
    const byGroup = new Map<string, SearchSynonymValue[]>();
    for (const value of values) {
      const groupValues = byGroup.get(value.groupId) ?? [];
      groupValues.push(value);
      byGroup.set(value.groupId, groupValues);
    }
    return groups.map((group) => ({
      group,
      values: byGroup.get(group.groupId) ?? [],
    }));
  }

  private assertWriteInput(input: SearchSynonymGroupCreateInput): void {
    assertNonEmpty(input.locale, "locale");
    assertNonEmpty(input.name, "name");
    if (input.values.length < 2 || input.values.length > 20) {
      throw new Error("A synonym group must contain between 2 and 20 values");
    }
    assertUnique(input.values, (value) => value.normalizedValue, "synonym value");
    for (const value of input.values) {
      assertNonEmpty(value.displayValue, "displayValue");
      assertNonEmpty(value.normalizedValue, "normalizedValue");
      assertNonEmpty(value.preparedText, "preparedText");
      assertNonEmpty(value.normalizationContractVersion, "normalizationContractVersion");
      assertNonEmpty(value.normalizationProfileRevision, "normalizationProfileRevision");
      if (
        value.normalizationContractVersion !== input.values[0].normalizationContractVersion ||
        value.normalizationProfileRevision !== input.values[0].normalizationProfileRevision
      ) {
        throw new Error("All synonym values must use one normalization profile");
      }
    }
  }
}
