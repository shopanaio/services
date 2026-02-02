import { type PageInfo } from "@shopana/drizzle-query";
import { CatalogType } from "../CatalogType.js";

// ============ Types ============

/**
 * Standard edge data for Relay connections
 */
export interface EdgeData {
  cursor: string;
  nodeId: string;
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
 *
 * @template TArgs - The type of arguments passed to the connection query
 *
 * @example
 * class WarehouseConnectionResolver extends BaseConnectionResolver<InventoryQueryWarehousesArgs> {
 *   async $preload(): Promise<ConnectionData> {
 *     return this.$ctx.kernel
 *       .getServices()
 *       .repository.warehouse.getConnection(this.$props);
 *   }
 *
 *   protected createNodeResolver(nodeId: string) {
 *     return new WarehouseResolver(nodeId, this.$ctx);
 *   }
 * }
 */
export abstract class BaseConnectionResolver<TArgs = unknown> extends CatalogType<
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
   * @param nodeId - The ID of the node to resolve
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
