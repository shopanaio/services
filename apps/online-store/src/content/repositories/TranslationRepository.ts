import { and, asc, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import {
  navigationMenuItems,
  navigationMenuItemTranslations,
  pageTranslations,
  pages,
  type NavigationMenuItemTranslationModel,
  type PageTranslationModel,
} from "./models/index.js";
import type {
  NavigationMenuItemTranslationRecord,
  OnlineStoreScope,
  PageTranslationRecord,
} from "./types.js";

export interface UpsertPageTranslationInput {
  readonly locale: string;
  readonly title: string;
  readonly bodyText?: string | null;
  readonly bodyHtml?: string | null;
  readonly bodyJson?: Record<string, unknown> | null;
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogTitle?: string | null;
  readonly ogDescription?: string | null;
  readonly ogImageId?: string | null;
}

export interface UpsertNavigationMenuItemTranslationInput {
  readonly locale: string;
  readonly label: string;
}

export class TranslationRepository extends BaseRepository {
  async findPageTranslation(
    scope: OnlineStoreScope,
    pageId: string,
    locale: string,
  ): Promise<PageTranslationRecord | null> {
    const rows = await this.connection
      .select()
      .from(pageTranslations)
      .where(
        and(
          eq(pageTranslations.pageId, pageId),
          eq(pageTranslations.storeId, scope.storeId),
          eq(pageTranslations.locale, locale),
          this.ownedPageExists(scope, pageTranslations.pageId),
        ),
      )
      .limit(1);
    return rows[0] ? mapPageTranslation(rows[0]) : null;
  }

  async getPageTranslations(
    scope: OnlineStoreScope,
    pageIds: readonly string[],
    locale?: string,
  ): Promise<readonly PageTranslationRecord[]> {
    if (pageIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(pageTranslations)
      .where(
        and(
          eq(pageTranslations.storeId, scope.storeId),
          inArray(pageTranslations.pageId, [...new Set(pageIds)]),
          locale === undefined ? undefined : eq(pageTranslations.locale, locale),
          this.ownedPageExists(scope, pageTranslations.pageId),
        ),
      )
      .orderBy(asc(pageTranslations.locale));
    return Object.freeze(rows.map(mapPageTranslation));
  }

  upsertPageTranslation(
    scope: OnlineStoreScope,
    pageId: string,
    input: UpsertPageTranslationInput,
  ): Promise<PageTranslationRecord | null> {
    return this.txManager.run(() => this.upsertPageTranslationInTransaction(scope, pageId, input));
  }

  private async upsertPageTranslationInTransaction(
    scope: OnlineStoreScope,
    pageId: string,
    input: UpsertPageTranslationInput,
  ): Promise<PageTranslationRecord | null> {
    const ownedPage = await this.connection
      .select({ id: pages.id })
      .from(pages)
      .where(this.pageOwnership(scope, pageId))
      .limit(1)
      .for("update");
    if (!ownedPage[0]) return null;

    const rows = await this.connection
      .insert(pageTranslations)
      .values({
        pageId,
        storeId: scope.storeId,
        locale: input.locale,
        title: input.title,
        bodyText: input.bodyText ?? null,
        bodyHtml: input.bodyHtml ?? null,
        bodyJson: input.bodyJson ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        ogTitle: input.ogTitle ?? null,
        ogDescription: input.ogDescription ?? null,
        ogImageId: input.ogImageId ?? null,
      })
      .onConflictDoUpdate({
        target: [pageTranslations.pageId, pageTranslations.locale],
        set: {
          title: input.title,
          bodyText: input.bodyText ?? null,
          bodyHtml: input.bodyHtml ?? null,
          bodyJson: input.bodyJson ?? null,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
          ogTitle: input.ogTitle ?? null,
          ogDescription: input.ogDescription ?? null,
          ogImageId: input.ogImageId ?? null,
        },
      })
      .returning();
    return mapPageTranslation(requiredPageTranslation(rows[0]));
  }

  async deletePageTranslation(
    scope: OnlineStoreScope,
    pageId: string,
    locale: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .delete(pageTranslations)
      .where(
        and(
          eq(pageTranslations.pageId, pageId),
          eq(pageTranslations.storeId, scope.storeId),
          eq(pageTranslations.locale, locale),
          this.ownedPageExists(scope, pageTranslations.pageId),
        ),
      )
      .returning({ pageId: pageTranslations.pageId });
    return rows.length > 0;
  }

  async findMenuItemTranslation(
    scope: OnlineStoreScope,
    itemId: string,
    locale: string,
  ): Promise<NavigationMenuItemTranslationRecord | null> {
    const rows = await this.connection
      .select()
      .from(navigationMenuItemTranslations)
      .where(
        and(
          eq(navigationMenuItemTranslations.itemId, itemId),
          eq(navigationMenuItemTranslations.storeId, scope.storeId),
          eq(navigationMenuItemTranslations.locale, locale),
          this.ownedItemExists(scope, navigationMenuItemTranslations.itemId),
        ),
      )
      .limit(1);
    return rows[0] ? mapMenuItemTranslation(rows[0]) : null;
  }

  async getMenuItemTranslations(
    scope: OnlineStoreScope,
    itemIds: readonly string[],
    locale?: string,
  ): Promise<readonly NavigationMenuItemTranslationRecord[]> {
    if (itemIds.length === 0) return [];
    const rows = await this.connection
      .select()
      .from(navigationMenuItemTranslations)
      .where(
        and(
          eq(navigationMenuItemTranslations.storeId, scope.storeId),
          inArray(navigationMenuItemTranslations.itemId, [...new Set(itemIds)]),
          locale === undefined ? undefined : eq(navigationMenuItemTranslations.locale, locale),
          this.ownedItemExists(scope, navigationMenuItemTranslations.itemId),
        ),
      )
      .orderBy(asc(navigationMenuItemTranslations.locale));
    return Object.freeze(rows.map(mapMenuItemTranslation));
  }

  upsertMenuItemTranslation(
    scope: OnlineStoreScope,
    itemId: string,
    input: UpsertNavigationMenuItemTranslationInput,
  ): Promise<NavigationMenuItemTranslationRecord | null> {
    return this.txManager.run(() =>
      this.upsertMenuItemTranslationInTransaction(scope, itemId, input),
    );
  }

  private async upsertMenuItemTranslationInTransaction(
    scope: OnlineStoreScope,
    itemId: string,
    input: UpsertNavigationMenuItemTranslationInput,
  ): Promise<NavigationMenuItemTranslationRecord | null> {
    const ownedItem = await this.connection
      .select({ id: navigationMenuItems.id })
      .from(navigationMenuItems)
      .where(this.itemOwnership(scope, itemId))
      .limit(1)
      .for("update");
    if (!ownedItem[0]) return null;

    const rows = await this.connection
      .insert(navigationMenuItemTranslations)
      .values({
        itemId,
        storeId: scope.storeId,
        locale: input.locale,
        label: input.label,
      })
      .onConflictDoUpdate({
        target: [navigationMenuItemTranslations.itemId, navigationMenuItemTranslations.locale],
        set: { label: input.label },
      })
      .returning();
    return mapMenuItemTranslation(requiredMenuItemTranslation(rows[0]));
  }

  async deleteMenuItemTranslation(
    scope: OnlineStoreScope,
    itemId: string,
    locale: string,
  ): Promise<boolean> {
    const rows = await this.connection
      .delete(navigationMenuItemTranslations)
      .where(
        and(
          eq(navigationMenuItemTranslations.itemId, itemId),
          eq(navigationMenuItemTranslations.storeId, scope.storeId),
          eq(navigationMenuItemTranslations.locale, locale),
          this.ownedItemExists(scope, navigationMenuItemTranslations.itemId),
        ),
      )
      .returning({ itemId: navigationMenuItemTranslations.itemId });
    return rows.length > 0;
  }
}

function mapPageTranslation(row: PageTranslationModel): PageTranslationRecord {
  return Object.freeze({ ...row });
}

function mapMenuItemTranslation(
  row: NavigationMenuItemTranslationModel,
): NavigationMenuItemTranslationRecord {
  return Object.freeze({ ...row });
}

function requiredPageTranslation(row: PageTranslationModel | undefined): PageTranslationModel {
  if (!row) {
    throw new Error("page translation was not returned by PostgreSQL");
  }
  return row;
}

function requiredMenuItemTranslation(
  row: NavigationMenuItemTranslationModel | undefined,
): NavigationMenuItemTranslationModel {
  if (!row) {
    throw new Error("navigation item translation was not returned by PostgreSQL");
  }
  return row;
}
