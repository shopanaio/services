import type { PageInfo } from "@shopana/drizzle-query";
import { LoyaltyStorefrontType } from "../LoyaltyStorefrontType.js";

export interface StorefrontConnectionData {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export abstract class BaseStorefrontConnectionResolver<TInput> extends LoyaltyStorefrontType<
  TInput,
  StorefrontConnectionData
> {
  abstract $preload(): Promise<StorefrontConnectionData>;
  protected abstract createNodeResolver(nodeId: string): unknown | Promise<unknown>;

  async edges() {
    const edges = await this.$get("edges");
    return Promise.all(
      (edges ?? []).map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.createNodeResolver(edge.nodeId),
      })),
    );
  }

  pageInfo() {
    return this.$get("pageInfo");
  }
  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }
}
