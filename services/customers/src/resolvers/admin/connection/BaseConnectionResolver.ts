import type { PageInfo } from "@shopana/drizzle-query";
import { CustomersType } from "../CustomersType.js";

export interface EdgeData {
  cursor: string;
  nodeId: string;
}

export interface ConnectionData {
  edges: EdgeData[];
  pageInfo: PageInfo;
  totalCount: number;
}

export abstract class BaseConnectionResolver<TArgs = unknown> extends CustomersType<
  TArgs,
  ConnectionData
> {
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

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
