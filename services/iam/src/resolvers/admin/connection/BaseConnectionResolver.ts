import { IAMType } from "../IAMType.js";

// ============ Types ============

/**
 * Standard edge data for Relay connections
 */
export interface EdgeData {
  cursor: string;
  nodeId: string;
}

/**
 * PageInfo for Relay connections
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

/**
 * Standard connection data for Relay connections
 */
export interface ConnectionData {
  edges: EdgeData[];
  pageInfo: PageInfo;
  totalCount: number;
}

// ============ BaseConnectionResolver ============

/**
 * Abstract base class for Connection resolvers.
 * Subclasses must implement $preload and createNodeResolver.
 */
export abstract class BaseConnectionResolver<TArgs = unknown> extends IAMType<
  TArgs,
  ConnectionData
> {
  /**
   * Override to load connection data from repository.
   * Must return Promise<ConnectionData>.
   */
  abstract $preload(): Promise<ConnectionData>;

  /**
   * Override to create the node resolver for a given node ID.
   */
  protected abstract createNodeResolver(nodeId: string): unknown;

  async edges() {
    const edgesData = await this.$get("edges");
    return (edgesData ?? []).map((edge) => ({
      cursor: edge.cursor,
      node: this.createNodeResolver(edge.nodeId),
    }));
  }

  async pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.$get("totalCount")) ?? 0;
  }
}
