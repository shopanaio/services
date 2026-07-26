import type { PageInfo } from "@shopana/drizzle-query";
import { AppsType } from "../AppsType.js";

export interface ConnectionData {
  readonly edges: Array<{
    readonly cursor: string;
    readonly nodeId: string;
  }>;
  readonly pageInfo: PageInfo;
  readonly totalCount: number;
}

/**
 * Shared Relay connection resolver used by the Apps admin API.
 */
export abstract class BaseConnectionResolver<
  TInput,
> extends AppsType<TInput, ConnectionData> {
  abstract $preload(): Promise<ConnectionData>;

  protected abstract createNodeResolver(
    nodeId: string,
  ): unknown | Promise<unknown>;

  async edges() {
    const edges = await this.$get("edges");
    return Promise.all(
      edges.map(async (edge) => ({
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
