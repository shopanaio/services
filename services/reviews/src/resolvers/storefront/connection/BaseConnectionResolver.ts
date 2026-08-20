import type { PageInfo } from "@shopana/drizzle-query";
import { ReviewsType } from "../ReviewsType.js";

export interface ConnectionData {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export abstract class BaseConnectionResolver<TArgs = unknown> extends ReviewsType<
  TArgs,
  ConnectionData
> {
  abstract $preload(): Promise<ConnectionData>;
  protected abstract createNodeResolver(id: string): unknown | Promise<unknown>;
  async edges() {
    return Promise.all(
      (await this.$get("edges")).map(async (edge) => ({
        cursor: edge.cursor,
        node: await this.createNodeResolver(edge.nodeId),
      })),
    );
  }
  async nodes() {
    return Promise.all(
      (await this.$get("edges")).map((edge) => this.createNodeResolver(edge.nodeId)),
    );
  }
  pageInfo() {
    return this.$get("pageInfo");
  }
  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }
}
