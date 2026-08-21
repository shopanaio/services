import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { NavigationItemTarget } from "../../../content/repositories/index.js";
import {
  NavigationMenuItemResolver,
  NavigationMenuResolver,
  type OnlineStoreNavigationTargetType,
} from "./NavigationMenuResolver.js";
import { OnlineStoreType } from "./OnlineStoreType.js";
import { PageResolver } from "./PageResolver.js";

interface RichTextInput {
  readonly text: string;
  readonly html: string;
  readonly json: Record<string, unknown>;
}

interface SeoInput {
  readonly seoTitle?: string | null;
  readonly seoDescription?: string | null;
  readonly ogTitle?: string | null;
  readonly ogDescription?: string | null;
  readonly ogImageId?: string | null;
}

interface PageCreateInput {
  readonly handle: string;
  readonly title: string;
  readonly body?: RichTextInput | null;
  readonly seo?: SeoInput | null;
  readonly templateSuffix?: string | null;
  readonly publish?: boolean | null;
}

interface PageUpdateInput {
  readonly handle?: string | null;
  readonly title?: string | null;
  readonly body?: RichTextInput | null;
  readonly seo?: SeoInput | null;
  readonly templateSuffix?: string | null;
  readonly status?: "DRAFT" | "PUBLISHED" | null;
}

interface NavigationTargetInput {
  readonly type: OnlineStoreNavigationTargetType;
  readonly id?: string | null;
  readonly url?: string | null;
}

interface UserError {
  readonly message: string;
  readonly field: readonly string[] | null;
  readonly code: string;
}

export class MutationResolver extends OnlineStoreType<Record<string, never>> {
  onlineStoreAppMutation() {
    return new OnlineStoreAppMutationResolver({}, this.$ctx);
  }
}

export class OnlineStoreAppMutationResolver extends OnlineStoreType<Record<string, never>> {
  pageCreate(args: { readonly input: PageCreateInput }) {
    return this.entityPayload("page", async () => {
      assertNonEmpty(args.input.handle, "handle");
      assertNonEmpty(args.input.title, "title");
      const page = await this.$ctx.repository.runInTransaction(async () => {
        const created = await this.$ctx.repository.page.create(this.scope, {
          handle: args.input.handle,
          templateSuffix: args.input.templateSuffix,
          publishedAt: args.input.publish ? now() : null,
        });
        const translation = await this.$ctx.repository.translation.upsertPageTranslation(
          this.scope,
          created.id,
          this.pageTranslationInput(args.input),
        );
        if (!translation) throw operationError("ONLINE_STORE_PAGE_NOT_FOUND");
        return created;
      });
      return new PageResolver(page.id, this.$ctx);
    });
  }

  pageUpdate(args: { readonly pageId: string; readonly operations: PageUpdateInput }) {
    return this.entityPayload("page", async () => {
      const pageId = this.requiredId(args.pageId, GlobalIdEntity.OnlineStorePage, "pageId");
      if (args.operations.handle !== undefined) {
        assertNonEmpty(args.operations.handle, "operations.handle");
      }
      if (args.operations.title !== undefined) {
        assertNonEmpty(args.operations.title, "operations.title");
      }
      const page = await this.$ctx.repository.runInTransaction(async () => {
        const existingTranslation = await this.$ctx.repository.translation.findPageTranslation(
          this.scope,
          pageId,
          this.$ctx.locale,
        );
        const updated = await this.$ctx.repository.page.update(this.scope, pageId, {
          handle: args.operations.handle ?? undefined,
          ...(hasOwn(args.operations, "templateSuffix")
            ? { templateSuffix: args.operations.templateSuffix }
            : {}),
          ...(args.operations.status
            ? {
                publishedAt: args.operations.status === "PUBLISHED" ? now() : null,
              }
            : {}),
        });
        if (!updated) {
          throw operationError("ONLINE_STORE_PAGE_NOT_FOUND");
        }

        const title = hasOwn(args.operations, "title")
          ? args.operations.title
          : existingTranslation?.title;
        assertNonEmpty(title, "operations.title");
        const translation = await this.$ctx.repository.translation.upsertPageTranslation(
          this.scope,
          pageId,
          {
            locale: this.$ctx.locale,
            title,
            bodyText: hasOwn(args.operations, "body")
              ? (args.operations.body?.text ?? null)
              : existingTranslation?.bodyText,
            bodyHtml: hasOwn(args.operations, "body")
              ? (args.operations.body?.html ?? null)
              : existingTranslation?.bodyHtml,
            bodyJson: hasOwn(args.operations, "body")
              ? (args.operations.body?.json ?? null)
              : existingTranslation?.bodyJson,
            seoTitle: hasOwn(args.operations, "seo")
              ? (args.operations.seo?.seoTitle ?? null)
              : existingTranslation?.seoTitle,
            seoDescription: hasOwn(args.operations, "seo")
              ? (args.operations.seo?.seoDescription ?? null)
              : existingTranslation?.seoDescription,
            ogTitle: hasOwn(args.operations, "seo")
              ? (args.operations.seo?.ogTitle ?? null)
              : existingTranslation?.ogTitle,
            ogDescription: hasOwn(args.operations, "seo")
              ? (args.operations.seo?.ogDescription ?? null)
              : existingTranslation?.ogDescription,
            ogImageId: hasOwn(args.operations, "seo")
              ? (this.optionalId(
                  args.operations.seo?.ogImageId,
                  GlobalIdEntity.File,
                  "operations.seo.ogImageId",
                ) ?? null)
              : existingTranslation?.ogImageId,
          },
        );
        if (!translation) throw operationError("ONLINE_STORE_PAGE_NOT_FOUND");
        return updated;
      });
      return new PageResolver(page.id, this.$ctx);
    });
  }

