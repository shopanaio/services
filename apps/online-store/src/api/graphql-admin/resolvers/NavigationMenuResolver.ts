import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type {
  NavigationMenuItemRecord,
  NavigationMenuRecord,
} from "../../../content/repositories/index.js";
import { OnlineStoreType } from "./OnlineStoreType.js";

export type OnlineStoreNavigationTargetType =
  "URL" | "PAGE" | "PRODUCT" | "CATEGORY" | "COLLECTION";

export class NavigationMenuResolver extends OnlineStoreType<string, NavigationMenuRecord> {
  readonly __typename = "OnlineStoreNavigationMenu";

  async $preload() {
    const menu = await this.$ctx.loaders.navigationMenu.load(this.$props);
    if (!menu) {
      throw new PreloadNotFoundError(
        `Online Store navigation menu with ID ${this.$props} not found`,
      );
    }
    return menu;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OnlineStoreNavigationMenu);
  }

  async handle() {
    return this.$get("handle");
  }

  async name() {
    return this.$get("name");
  }

  async revision() {
    return this.$get("revision");
  }

  async items() {
    const items = await this.$ctx.repository.navigationMenuItem.listChildren(
      this.scope,
      this.$props,
      null,
    );
    return items.map(({ id }) => new NavigationMenuItemResolver(id, this.$ctx));
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }
}

export class NavigationMenuItemResolver extends OnlineStoreType<string, NavigationMenuItemRecord> {
  readonly __typename = "OnlineStoreNavigationMenuItem";

  async $preload() {
    const item = await this.$ctx.loaders.navigationMenuItem.load(this.$props);
    if (!item) {
      throw new PreloadNotFoundError(
        `Online Store navigation item with ID ${this.$props} not found`,
      );
    }
    return item;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.OnlineStoreNavigationMenuItem);
  }

  async handle() {
    return this.$get("handle");
  }

  async menu() {
    return new NavigationMenuResolver(await this.$get("menuId"), this.$ctx);
  }

  async parent() {
    const parentId = await this.$get("parentId");
    return parentId ? new NavigationMenuItemResolver(parentId, this.$ctx) : null;
  }

  async children() {
    const item = await this.$data;
    const children = await this.$ctx.repository.navigationMenuItem.listChildren(
      this.scope,
      item.menuId,
      item.id,
    );
    return children.map(({ id }) => new NavigationMenuItemResolver(id, this.$ctx));
  }

  async label() {
    const translation = await this.$ctx.loaders.navigationMenuItemTranslation.load(this.$props);
    return translation?.label ?? "";
  }

  async target() {
    const item = await this.$data;
    const type = item.targetType as OnlineStoreNavigationTargetType;
    if (type === "URL") return { type, id: null, url: item.url };
    return {
      type,
      id: item.targetId ? encodeTargetId(item.targetId, type) : null,
      url: null,
    };
  }

  async openInNewTab() {
    return this.$get("openInNewTab");
  }

  async revision() {
    return this.$get("revision");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}

function encodeTargetId(id: string, type: Exclude<OnlineStoreNavigationTargetType, "URL">): string {
  const entity = {
    PAGE: GlobalIdEntity.OnlineStorePage,
    PRODUCT: GlobalIdEntity.Product,
    CATEGORY: GlobalIdEntity.Category,
    COLLECTION: GlobalIdEntity.Collection,
  }[type];
  return encodeGlobalIdByType(id, entity);
}
