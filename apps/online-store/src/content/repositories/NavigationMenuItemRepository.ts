import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  navigationMenuItems,
  navigationMenus,
  type NavigationMenuItemModel,
  type NewNavigationMenuItemModel,
} from "./models/index.js";
import type { NavigationItemTarget, NavigationMenuItemRecord, OnlineStoreScope } from "./types.js";

export interface CreateNavigationMenuItemInput {
  readonly handle: string;
  readonly parentId?: string | null;
  readonly afterItemId?: string | null;
  readonly beforeItemId?: string | null;
  readonly target: NavigationItemTarget;
  readonly openInNewTab?: boolean;
}

export interface UpdateNavigationMenuItemInput {
  readonly handle?: string;
  readonly parentId?: string | null;
  readonly afterItemId?: string | null;
  readonly beforeItemId?: string | null;
  readonly target?: NavigationItemTarget;
  readonly openInNewTab?: boolean;
  readonly expectedRevision?: number;
}

export class NavigationMenuItemRepository extends BaseRepository {
  async findById(
    scope: OnlineStoreScope,
    itemId: string,
  ): Promise<NavigationMenuItemRecord | null> {
    const rows = await this.connection
      .select()
      .from(navigationMenuItems)
      .where(this.itemOwnership(scope, itemId))
      .limit(1);
    return rows[0] ? mapItem(rows[0]) : null;
  }

