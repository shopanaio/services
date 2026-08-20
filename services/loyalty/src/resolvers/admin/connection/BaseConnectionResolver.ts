import type { PageInfo } from "@shopana/drizzle-query";
import { LoyaltyType } from "../LoyaltyType.js";

export interface ConnectionData {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export abstract class BaseConnectionResolver<TInput> extends LoyaltyType<TInput, ConnectionData> {
  abstract $preload(): Promise<ConnectionData>;
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

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
