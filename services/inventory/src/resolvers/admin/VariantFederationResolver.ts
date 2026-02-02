import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { ApolloEntityResolver } from "@shopana/type-resolver";
import { InventoryType, Cache } from "./InventoryType.js";
import { InventoryItemResolver } from "./InventoryItemResolver.js";
import type { InventoryItem } from "../../repositories/models/index.js";

/**
 * Federation resolver for Variant type.
 * Extends Variant from Catalog service with inventory data.
 *
 * This resolver is called by Apollo Gateway when a query needs
 * inventory fields on a Variant.
 */
@ApolloEntityResolver("Variant")
export class VariantFederationResolver extends InventoryType<{ id: string }> {
  /**
   * Reference resolver - called by Apollo Federation to resolve
   * a Variant reference from another service.
   */
  static __resolveReference(reference: { id: string }, ctx: unknown) {
    return new VariantFederationResolver(reference, ctx as typeof this.prototype.$ctx);
  }

  @Cache()
  private async loadInventoryItem(): Promise<InventoryItem | null> {
    // Decode the global ID to get the UUID
    const variantUuid = decodeGlobalIdByType(this.$data.id, GlobalIdEntity.Variant);

    // Get or create inventory item for this variant
    return this.$ctx.kernel.repository.inventoryItem.getOrCreate(variantUuid);
  }

  /**
   * Returns the InventoryItem associated with this Variant.
   * Creates one if it doesn't exist (lazy creation).
   */
  async inventoryItem(): Promise<InventoryItemResolver | null> {
    const item = await this.loadInventoryItem();
    if (!item) return null;

    return new InventoryItemResolver(item.id, this.$ctx);
  }
}
