import type { PageInfo } from "@shopana/drizzle-query";
import type {
  VariantRelayInput,
  WarehouseAssignableVariantRelayInput,
} from "../../repositories/variant/VariantRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type VariantConnectionInput = VariantRelayInput & {
  empty?: boolean;
  productId?: string;
  warehouseId?: string;
};

export type WarehouseAssignableVariantConnectionInput =
  WarehouseAssignableVariantRelayInput & {
    empty?: boolean;
    warehouseId: string;
  };

const EMPTY_PAGE_INFO: PageInfo = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
  endCursor: null,
};

function emptyVariantConnection(): ConnectionData {
  return {
    edges: [],
    pageInfo: EMPTY_PAGE_INFO,
    totalCount: 0,
  };
}

/**
 * VariantConnection - resolves paginated variant lists
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class VariantConnectionResolver extends BaseConnectionResolver<VariantConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { empty, productId, warehouseId, ...args } = this.$props;
    if (empty) {
      return emptyVariantConnection();
    }

    if (warehouseId) {
      return this.$ctx.kernel
        .getServices()
        .repository.variant.getWarehouseAssignableConnection(
          warehouseId,
          args
        );
    }

    if (!productId) {
      return this.$ctx.kernel
        .getServices()
        .repository.variant.getConnection(args);
    }

    return this.$ctx.kernel
      .getServices()
      .repository.variant.getConnectionByProductId(productId, args);
  }

  protected async createNodeResolver(nodeId: string) {
    return this.resolvers.variant(nodeId);
  }
}

export class WarehouseAssignableVariantConnectionResolver extends BaseConnectionResolver<WarehouseAssignableVariantConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    const { empty, warehouseId, ...args } = this.$props;
    if (empty) {
      return emptyVariantConnection();
    }

    return this.$ctx.kernel
      .getServices()
      .repository.variant.getWarehouseAssignableConnection(
        warehouseId,
        args as WarehouseAssignableVariantRelayInput
      );
  }

  protected async createNodeResolver(nodeId: string) {
    return this.resolvers.variant(nodeId);
  }
}
