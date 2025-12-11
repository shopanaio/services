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

// ============ Edge Factory ============

/**
 * Creates an Edge resolver class for the given node resolver.
 * The Edge class handles cursor and node resolution automatically.
 */
function createEdgeResolver(getNodeResolver: () => TypeClass) {
  return class EdgeResolver extends BaseType<EdgeData, EdgeData, ServiceContext> {
    static fields = {
      node: getNodeResolver,
    };

    cursor() {
      return this.value.cursor;
    }

    node() {
      return this.value.nodeId;
    }
  };
}

// ============ BaseConnectionResolver ============

/**
 * Abstract base class for Connection resolvers.
 * Automatically creates Edge resolver based on the provided node resolver.
 *
 * Subclasses must:
 * 1. Define static `node` property pointing to the node resolver
 * 2. Implement the `loadData` method to fetch connection data
 *
 * @template TArgs - The type of arguments passed to the connection query
 *
 * @example
 * class WarehouseConnectionResolver extends BaseConnectionResolver<InventoryQueryWarehousesArgs> {
 *   static node = () => WarehouseResolver;
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
   * Override in subclass to specify the node resolver.
   * @example
   * static node = () => WarehouseResolver;
   */
  static node: () => TypeClass;

  /**
   * Auto-generated fields based on `node` property.
   * Creates Edge resolver automatically.
   */
  static get fields(): { edges: () => TypeClass } {
    return {
      edges: () => createEdgeResolver(this.node),
    };
  }

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
