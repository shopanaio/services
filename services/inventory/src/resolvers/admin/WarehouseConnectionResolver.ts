import type { WarehouseRelayInput } from "../../repositories/warehouse/WarehouseRepository.js";
import { WarehouseResolver } from "./WarehouseResolver.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type WarehouseConnectionResolverInput = WarehouseRelayInput;

/**
 * WarehouseConnection - resolves paginated warehouse list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class WarehouseConnectionResolver extends BaseConnectionResolver<WarehouseRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.ctx.kernel
      .getServices()
      .repository.warehouse.getConnection(this.value);
  }

  protected createNodeResolver(nodeId: string) {
    return new WarehouseResolver(nodeId, this.ctx);
  }
}
