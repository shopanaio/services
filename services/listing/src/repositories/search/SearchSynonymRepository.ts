import { ReadOnly, Transactional } from "@shopana/shared-kernel";
import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { BaseRepository } from "../BaseRepository.js";
import {
  searchConfigurationAudit,
  searchSynonymClaim,
  searchSynonymGroup,
  searchSynonymValue,
  type NewSearchConfigurationAudit,
  type NewSearchSynonymClaim,
  type NewSearchSynonymGroup,
  type NewSearchSynonymValue,
  type SearchSynonymGroup,
  type SearchSynonymValue,
} from "../models/index.js";
import {
  assertNonEmpty,
  assertUnique,
  type SearchAuditInput,
  type SearchOptimisticMutationResult,
  type SearchSynonymGroupAggregate,
  type SearchSynonymValueInput,
} from "./searchRepositoryTypes.js";

export interface SearchSynonymGroupCreateInput extends SearchAuditInput {
  locale: string;
  name: string;
  enabled: boolean;
  values: readonly SearchSynonymValueInput[];
}

export interface SearchSynonymGroupUpdateInput
  extends SearchSynonymGroupCreateInput {
  groupId: string;
  expectedVersion: number;
}

export interface SearchSynonymGroupDeleteInput extends SearchAuditInput {
  groupId: string;
  expectedVersion: number;
}

export interface SearchSynonymClaimConflict {
  normalizedValue: string;
  groupId: string;
}

export interface SearchSynonymGroupPage {
  nodes: SearchSynonymGroupAggregate[];
  totalCount: number;
}