  async getByIds(
    scope: OnlineStoreScope,
    itemIds: readonly string[],
  ): Promise<readonly NavigationMenuItemRecord[]> {
    if (itemIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(navigationMenuItems)
      .where(and(this.itemScope(scope), inArray(navigationMenuItems.id, [...new Set(itemIds)])));
    return Object.freeze(rows.map(mapItem));
  }

  async listTree(
    scope: OnlineStoreScope,
    menuId: string,
  ): Promise<readonly NavigationMenuItemRecord[]> {
    const rows = await this.connection
      .select()
      .from(navigationMenuItems)
      .where(and(this.itemScope(scope), eq(navigationMenuItems.menuId, menuId)))
      .orderBy(
        asc(navigationMenuItems.parentId),
        asc(navigationMenuItems.lexoRank),
        asc(navigationMenuItems.id),
      );
    return Object.freeze(rows.map(mapItem));
  }

  async listChildren(
    scope: OnlineStoreScope,
    menuId: string,
    parentId: string | null,
  ): Promise<readonly NavigationMenuItemRecord[]> {
    const parentCondition =
      parentId === null
        ? sql`${navigationMenuItems.parentId} IS NULL`
        : eq(navigationMenuItems.parentId, parentId);
    const rows = await this.connection
      .select()
      .from(navigationMenuItems)
      .where(and(this.itemScope(scope), eq(navigationMenuItems.menuId, menuId), parentCondition))
      .orderBy(asc(navigationMenuItems.lexoRank), asc(navigationMenuItems.id));
    return Object.freeze(rows.map(mapItem));
  }

  create(
    scope: OnlineStoreScope,
    menuId: string,
    input: CreateNavigationMenuItemInput,
  ): Promise<NavigationMenuItemRecord | null> {
    return this.txManager.run(() => this.createInTransaction(scope, menuId, input));
  }

  update(
    scope: OnlineStoreScope,
    itemId: string,
    input: UpdateNavigationMenuItemInput,
  ): Promise<NavigationMenuItemRecord | null> {
    return this.txManager.run(() => this.updateInTransaction(scope, itemId, input));
  }

  deleteSubtree(
    scope: OnlineStoreScope,
    itemId: string,
    expectedRevision?: number,
  ): Promise<boolean> {
    return this.txManager.run(() => this.deleteInTransaction(scope, itemId, expectedRevision));
  }

  private async createInTransaction(
    scope: OnlineStoreScope,
    menuId: string,
    input: CreateNavigationMenuItemInput,
  ): Promise<NavigationMenuItemRecord | null> {
    const menu = await this.lockOwnedMenu(scope, menuId);
    if (!menu) return null;

    if (input.parentId) {
      const parent = await this.findById(scope, input.parentId);
      if (!parent || parent.menuId !== menuId) return null;
    }

    const target = normalizeTarget(input.target);
    const parentId = input.parentId ?? null;
    await this.assertHandleAvailable(scope, menuId, parentId, input.handle);
    const insert: NewNavigationMenuItemModel = {
      menuId,
      storeId: scope.storeId,
      parentId,
      handle: input.handle,
      lexoRank: temporaryRank(),
      targetType: target.targetType,
      targetId: target.targetId,
      url: target.url,
      openInNewTab: input.openInNewTab ?? false,
      revision: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    const rows = await this.connection.insert(navigationMenuItems).values(insert).returning();
    const created = requiredRow(rows[0]);
    await this.reorderSiblings(scope, {
      menuId,
      parentId,
      itemId: created.id,
      afterItemId: input.afterItemId,
      beforeItemId: input.beforeItemId,
    });
    return this.findById(scope, created.id);
  }

  private async updateInTransaction(
    scope: OnlineStoreScope,
    itemId: string,
    input: UpdateNavigationMenuItemInput,
  ): Promise<NavigationMenuItemRecord | null> {
    let item = await this.findById(scope, itemId);
    if (!item) return null;
    if (!(await this.lockOwnedMenu(scope, item.menuId))) return null;

    item = await this.findById(scope, itemId);
    if (!item) return null;
    const oldParentId = item.parentId;
    const nextParentId = input.parentId === undefined ? item.parentId : input.parentId;
    const shouldReorder =
      oldParentId !== nextParentId ||
      input.afterItemId !== undefined ||
      input.beforeItemId !== undefined;
    if (nextParentId === itemId) return null;
    if (nextParentId) {
      const parent = await this.findById(scope, nextParentId);
      if (!parent || parent.menuId !== item.menuId) return null;
      if (await this.parentCreatesCycle(scope, itemId, parent.id)) return null;
    }
    const nextHandle = input.handle ?? item.handle;
    await this.assertHandleAvailable(scope, item.menuId, nextParentId, nextHandle, itemId);

    const target = input.target ? normalizeTarget(input.target) : undefined;
    const rows = await this.connection
      .update(navigationMenuItems)
      .set({
        parentId: nextParentId,
        handle: input.handle,
        lexoRank: shouldReorder ? temporaryRank() : undefined,
        targetType: target?.targetType,
        targetId: target?.targetId,
        url: target?.url,
        openInNewTab: input.openInNewTab,
        updatedAt: now(),
        revision: sql`${navigationMenuItems.revision} + 1`,
      })
      .where(
        and(
          this.itemOwnership(scope, itemId),
          input.expectedRevision === undefined
            ? undefined
            : eq(navigationMenuItems.revision, input.expectedRevision),
        ),
      )
      .returning();
    if (!rows[0]) return null;
    if (!shouldReorder) return this.findById(scope, itemId);
    if (oldParentId !== nextParentId) {
      await this.rebalanceSiblings(scope, item.menuId, oldParentId);
    }
    await this.reorderSiblings(scope, {
      menuId: item.menuId,
      parentId: nextParentId,
      itemId,
      afterItemId: input.afterItemId,
      beforeItemId: input.beforeItemId,
    });
    return this.findById(scope, itemId);
  }

  private async deleteInTransaction(
    scope: OnlineStoreScope,
    itemId: string,
    expectedRevision?: number,
  ): Promise<boolean> {
    const item = await this.findById(scope, itemId);
    if (!item) return false;
    if (!(await this.lockOwnedMenu(scope, item.menuId))) return false;

    const rows = await this.connection
      .delete(navigationMenuItems)
      .where(
        and(
          this.itemOwnership(scope, itemId),
          expectedRevision === undefined
            ? undefined
            : eq(navigationMenuItems.revision, expectedRevision),
        ),
      )
      .returning({ id: navigationMenuItems.id });
    if (rows.length === 0) return false;
    await this.rebalanceSiblings(scope, item.menuId, item.parentId);
    return true;
  }

  private async parentCreatesCycle(
    scope: OnlineStoreScope,
    itemId: string,
    candidateParentId: string,
  ): Promise<boolean> {
    let currentId: string | null = candidateParentId;
    while (currentId) {
      if (currentId === itemId) return true;
      const current = await this.findById(scope, currentId);
      currentId = current?.parentId ?? null;
    }
    return false;
  }

  private async assertHandleAvailable(
    scope: OnlineStoreScope,
    menuId: string,
    parentId: string | null,
    handle: string,
    excludeItemId?: string,
  ): Promise<void> {
    const parentCondition =
      parentId === null
        ? sql`${navigationMenuItems.parentId} IS NULL`
        : eq(navigationMenuItems.parentId, parentId);
    const rows = await this.connection
      .select({ id: navigationMenuItems.id })
      .from(navigationMenuItems)
      .where(
        and(
          this.itemScope(scope),
          eq(navigationMenuItems.menuId, menuId),
          parentCondition,
          eq(navigationMenuItems.handle, handle),
          excludeItemId ? sql`${navigationMenuItems.id} <> ${excludeItemId}` : undefined,
        ),
      )
      .limit(1);
    if (rows[0]) {
      throw operationError("ONLINE_STORE_NAVIGATION_ITEM_HANDLE_TAKEN", "input.handle");
    }
  }

  private async reorderSiblings(
    scope: OnlineStoreScope,
    input: {
      readonly menuId: string;
      readonly parentId: string | null;
      readonly itemId: string;
      readonly afterItemId?: string | null;
      readonly beforeItemId?: string | null;
    },
  ): Promise<void> {
    const siblings = (await this.listChildren(scope, input.menuId, input.parentId)).filter(
      ({ id }) => id !== input.itemId,
    );
    const ids = siblings.map(({ id }) => id);
    const afterIndex = input.afterItemId ? ids.indexOf(input.afterItemId) : -1;
    const beforeIndex = input.beforeItemId ? ids.indexOf(input.beforeItemId) : -1;

    if (input.afterItemId && afterIndex < 0) {
      throw operationError("NAVIGATION_AFTER_ITEM_INVALID");
    }
    if (input.beforeItemId && beforeIndex < 0) {
      throw operationError("NAVIGATION_BEFORE_ITEM_INVALID");
    }
    if (input.afterItemId && input.beforeItemId && beforeIndex !== afterIndex + 1) {
      throw operationError("NAVIGATION_PLACEMENT_INVALID");
    }

    const insertionIndex = input.beforeItemId
      ? beforeIndex
      : input.afterItemId
        ? afterIndex + 1
        : ids.length;
    ids.splice(insertionIndex, 0, input.itemId);
    await this.assignRanks(scope, ids);
  }

  private async rebalanceSiblings(
    scope: OnlineStoreScope,
    menuId: string,
    parentId: string | null,
  ): Promise<void> {
    const siblings = await this.listChildren(scope, menuId, parentId);
    await this.assignRanks(
      scope,
      siblings.map(({ id }) => id),
    );
  }

  private async assignRanks(scope: OnlineStoreScope, itemIds: readonly string[]): Promise<void> {
    for (const [index, itemId] of itemIds.entries()) {
      await this.connection
        .update(navigationMenuItems)
        .set({ lexoRank: rankForIndex(index) })
        .where(this.itemOwnership(scope, itemId));
    }
  }

  private async lockOwnedMenu(scope: OnlineStoreScope, menuId: string) {
    const rows = await this.connection
      .select({ id: navigationMenus.id })
      .from(navigationMenus)
      .where(this.menuOwnership(scope, menuId))
      .limit(1)
      .for("update");
    return rows[0] ?? null;
  }
}

function normalizeTarget(target: NavigationItemTarget): {
  targetType: string;
  targetId: string | null;
  url: string | null;
} {
  if ("url" in target) {
    return { targetType: "URL", targetId: null, url: target.url };
  }
  if (target.type === "URL") {
    throw new TypeError("URL navigation targets must provide url, not id");
  }
  return { targetType: target.type, targetId: target.id, url: null };
}

function mapItem(row: NavigationMenuItemModel): NavigationMenuItemRecord {
  return Object.freeze({ ...row });
}

function requiredRow(row: NavigationMenuItemModel | undefined): NavigationMenuItemModel {
  if (!row) {
    throw new Error("navigation menu item was not returned by PostgreSQL");
  }
  return row;
}

function now(): string {
  return new Date().toISOString();
}

function temporaryRank(): string {
  return "0000000000000000";
}

function rankForIndex(index: number): string {
  return String((index + 1) * 1024).padStart(16, "0");
}

function operationError(code: string, field?: string): Error & { code: string; field?: string } {
  return Object.assign(new Error(code), { code, field });
}
