import { SubgraphReference } from "@shopana/type-resolver";
import type {
  SelectedOption,
  VariantMediaItem,
  VariantPrice,
} from "./interfaces/index.js";
import type { Variant } from "../../repositories/models/index.js";
import type { PricingCursorInput } from "../../repositories/pricing/PricingRepository.js";
import { CatalogType } from "./CatalogType.js";
import { VariantPriceResolver } from "./VariantPriceResolver.js";

/**
 * Variant resolver for Catalog Service.
 * Does NOT contain inventory fields (sku, dimensions, weight, cost, stock).
 * Those fields are resolved via federation extend in Inventory Service.
 */
@SubgraphReference()
export class VariantResolver extends CatalogType<string, Variant> {
  async $preload() {
    const variant = await this.$ctx.loaders.variant.load(this.$props);
    if (!variant) {
      throw new Error(`Variant with ID ${this.$props} not found`);
    }
    return variant;
  }

  id() {
    return this.$props;
  }

  async productId() {
    return this.$get("productId");
  }

  async isDefault() {
    return (await this.$get("isDefault")) ?? false;
  }

  async handle() {
    return (await this.$get("handle")) ?? "";
  }

  // externalSystem and externalId stay in Catalog - these are product identifiers
  async externalSystem() {
    return this.$get("externalSystem");
  }

  async externalId() {
    return this.$get("externalId");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async deletedAt() {
    return this.$get("deletedAt");
  }

  async title() {
    const translation = await this.$ctx.loaders.variantTranslation.load(
      this.$props
    );
    return translation?.title ?? null;
  }

  // ═══════════════════════════════════════════════════════════
  // Pricing stays in Catalog
  // ═══════════════════════════════════════════════════════════

  async price(): Promise<VariantPrice | null> {
    const prices = await this.$ctx.loaders.variantPricing.load(this.$props);

    // Filter by currency if specified
    let filtered = prices;
    if (this.$ctx.currency) {
      filtered = prices.filter((p) => p.currency === this.$ctx.currency);
    }

    if (filtered.length === 0) return null;

    // Get current active price
    const current = filtered[0];
    return {
      id: current.id,
      currency: current.currency as "UAH" | "USD" | "EUR",
      amountMinor: current.amountMinor,
      compareAtMinor: current.compareAtMinor,
      effectiveFrom: current.effectiveFrom,
      effectiveTo: current.effectiveTo,
      recordedAt: current.recordedAt,
      isCurrent: current.effectiveTo === null,
    };
  }

  /**
   * Returns price history for this variant
   * @param args - Pagination arguments (first, last, after, before)
   */
  async priceHistory(args: PricingCursorInput) {
    const services = this.$ctx.kernel.getServices();
    const ids = await services.repository.pricing.getIdsByVariantId(
      this.$props,
      args
    );
    return ids.map((id: string) => new VariantPriceResolver(id, this.$ctx));
  }

  async selectedOptions(): Promise<SelectedOption[]> {
    const links = await this.$ctx.loaders.variantSelectedOptions.load(
      this.$props
    );
    return links
      .filter((link) => link.optionValueId !== null)
      .map((link) => ({
        optionId: link.optionId,
        optionValueId: link.optionValueId!,
      }));
  }

  async media(): Promise<Array<{ file: { __typename: "File"; id: string }; sortIndex: number }>> {
    const mediaItems = await this.$ctx.loaders.variantMedia.load(this.$props);
    return mediaItems.map((m) => ({
      file: { __typename: "File" as const, id: m.fileId },
      sortIndex: m.sortIndex,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // REMOVED from Catalog (moved to Inventory):
  // - sku()
  // - dimensions()
  // - weight()
  // - cost()
  // - costHistory()
  // - stock()
  // - inStock()
  // These fields are resolved via federation extend
  // ═══════════════════════════════════════════════════════════
}