export class SearchSynonymRepository extends BaseRepository {
  @ReadOnly()
  async listEnabledHeaders(locale: string): Promise<
    Array<Pick<SearchSynonymGroup, "groupId" | "version">>
  > {
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
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.groupId, groupId),
        ),
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
    const scope = locale !== undefined
      ? and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.locale, locale),
        )
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
  async listPage(input: {
    locale?: string;
    limit: number;
    offset: number;
  }): Promise<SearchSynonymGroupPage> {
    this.assertPage(input.limit, input.offset);
    if (input.locale !== undefined) assertNonEmpty(input.locale, "locale");
    const scope = input.locale !== undefined
      ? and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.locale, input.locale),
        )
      : eq(searchSynonymGroup.storeId, this.storeId);
    const [groups, countRows] = await Promise.all([
      this.connection
        .select()
        .from(searchSynonymGroup)
        .where(scope)
        .orderBy(
          asc(searchSynonymGroup.locale),
          asc(searchSynonymGroup.name),
          asc(searchSynonymGroup.groupId),
        )
        .limit(input.limit)
        .offset(input.offset),
      this.connection
        .select({ value: count() })
        .from(searchSynonymGroup)
        .where(scope),
    ]);
    return {
      nodes: this.toAggregates(
        groups,
        await this.getValues(groups.map((group) => group.groupId)),
      ),
      totalCount: countRows[0]?.value ?? 0,
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
            value.normalizationContractVersion ===
              input.normalizationContractVersion &&
            value.normalizationProfileRevision ===
              input.normalizationProfileRevision,
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
  async create(
    input: SearchSynonymGroupCreateInput,
  ): Promise<SearchSynonymGroupAggregate> {
    this.assertWriteInput(input);
    const now = new Date().toISOString();
    const groupId = uuidv7();
    const groupRow: NewSearchSynonymGroup = {
      storeId: this.storeId,
      groupId,
      locale: input.locale,
      name: input.name,
      enabled: input.enabled,
      version: 1,
      createdBy: input.actorId,
      updatedBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    };
    const groups = await this.connection
      .insert(searchSynonymGroup)
      .values(groupRow)
      .returning();
    const group = groups[0];
    if (!group) throw new Error("Failed to create search synonym group");
    const values = await this.insertValues(groupId, input.values);
    if (input.enabled) {
      await this.insertClaims(groupId, input.locale, input.values);
    }
    const aggregate = { group, values };
    await this.insertAudit({
      groupId,
      version: 1,
      action: "create",
      beforeValue: null,
      afterValue: this.toAuditValue(aggregate),
      actorId: input.actorId,
      requestId: input.requestId,
    });
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
    const before: SearchSynonymGroupAggregate = {
      group: current,
      values: await this.getValues([input.groupId]),
    };

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
        updatedBy: input.actorId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.groupId, input.groupId),
          eq(searchSynonymGroup.version, current.version),
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
    await this.insertAudit({
      groupId: input.groupId,
      version: nextVersion,
      action: "update",
      beforeValue: this.toAuditValue(before),
      afterValue: this.toAuditValue(aggregate),
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return { status: "applied", value: aggregate };
  }

  @Transactional()
  async delete(
    input: SearchSynonymGroupDeleteInput,
  ): Promise<SearchOptimisticMutationResult<SearchSynonymGroupAggregate>> {
    this.assertAudit(input);
    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion <= 0) {
      throw new Error("expectedVersion must be a positive integer");
    }
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
          eq(searchSynonymGroup.version, current.version),
        ),
      )
      .returning({ groupId: searchSynonymGroup.groupId });
    if (rows.length !== 1) {
      throw new Error("Search synonym delete lost its locked row");
    }
    await this.insertAudit({
      groupId: input.groupId,
      version: current.version,
      action: "delete",
      beforeValue: this.toAuditValue(aggregate),
      afterValue: null,
      actorId: input.actorId,
      requestId: input.requestId,
    });
    return { status: "applied", value: aggregate };
  }

  private async lockGroup(groupId: string): Promise<SearchSynonymGroup | null> {
    const rows = await this.connection
      .select()
      .from(searchSynonymGroup)
      .where(
        and(
          eq(searchSynonymGroup.storeId, this.storeId),
          eq(searchSynonymGroup.groupId, groupId),
        ),
      )
      .limit(1)
      .for("update");
    return rows[0] ?? null;
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
    const rows: NewSearchSynonymValue[] = values.map((value, index) => ({
      storeId: this.storeId,
      groupId,
      valueId: uuidv7(),
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

  private async insertAudit(input: {
    groupId: string;
    version: number;
    action: "create" | "update" | "delete";
    beforeValue: unknown | null;
    afterValue: unknown | null;
    actorId: string;
    requestId: string;
  }): Promise<void> {
    const audit: NewSearchConfigurationAudit = {
      storeId: this.storeId,
      auditId: uuidv7(),
      resourceVersion: input.version,
      resourceType: "synonym_group",
      resourceId: input.groupId,
      action: input.action,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      actorId: input.actorId,
      requestId: input.requestId,
    };
    await this.connection.insert(searchConfigurationAudit).values(audit);
  }

  private toAuditValue(
    aggregate: SearchSynonymGroupAggregate,
  ): Record<string, unknown> {
    return {
      groupId: aggregate.group.groupId,
      locale: aggregate.group.locale,
      name: aggregate.group.name,
      enabled: aggregate.group.enabled,
      version: aggregate.group.version,
      values: aggregate.values.map((value) => ({
        valueId: value.valueId,
        position: value.position,
        displayValue: value.displayValue,
      })),
    };
  }

  private assertWriteInput(input: SearchSynonymGroupCreateInput): void {
    this.assertAudit(input);
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
      assertNonEmpty(
        value.normalizationContractVersion,
        "normalizationContractVersion",
      );
      assertNonEmpty(
        value.normalizationProfileRevision,
        "normalizationProfileRevision",
      );
      if (
        value.normalizationContractVersion !==
          input.values[0].normalizationContractVersion ||
        value.normalizationProfileRevision !==
          input.values[0].normalizationProfileRevision
      ) {
        throw new Error("All synonym values must use one normalization profile");
      }
    }
  }

  private assertAudit(input: SearchAuditInput): void {
    assertNonEmpty(input.actorId, "actorId");
    assertNonEmpty(input.requestId, "requestId");
  }

  private assertPage(limit: number, offset: number): void {
    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      throw new Error("limit must be an integer between 1 and 100");
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw new Error("offset must be a non-negative integer");
    }
  }

  private assertExpectedVersion(expectedVersion: number): void {
    if (!Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      throw new Error("expectedVersion must be a positive integer");
    }
  }
}
