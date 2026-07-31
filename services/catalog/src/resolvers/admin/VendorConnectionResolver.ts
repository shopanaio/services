import type { VendorRelayInput } from "../../repositories/vendor/VendorRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type VendorConnectionInput = VendorRelayInput;

/**
 * VendorConnection - resolves paginated vendor list
 * Uses cursor-based pagination with Relay-style Connection spec
 */
export class VendorConnectionResolver extends BaseConnectionResolver<VendorRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel
      .getServices()
      .repository.vendor.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.vendor(nodeId);
  }
}
