import {
  GlobalIdEntity,
  parseGlobalId,
} from "@shopana/shared-graphql-guid";
import {
  NavigationMenuConnectionResolver,
  type NavigationMenuConnectionArgs,
  PageConnectionResolver,
  type PageConnectionArgs,
} from "./ConnectionResolvers.js";
import {
  NavigationMenuItemResolver,
  NavigationMenuResolver,
} from "./NavigationMenuResolver.js";
import { OnlineStoreType } from "./OnlineStoreType.js";
import { PageResolver } from "./PageResolver.js";

export class QueryResolver extends OnlineStoreType<Record<string, never>> {
  onlineStoreAppQuery() {
    return new OnlineStoreAppQueryResolver({}, this.$ctx);
  }
}

export class OnlineStoreAppQueryResolver extends OnlineStoreType<
  Record<string, never>
> {
  async node(args: { id: string }) {
    let typeName: string;
    try {
      typeName = parseGlobalId(args.id).typeName;
    } catch {
      return null;
    }
    if (typeName === GlobalIdEntity.OnlineStorePage) {
      return this.page(args);
    }
    if (typeName === GlobalIdEntity.OnlineStoreNavigationMenu) {
      return this.navigationMenu(args);
    }
    if (typeName === GlobalIdEntity.OnlineStoreNavigationMenuItem) {
      return this.navigationMenuItem(args.id);
    }
    return null;
  }

  nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async page(args: { id: string }) {
    const id = this.safeDecode(args.id, GlobalIdEntity.OnlineStorePage);
    if (!id) return null;
    return (await this.$ctx.loaders.page.load(id))
      ? new PageResolver(id, this.$ctx)
      : null;
  }

  async pageByHandle(args: { handle: string }) {
    const page = await this.$ctx.repository.page.findByHandle(
      this.scope,
      args.handle,
    );
    return page ? new PageResolver(page.id, this.$ctx) : null;
  }

  pages(args: PageConnectionArgs) {
    return new PageConnectionResolver(args, this.$ctx);
  }

  async navigationMenu(args: { id: string }) {
    const id = this.safeDecode(
      args.id,
      GlobalIdEntity.OnlineStoreNavigationMenu,
    );
    if (!id) return null;
    return (await this.$ctx.loaders.navigationMenu.load(id))
      ? new NavigationMenuResolver(id, this.$ctx)
      : null;
  }

  async navigationMenuByHandle(args: { handle: string }) {
    const menu = await this.$ctx.repository.navigationMenu.findByHandle(
      this.scope,
      args.handle,
    );
    return menu ? new NavigationMenuResolver(menu.id, this.$ctx) : null;
  }

  navigationMenus(args: NavigationMenuConnectionArgs) {
    return new NavigationMenuConnectionResolver(args, this.$ctx);
  }

  private async navigationMenuItem(globalId: string) {
    const id = this.safeDecode(
      globalId,
      GlobalIdEntity.OnlineStoreNavigationMenuItem,
    );
    if (!id) return null;
    return (await this.$ctx.loaders.navigationMenuItem.load(id))
      ? new NavigationMenuItemResolver(id, this.$ctx)
      : null;
  }

  private safeDecode(id: string, type: GlobalIdEntity): string | null {
    try {
      return this.decodeId(id, type);
    } catch {
      return null;
    }
  }
}
