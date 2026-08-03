import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  navigationMenus,
  type NavigationMenuModel,
  type NewNavigationMenuModel,
} from "./models/index.js";
import type {
  NavigationMenuRecord,
  OnlineStoreScope,
} from "./types.js";

export interface CreateNavigationMenuInput {
  readonly handle: string;
  readonly name: string;
}

export interface UpdateNavigationMenuInput {
  readonly handle?: string;
  readonly name?: string;
  readonly expectedRevision?: number;
}

export class NavigationMenuRepository extends BaseRepository {
  async findById(
    scope: OnlineStoreScope,
    menuId: string,
  ): Promise<NavigationMenuRecord | null> {
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(this.menuOwnership(scope, menuId))
      .limit(1);
    return rows[0] ? mapMenu(rows[0]) : null;
  }

  async lockById(
    scope: OnlineStoreScope,
    menuId: string,
  ): Promise<NavigationMenuRecord | null> {
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

  async list(
    scope: OnlineStoreScope,
  ): Promise<readonly NavigationMenuRecord[]> {
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(this.menuScope(scope))
      .orderBy(asc(navigationMenus.createdAt), asc(navigationMenus.id));
    return Object.freeze(rows.map(mapMenu));
  }

  async getByIds(
    scope: OnlineStoreScope,
    menuIds: readonly string[],
  ): Promise<readonly NavigationMenuRecord[]> {
    if (menuIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(navigationMenus)
      .where(
        and(
          this.menuScope(scope),
          inArray(navigationMenus.id, [...new Set(menuIds)]),
        ),
      );
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
    const rows = await this.connection
      .insert(navigationMenus)
      .values(insert)
      .returning();
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
      .where(
        and(
          this.menuOwnership(scope, menuId),
          input.expectedRevision === undefined
            ? undefined
            : eq(navigationMenus.revision, input.expectedRevision),
        ),
      )
      .returning();
    return rows[0] ? mapMenu(rows[0]) : null;
  }

  async softDelete(
    scope: OnlineStoreScope,
    menuId: string,
    expectedRevision?: number,
  ): Promise<boolean> {
    const timestamp = now();
    const rows = await this.connection
      .update(navigationMenus)
      .set({
        deletedAt: timestamp,
        updatedAt: timestamp,
        revision: sql`${navigationMenus.revision} + 1`,
      })
      .where(
        and(
          this.menuOwnership(scope, menuId),
          expectedRevision === undefined
            ? undefined
            : eq(navigationMenus.revision, expectedRevision),
        ),
      )
      .returning({ id: navigationMenus.id });
    return rows.length > 0;
  }
}

function mapMenu(row: NavigationMenuModel): NavigationMenuRecord {
  return Object.freeze({ ...row });
}

function requiredRow(
  row: NavigationMenuModel | undefined,
): NavigationMenuModel {
  if (!row) throw new Error("navigation menu was not returned by PostgreSQL");
  return row;
}

function now(): string {
  return new Date().toISOString();
}
