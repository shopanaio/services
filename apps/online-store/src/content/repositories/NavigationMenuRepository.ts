import { and, eq, inArray, sql } from "drizzle-orm";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { BaseRepository } from "./BaseRepository.js";
import {
  navigationMenuListView,
  navigationMenus,
  type NavigationMenuModel,
  type NewNavigationMenuModel,
} from "./models/index.js";
import type { NavigationMenuRecord, OnlineStoreScope } from "./types.js";
import { createGlobalIdWhereFieldMapper } from "./global-id-where-mappers.js";

export const navigationMenuRelayQuery = createRelayQuery(
  createQuery(navigationMenuListView)
    .include(["id"])
    .mapWhereField("id", createGlobalIdWhereFieldMapper(GlobalIdEntity.OnlineStoreNavigationMenu))
    .maxLimit(100)
    .defaultLimit(20),
  { name: "onlineStoreNavigationMenu", tieBreaker: "id" },
);

export type NavigationMenuRelayInput = InferRelayInput<typeof navigationMenuRelayQuery>;

export interface NavigationMenuConnectionResult {
  readonly edges: ReadonlyArray<{
    readonly cursor: string;
    readonly nodeId: string;
  }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

export interface CreateNavigationMenuInput {
  readonly handle: string;
  readonly name: string;
}

export interface UpdateNavigationMenuInput {
  readonly handle?: string;
  readonly name?: string;
}

export class NavigationMenuRepository extends BaseRepository {
  async findById(scope: OnlineStoreScope, menuId: string): Promise<NavigationMenuRecord | null> {
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(this.menuOwnership(scope, menuId))
      .limit(1);
    return rows[0] ? mapMenu(rows[0]) : null;
  }

  async lockById(scope: OnlineStoreScope, menuId: string): Promise<NavigationMenuRecord | null> {
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(this.menuOwnership(scope, menuId))
      .limit(1)
      .for("update");
    return rows[0] ? mapMenu(rows[0]) : null;
  }

  async findByHandle(
    scope: OnlineStoreScope,
    handle: string,
  ): Promise<NavigationMenuRecord | null> {
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(and(this.menuScope(scope), eq(navigationMenus.handle, handle)))
      .limit(1);
    return rows[0] ? mapMenu(rows[0]) : null;
  }

  async getConnection(
    scope: OnlineStoreScope,
    args: NavigationMenuRelayInput,
  ): Promise<NavigationMenuConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;
    const mergedWhere: NavigationMenuRelayInput["where"] = {
      _and: [
        { installationId: { _eq: scope.installationId } },
        { storeId: { _eq: scope.storeId } },
        { deletedAt: { _is: null } },
        ...(where ? [where] : []),
      ],
    };
    const input: NavigationMenuRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "createdAt", direction: "desc" },
        { field: "id", direction: "desc" },
      ],
    };
    const [result, totalCount] = await Promise.all([
      navigationMenuRelayQuery.execute(this.connection, input),
      navigationMenuRelayQuery.count(this.connection, { where: mergedWhere }),
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

  async getByIds(
    scope: OnlineStoreScope,
    menuIds: readonly string[],
  ): Promise<readonly NavigationMenuRecord[]> {
    if (menuIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(and(this.menuScope(scope), inArray(navigationMenus.id, [...new Set(menuIds)])));
    return Object.freeze(rows.map(mapMenu));
  }

  async create(
    scope: OnlineStoreScope,
    input: CreateNavigationMenuInput,
  ): Promise<NavigationMenuRecord> {
    await this.assertInstallationScope(scope);
    const timestamp = now();
    const insert: NewNavigationMenuModel = {
      installationId: scope.installationId,
      storeId: scope.storeId,
      handle: input.handle,
      name: input.name,
      revision: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
    const rows = await this.connection.insert(navigationMenus).values(insert).returning();
    return mapMenu(requiredRow(rows[0]));
  }

  async update(
    scope: OnlineStoreScope,
    menuId: string,
    input: UpdateNavigationMenuInput,
  ): Promise<NavigationMenuRecord | null> {
    const rows = await this.connection
      .update(navigationMenus)
      .set({
        handle: input.handle,
        name: input.name,
        updatedAt: now(),
        revision: sql`${navigationMenus.revision} + 1`,
      })
      .where(this.menuOwnership(scope, menuId))
      .returning();
    return rows[0] ? mapMenu(rows[0]) : null;
  }

  async softDelete(scope: OnlineStoreScope, menuId: string): Promise<boolean> {
    const timestamp = now();
    const rows = await this.connection
      .update(navigationMenus)
      .set({
        deletedAt: timestamp,
        updatedAt: timestamp,
        revision: sql`${navigationMenus.revision} + 1`,
      })
      .where(this.menuOwnership(scope, menuId))
      .returning({ id: navigationMenus.id });
    return rows.length > 0;
  }
}

function mapMenu(row: NavigationMenuModel): NavigationMenuRecord {
  return Object.freeze({ ...row });
}

function requiredRow(row: NavigationMenuModel | undefined): NavigationMenuModel {
  if (!row) throw new Error("navigation menu was not returned by PostgreSQL");
  return row;
}

function now(): string {
  return new Date().toISOString();
}
