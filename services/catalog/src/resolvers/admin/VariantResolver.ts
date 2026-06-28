import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
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
 * Inventory-owned entity fields stay behind inventoryItem; physical measurements
 * are exposed directly on the variant because they are keyed by variantId.
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
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Variant);
  }

  async productId() {
    return this.$get("productId");
  }

  async product() {
    return this.resolvers.product(await this.$get("productId"));
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
        optionId: encodeGlobalIdByType(link.optionId, GlobalIdEntity.Option),
        optionValueId: encodeGlobalIdByType(
          link.optionValueId!,
          GlobalIdEntity.OptionValue
        ),
      }));
  }

  async media(): Promise<VariantMediaItem[]> {
    const mediaItems = await this.$ctx.loaders.variantMedia.load(this.$props);
    return mediaItems.map((media) => ({
      file: {
        __typename: "File" as const,
        id: encodeGlobalIdByType(media.fileId, GlobalIdEntity.File),
      },
      sortIndex: media.sortIndex,
    }));
  }

  async dimensions() {
    const dims = await this.$ctx.kernel
      .getServices()
      .repository.physical.getDimensionsByVariantIds([this.$props]);

    const current = dims[0];
    if (!current) return null;

    return {
      width: current.wMm,
      length: current.lMm,
      height: current.hMm,
    };
  }

  async weight() {
    const weights = await this.$ctx.kernel
      .getServices()
      .repository.physical.getWeightsByVariantIds([this.$props]);

    const current = weights[0];
    if (!current) return null;

    return {
      value: current.weightGr,
    };
  }

  async inventoryItem() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(
      this.$props
    );
    if (!item) return null;
    return this.resolvers.inventoryItem(item.id);
  }
}