  pageDelete(args: { readonly input: { readonly id: string } }) {
    return this.deletePayload("deletedPageId", async () => {
      const pageId = this.requiredId(args.input.id, GlobalIdEntity.OnlineStorePage, "input.id");
      const deleted = await this.$ctx.repository.page.softDelete(this.scope, pageId);
      if (!deleted) throw operationError("ONLINE_STORE_PAGE_NOT_FOUND");
      return this.encodeId(pageId, GlobalIdEntity.OnlineStorePage);
    });
  }

  navigationMenuCreate(args: {
    readonly input: { readonly handle: string; readonly name: string };
  }) {
    return this.entityPayload("navigationMenu", async () => {
      assertNonEmpty(args.input.handle, "input.handle");
      assertNonEmpty(args.input.name, "input.name");
      const menu = await this.$ctx.repository.navigationMenu.create(this.scope, args.input);
      return new NavigationMenuResolver(menu.id, this.$ctx);
    });
  }

  navigationMenuUpdate(args: {
    readonly input: {
      readonly id: string;
      readonly handle?: string | null;
      readonly name?: string | null;
    };
  }) {
    return this.entityPayload("navigationMenu", async () => {
      const menuId = this.requiredId(
        args.input.id,
        GlobalIdEntity.OnlineStoreNavigationMenu,
        "input.id",
      );
      if (args.input.handle !== undefined) {
        assertNonEmpty(args.input.handle, "input.handle");
      }
      if (args.input.name !== undefined) {
        assertNonEmpty(args.input.name, "input.name");
      }
      const menu = await this.$ctx.repository.navigationMenu.update(this.scope, menuId, {
        handle: args.input.handle ?? undefined,
        name: args.input.name ?? undefined,
      });
      if (!menu) {
        throw operationError("ONLINE_STORE_NAVIGATION_MENU_NOT_FOUND");
      }
      return new NavigationMenuResolver(menu.id, this.$ctx);
    });
  }

  navigationMenuDelete(args: { readonly input: { readonly id: string } }) {
    return this.deletePayload("deletedNavigationMenuId", async () => {
      const menuId = this.requiredId(
        args.input.id,
        GlobalIdEntity.OnlineStoreNavigationMenu,
        "input.id",
      );
      const deleted = await this.$ctx.repository.navigationMenu.softDelete(this.scope, menuId);
      if (!deleted) {
        throw operationError("ONLINE_STORE_NAVIGATION_MENU_NOT_FOUND");
      }
      return this.encodeId(menuId, GlobalIdEntity.OnlineStoreNavigationMenu);
    });
  }

