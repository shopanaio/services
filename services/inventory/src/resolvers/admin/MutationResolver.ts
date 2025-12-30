import { ApolloMutation } from "@shopana/type-resolver";
import { InventoryType } from "./InventoryType.js";
import { ProductMutationResolver } from "./ProductMutationResolver.js";
import { VariantMutationResolver } from "./VariantMutationResolver.js";
import { WarehouseMutationResolver } from "./WarehouseMutationResolver.js";
import { OptionMutationResolver } from "./OptionMutationResolver.js";
import { FeatureMutationResolver } from "./FeatureMutationResolver.js";

/**
 * Root Mutation resolver.
 * Decorated with @ApolloMutation to create Apollo-compatible resolver proxy.
 */
@ApolloMutation
export class MutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for inventory-related mutations.
   * Returns namespace resolver that handles all inventory mutations.
   */
  inventoryMutation() {
    return new InventoryMutationResolver({}, this.ctx);
  }
}

/**
 * InventoryMutation namespace resolver.
 * Handles all inventory-related mutations.
 */
export class InventoryMutationResolver extends InventoryType<Record<string, never>> {
  /**
   * Entry point for product mutations.
   */
  productMutation() {
    return new ProductMutationResolver({}, this.ctx);
  }

  /**
   * Entry point for variant mutations.
   */
  variantMutation() {
    return new VariantMutationResolver({}, this.ctx);
  }

  /**
   * Entry point for warehouse mutations.
   */
  warehouseMutation() {
    return new WarehouseMutationResolver({}, this.ctx);
  }

  /**
   * Entry point for option mutations.
   */
  optionMutation() {
    return new OptionMutationResolver({}, this.ctx);
  }

  /**
   * Entry point for feature mutations.
   */
  featureMutation() {
    return new FeatureMutationResolver({}, this.ctx);
  }
}
