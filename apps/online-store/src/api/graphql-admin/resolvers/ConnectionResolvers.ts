import type {
  NavigationMenuConnectionResult,
  NavigationMenuRelayInput,
  PageConnectionResult,
  PageRelayInput,
} from "../../../content/repositories/index.js";
import { NavigationMenuResolver } from "./NavigationMenuResolver.js";
import { OnlineStoreType } from "./OnlineStoreType.js";
import { PageResolver } from "./PageResolver.js";

export type PageConnectionArgs = PageRelayInput;
export type NavigationMenuConnectionArgs = NavigationMenuRelayInput;

export class PageConnectionResolver extends OnlineStoreType<
  PageConnectionArgs,
  PageConnectionResult
> {
  protected $preload() {
    return this.$ctx.repository.page.getConnection(this.scope, this.$props, this.$ctx.locale);
  }

  async edges() {
    return (await this.$data).edges.map(({ cursor, nodeId }) => ({
      cursor,
      node: new PageResolver(nodeId, this.$ctx),
    }));
  }

  async pageInfo() {
    return (await this.$data).pageInfo;
  }

  async totalCount() {
    return (await this.$data).totalCount;
  }
}

export class NavigationMenuConnectionResolver extends OnlineStoreType<
  NavigationMenuConnectionArgs,
  NavigationMenuConnectionResult
> {
  protected $preload() {
    return this.$ctx.repository.navigationMenu.getConnection(this.scope, this.$props);
  }

  async edges() {
    return (await this.$data).edges.map(({ cursor, nodeId }) => ({
      cursor,
      node: new NavigationMenuResolver(nodeId, this.$ctx),
    }));
  }

  async pageInfo() {
    return (await this.$data).pageInfo;
  }

  async totalCount() {
    return (await this.$data).totalCount;
  }
}