  navigationMenuItemCreate(args: {
    readonly input: {
      readonly menuId: string;
      readonly parentId?: string | null;
      readonly handle: string;
      readonly label: string;
      readonly afterItemId?: string | null;
      readonly beforeItemId?: string | null;
      readonly target: NavigationTargetInput;
      readonly openInNewTab?: boolean | null;
    };
  }) {
    return this.entityPayload("navigationMenuItem", async () => {
      assertNonEmpty(args.input.handle, "input.handle");
      assertNonEmpty(args.input.label, "input.label");
      const menuId = this.requiredId(
        args.input.menuId,
        GlobalIdEntity.OnlineStoreNavigationMenu,
        "input.menuId",
      );
      const item = await this.$ctx.repository.runInTransaction(async () => {
        const created = await this.$ctx.repository.navigationMenuItem.create(this.scope, menuId, {
          handle: args.input.handle,
          parentId: this.optionalId(
            args.input.parentId,
            GlobalIdEntity.OnlineStoreNavigationMenuItem,
            "input.parentId",
          ),
          afterItemId: this.optionalId(
            args.input.afterItemId,
            GlobalIdEntity.OnlineStoreNavigationMenuItem,
            "input.afterItemId",
          ),
          beforeItemId: this.optionalId(
            args.input.beforeItemId,
            GlobalIdEntity.OnlineStoreNavigationMenuItem,
            "input.beforeItemId",
          ),
          target: this.navigationTarget(args.input.target),
          openInNewTab: args.input.openInNewTab ?? undefined,
        });
        if (!created) throw operationError("ONLINE_STORE_NAVIGATION_PARENT_INVALID");
        const translation = await this.$ctx.repository.translation.upsertMenuItemTranslation(
          this.scope,
          created.id,
          { locale: this.$ctx.locale, label: args.input.label },
        );
        if (!translation) {
          throw operationError("ONLINE_STORE_NAVIGATION_ITEM_NOT_FOUND");
        }
        return created;
      });
      return new NavigationMenuItemResolver(item.id, this.$ctx);
    });
  }

  navigationMenuItemUpdate(args: {
    readonly input: {
      readonly id: string;
      readonly parentId?: string | null;
      readonly handle?: string | null;
      readonly label?: string | null;
      readonly afterItemId?: string | null;
      readonly beforeItemId?: string | null;
      readonly target?: NavigationTargetInput | null;
      readonly openInNewTab?: boolean | null;
    };
  }) {
    return this.entityPayload("navigationMenuItem", async () => {
      if (args.input.handle !== undefined) {
        assertNonEmpty(args.input.handle, "input.handle");
      }
      if (args.input.label !== undefined) {
        assertNonEmpty(args.input.label, "input.label");
      }
      const itemId = this.requiredId(
        args.input.id,
        GlobalIdEntity.OnlineStoreNavigationMenuItem,
        "input.id",
      );
      if (hasOwn(args.input, "target") && !args.input.target) {
        throw operationError("NAVIGATION_TARGET_INVALID", "input.target");
      }
      const item = await this.$ctx.repository.runInTransaction(async () => {
        const updated = await this.$ctx.repository.navigationMenuItem.update(this.scope, itemId, {
          ...(hasOwn(args.input, "handle") ? { handle: args.input.handle! } : {}),
          ...(hasOwn(args.input, "parentId")
            ? {
                parentId: this.optionalId(
                  args.input.parentId,
                  GlobalIdEntity.OnlineStoreNavigationMenuItem,
                  "input.parentId",
                ),
              }
            : {}),
          afterItemId: this.optionalId(
            args.input.afterItemId,
            GlobalIdEntity.OnlineStoreNavigationMenuItem,
            "input.afterItemId",
          ),
          beforeItemId: this.optionalId(
            args.input.beforeItemId,
            GlobalIdEntity.OnlineStoreNavigationMenuItem,
            "input.beforeItemId",
          ),
          ...(hasOwn(args.input, "target")
            ? {
                target: args.input.target ? this.navigationTarget(args.input.target) : undefined,
              }
            : {}),
          ...(hasOwn(args.input, "openInNewTab")
            ? { openInNewTab: args.input.openInNewTab ?? false }
            : {}),
        });
        if (!updated) {
          throw operationError("ONLINE_STORE_NAVIGATION_ITEM_NOT_FOUND");
        }
        if (hasOwn(args.input, "label")) {
          const translation = await this.$ctx.repository.translation.upsertMenuItemTranslation(
            this.scope,
            itemId,
            { locale: this.$ctx.locale, label: args.input.label! },
          );
          if (!translation) {
            throw operationError("ONLINE_STORE_NAVIGATION_ITEM_NOT_FOUND");
          }
        }
        return updated;
      });
      return new NavigationMenuItemResolver(item.id, this.$ctx);
    });
  }

