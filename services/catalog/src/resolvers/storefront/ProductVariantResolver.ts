import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type { Variant } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import type {
  ProductComponentSelectionInput,
  ProductVariantMediaArgs,
} from "./generated/types.js";
import { inventoryState, loadPublishedVariant } from "./helpers.js";
import { mediaReference } from "./MediaConnectionResolver.js";
import { minorUnitsToMoney } from "./money.js";

@SubgraphReference()
export class ProductVariantResolver extends CatalogType<string, Variant> {
  async $preload() {
    const value = await loadPublishedVariant(this.$ctx, this.$props);
    if (!value) {
      throw new PreloadNotFoundError("Published product variant not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ProductVariant);
  }

  async product() {
    return this.resolvers.product(await this.$get("productId"));
  }

  handle() {
    return this.$get("handle");
  }

  async title() {
    const translation = await this.$ctx.loaders.variantTranslation.load(
      this.$props,
    );
    if (translation?.title) return translation.title;
    const productTranslation = await this.$ctx.loaders.productTranslation.load(
      await this.$get("productId"),
    );
    return productTranslation?.name ?? (await this.$get("handle"));
  }

  async sku() {
    const direct = await this.$get("sku");
    if (direct) return direct;
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    return item?.sku ?? null;
  }

  isDefault() {
    return this.$get("isDefault");
  }

  async selectedOptions() {
    const links = await this.$ctx.loaders.variantSelectedOptions.load(
      this.$props,
    );
    return Promise.all(
      links.flatMap((link) =>
        link.optionValueId
          ? [
              this.resolvers.selectedOption({
                optionId: link.optionId,
                optionValueId: link.optionValueId,
              }),
            ]
          : [],
      ),
    );
  }

  async price() {
    const value = await this.currentPrice();
    return value
      ? minorUnitsToMoney(value.amountMinor, value.currency)
      : null;
  }

  async compareAtPrice() {
    const value = await this.currentPrice();
    return value?.compareAtMinor == null
      ? null
      : minorUnitsToMoney(value.compareAtMinor, value.currency);
  }

  async availableForSale() {
    const [price, inventory] = await Promise.all([
      this.currentPrice(),
      inventoryState(this.$ctx, this.$props),
    ]);
    return Boolean(price && inventory.availableForSale);
  }

  async currentlyNotInStock() {
    return (await inventoryState(this.$ctx, this.$props)).currentlyNotInStock;
  }

  async quantityAvailable() {
    return (await inventoryState(this.$ctx, this.$props)).quantityAvailable;
  }

  async inventoryItem() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    return item ? this.resolvers.inventoryItem(item.id) : null;
  }

  async requiresShipping() {
    const item = await this.$ctx.loaders.inventoryItemByVariant.load(this.$props);
    return item?.requiresShipping ?? false;
  }

  async weight() {
    const rows = await this.$ctx.kernel.repository.physical.getWeightsByVariantIds([
      this.$props,
    ]);
    const value = rows[0];
    return value ? { value: value.weightGr, unit: "g" } : null;
  }

  async dimensions() {
    const rows =
      await this.$ctx.kernel.repository.physical.getDimensionsByVariantIds([
        this.$props,
      ]);
    const value = rows[0];
    return value
      ? {
          width: value.wMm,
          height: value.hMm,
          length: value.lMm,
          unit: "mm",
        }
      : null;
  }

  media(args: ProductVariantMediaArgs) {
    return this.resolvers.mediaConnection({
      ...args,
      ownerId: this.$props,
      ownerType: "variant",
    });
  }

  async featuredMedia() {
    const variantRows = await this.$ctx.loaders.variantMedia.load(this.$props);
    if (variantRows[0]) return mediaReference(variantRows[0].fileId);
    const productRows = await this.$ctx.loaders.productMedia.load(
      await this.$get("productId"),
    );
    return productRows[0] ? mediaReference(productRows[0].fileId) : null;
  }

  async componentConfiguration(args: {
    selections?: ProductComponentSelectionInput[] | null;
  }) {
    const configurationId =
      await this.$ctx.loaders.componentConfigurationIdByVariantId.load(
        this.$props,
      );
    if (!configurationId) return null;
    return this.resolvers.productComponentConfiguration({
      variantId: this.$props,
      selections: args.selections,
    });
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }

  private async currentPrice() {
    const prices = await this.$ctx.loaders.variantPricing.load(this.$props);
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    const now = Date.now();
    return (
      prices.find(
        (price) =>
          price.currency === currency &&
          Date.parse(price.effectiveFrom) <= now &&
          (!price.effectiveTo || Date.parse(price.effectiveTo) > now),
      ) ?? null
    );
  }
}
