import { type PageInfo } from "@shopana/drizzle-query";
import { BaseType, type TypeClass } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

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

// ============ BaseEdgeResolver ============

/**
 * Abstract base class for Edge resolvers.
 * Subclasses must define the static `fields` property pointing to their node resolver.
 *
 * @example
 * class WarehouseEdgeResolver extends BaseEdgeResolver {
 *   static fields = {
 *     node: () => WarehouseResolver,
 *   };
 * }
 */
export abstract class BaseEdgeResolver extends BaseType<
  EdgeData,
  EdgeData,
  ServiceContext
> {
  /**
   * Override in subclass to specify the node resolver.
   * @example
   * static fields = { node: () => WarehouseResolver };
   */
  static fields: { node: () => TypeClass };

  cursor() {
    return this.value.cursor;
  }

  node() {
    return this.value.nodeId;
  }
}

// ============ BaseConnectionResolver ============

/**
 * Abstract base class for Connection resolvers.
 * Subclasses must:
 * 1. Define the static `fields` property pointing to their edge resolver
 * 2. Implement the `loadData` method to fetch connection data
 *
 * @template TArgs - The type of arguments passed to the connection query
 *
 * @example
 * class WarehouseConnectionResolver extends BaseConnectionResolver<InventoryQueryWarehousesArgs> {
 *   static fields = {
 *     edges: () => WarehouseEdgeResolver,
 *   };
 *
 *   async loadData(): Promise<ConnectionData> {
 *     return this.ctx.kernel
 *       .getServices()
 *       .repository.warehouse.getConnection(this.value);
 *   }
 * }
 */
export abstract class BaseConnectionResolver<TArgs = unknown> extends BaseType<
  TArgs,
  ConnectionData,
  ServiceContext
> {
  /**
   * Override in subclass to specify the edge resolver.
   * @example
   * static fields = { edges: () => WarehouseEdgeResolver };
   */
  static fields: { edges: () => TypeClass };

  /**
   * Override to load connection data from repository.
   * Must return Promise<ConnectionData>.
   */
  abstract loadData(): Promise<ConnectionData>;

  async edges() {
    return this.get("edges");
  }

  async pageInfo() {
    return this.get("pageInfo");
  }

  async totalCount(): Promise<number> {
    return (await this.get("totalCount")) ?? 0;
  }
}