  navigationMenuItemDelete(args: { readonly input: { readonly id: string } }) {
    return this.deletePayload("deletedNavigationMenuItemId", async () => {
      const itemId = this.requiredId(
        args.input.id,
        GlobalIdEntity.OnlineStoreNavigationMenuItem,
        "input.id",
      );
      const deleted = await this.$ctx.repository.navigationMenuItem.deleteSubtree(
        this.scope,
        itemId,
      );
      if (!deleted) {
        throw operationError("ONLINE_STORE_NAVIGATION_ITEM_NOT_FOUND");
      }
      return this.encodeId(itemId, GlobalIdEntity.OnlineStoreNavigationMenuItem);
    });
  }

  private async entityPayload(
    field: "page" | "navigationMenu" | "navigationMenuItem",
    operation: () => Promise<unknown>,
  ) {
    try {
      return { [field]: await operation(), userErrors: [] };
    } catch (error) {
      return { [field]: null, userErrors: [toUserError(error)] };
    }
  }

  private async deletePayload(field: string, operation: () => Promise<string>) {
    try {
      return { [field]: await operation(), userErrors: [] };
    } catch (error) {
      return { [field]: null, userErrors: [toUserError(error)] };
    }
  }

  private requiredId(value: string, type: GlobalIdEntity, field: string): string {
    try {
      return this.decodeId(value, type);
    } catch {
      throw operationError("INVALID_ID", field);
    }
  }

  private optionalId(
    value: string | null | undefined,
    type: GlobalIdEntity,
    field: string,
  ): string | null | undefined {
    if (value === null) return null;
    if (value === undefined) return undefined;
    return this.requiredId(value, type, field);
  }

  private navigationTarget(input: NavigationTargetInput): NavigationItemTarget {
    if (input.type === "URL") {
      if (!input.url || input.id) {
        throw operationError("NAVIGATION_TARGET_INVALID", "input.target");
      }
      return { type: "URL", url: input.url };
    }
    if (!input.id || input.url) {
      throw operationError("NAVIGATION_TARGET_INVALID", "input.target");
    }
    const entity = {
      PAGE: GlobalIdEntity.OnlineStorePage,
      PRODUCT: GlobalIdEntity.Product,
      CATEGORY: GlobalIdEntity.Category,
      COLLECTION: GlobalIdEntity.Collection,
    }[input.type];
    return {
      type: input.type,
      id: this.requiredId(input.id, entity, "input.target.id"),
    };
  }

  private pageTranslationInput(input: PageCreateInput) {
    return {
      locale: this.$ctx.locale,
      title: input.title,
      bodyText: input.body?.text ?? null,
      bodyHtml: input.body?.html ?? null,
      bodyJson: input.body?.json ?? null,
      seoTitle: input.seo?.seoTitle ?? null,
      seoDescription: input.seo?.seoDescription ?? null,
      ogTitle: input.seo?.ogTitle ?? null,
      ogDescription: input.seo?.ogDescription ?? null,
      ogImageId:
        this.optionalId(input.seo?.ogImageId, GlobalIdEntity.File, "input.seo.ogImageId") ?? null,
    };
  }
}

function assertNonEmpty(value: string | null | undefined, field: string): asserts value is string {
  if (!value?.trim()) throw operationError("VALUE_REQUIRED", field);
}

function hasOwn(value: object, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, field);
}

function now(): string {
  return new Date().toISOString();
}

function operationError(code: string, field?: string): Error & { code: string; field?: string } {
  return Object.assign(new Error(code), { code, field });
}

function toUserError(error: unknown): UserError {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : "ONLINE_STORE_OPERATION_FAILED";
  const field =
    error && typeof error === "object" && "field" in error && typeof error.field === "string"
      ? error.field.split(".")
      : null;
  return { code, field, message: userMessage(code) };
}

function userMessage(code: string): string {
  switch (code) {
    case "INVALID_ID":
      return "The supplied global ID is invalid";
    case "VALUE_REQUIRED":
      return "The value is required and cannot be empty";
    case "ONLINE_STORE_PAGE_NOT_FOUND":
      return "The page was not found";
    case "ONLINE_STORE_NAVIGATION_ITEM_HANDLE_TAKEN":
      return "The navigation item handle is already used under this parent";
    case "ONLINE_STORE_NAVIGATION_PARENT_INVALID":
      return "The navigation parent is invalid";
    case "NAVIGATION_AFTER_ITEM_INVALID":
    case "NAVIGATION_BEFORE_ITEM_INVALID":
    case "NAVIGATION_PLACEMENT_INVALID":
      return "The requested navigation item position is invalid";
    case "NAVIGATION_TARGET_INVALID":
      return "The navigation target does not match its type";
    default:
      return "The Online Store operation could not be completed";
  }
}
