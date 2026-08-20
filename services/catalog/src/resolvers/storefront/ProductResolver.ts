import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  Product,
  ProductFeature,
} from "../../repositories/models/index.js";
import { toRichTextValue } from "../shared/richText.js";
import { CatalogType } from "./CatalogType.js";
import type {
  ProductCategoriesArgs,
  ProductMediaArgs,
  ProductSelectedOrFirstAvailableVariantArgs,
  ProductVariantBySelectedOptionsArgs,
  ProductVariantsArgs,
  SelectedOptionInput,
} from "./generated/types.js";
import { inventoryState, isPublishedAt, isPublishedProduct } from "./helpers.js";
import { mediaReference } from "./MediaConnectionResolver.js";
import { minorUnitsToMoney } from "./money.js";
import { emptySeo } from "./SeoResolver.js";
import { ProductComparisonService } from "../../application/comparison/ProductComparisonService.js";
import { ProductComparisonResolver } from "./ProductComparisonResolvers.js";

@SubgraphReference()
export class ProductResolver extends CatalogType<string, Product> {
  readonly __typename = "Product";

  async $preload() {
    const value = await this.$ctx.loaders.product.load(this.$props);
    if (!isPublishedProduct(value)) {
      throw new PreloadNotFoundError("Published product not found");
    }
    return value;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Product);
  }

  handle() {
    return this.$get("handle");
  }

  async title() {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props,
    );
    return translation?.name ?? (await this.$get("handle")) ?? "";
  }

  async description() {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props,
    );
    return toRichTextValue(
      translation && {
        text: translation.descriptionText,
        html: translation.descriptionHtml,
        json: translation.descriptionJson,
      },
    );
  }

  async excerpt() {
    const translation = await this.$ctx.loaders.productTranslation.load(
      this.$props,
    );
    return toRichTextValue(
      translation && {
        text: translation.excerptText,
        html: translation.excerptHtml,
        json: translation.excerptJson,
      },
    );
  }

  async seo() {
    const value = await this.$ctx.loaders.productSeo.load(this.$props);
    return this.resolvers.seo(value ?? emptySeo());
  }

  async vendor() {
    const id = await this.$get("vendorId");
    return id ? this.resolvers.vendor(id) : null;
  }

  async tags() {
    const ids = await this.$ctx.loaders.productTagIds.load(this.$props);
    return Promise.all(ids.map((id) => this.resolvers.tag(id)));
  }

  async primaryCategory() {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props,
    );
    const primary = links.find((link) => link.isPrimary);
    if (!primary) return null;
    const value = await this.$ctx.loaders.category.load(primary.categoryId);
    return value && isPublishedAt(value.publishedAt)
      ? this.resolvers.category(value.id)
      : null;
  }

  async categories(args: ProductCategoriesArgs) {
    const ids = await this.$ctx.loaders.productCategoryIds.load(this.$props);
    return this.resolvers.categoryConnection({ ...args, categoryIds: ids });
  }

  async options() {
    const ids = await this.$ctx.loaders.productOptionIds.load(this.$props);
    return Promise.all(ids.map((id) => this.resolvers.productOption(id)));
  }

  async features() {
    const values = await this.productFeatures();
    return Promise.all(
      values
        .filter((value) => !value.isGroup)
        .map((value) => this.resolvers.productFeature(value.id)),
    );
  }

  async featureGroups() {
    const values = await this.productFeatures();
    return Promise.all(
      values
        .filter((value) => value.isGroup)
        .map((value) => this.resolvers.productFeatureGroup(value.id)),
    );
  }

  media(args: ProductMediaArgs) {
    return this.resolvers.mediaConnection({
      ...args,
      ownerId: this.$props,
      ownerType: "product",
    });
  }

  async featuredMedia() {
    const rows = await this.$ctx.loaders.productMedia.load(this.$props);
    return rows[0] ? mediaReference(rows[0].fileId) : null;
  }

  variants(args: ProductVariantsArgs) {
    return this.resolvers.productVariantConnection({
      ...args,
      productId: this.$props,
    });
  }

  async variantBySelectedOptions(args: ProductVariantBySelectedOptionsArgs) {
    return this.findVariant(args.selectedOptions, true, false);
  }

  async selectedOrFirstAvailableVariant(
    args: ProductSelectedOrFirstAvailableVariantArgs,
  ) {
    return this.findVariant(args.selectedOptions ?? [], false, true);
  }

  async priceRange() {
    const prices = await this.variantPrices();
    if (prices.length === 0) return null;
    const amounts = prices.map((price) => price.amountMinor);
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    return {
      minVariantPrice: minorUnitsToMoney(Math.min(...amounts), currency),
      maxVariantPrice: minorUnitsToMoney(Math.max(...amounts), currency),
    };
  }

  async compareAtPriceRange() {
    const prices = await this.variantPrices();
    const compareAt = prices.flatMap((price) =>
      price.compareAtMinor == null ? [] : [price.compareAtMinor],
    );
    if (compareAt.length === 0) return null;
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    return {
      minVariantPrice: minorUnitsToMoney(Math.min(...compareAt), currency),
      maxVariantPrice: minorUnitsToMoney(Math.max(...compareAt), currency),
    };
  }

  async availableForSale() {
    const variants = await this.variantsWithAvailability();
    return variants.some((value) => value.available);
  }

  async totalInventory() {
    const ids = await this.$ctx.loaders.variantIds.load(this.$props);
    const states = await Promise.all(
      ids.map((id) => inventoryState(this.$ctx, id)),
    );
    const quantities = states.flatMap((state) =>
      state.quantityAvailable == null ? [] : [state.quantityAvailable],
    );
    return quantities.length === 0
      ? null
      : quantities.reduce((sum, value) => sum + value, 0);
  }

  async comparison() {
    const matrix = await new ProductComparisonService(this.$ctx).forProduct(this.$props);
    return matrix ? new ProductComparisonResolver(matrix, this.$ctx) : null;
  }

  publishedAt() {
    return this.$get("publishedAt");
  }

  createdAt() {
    return this.$get("createdAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }

  private async productFeatures() {
    const ids = await this.$ctx.loaders.productFeatureIds.load(this.$props);
    const values = await this.$ctx.loaders.productFeature.loadMany(ids);
    return values
      .filter((value): value is ProductFeature =>
        Boolean(value && !(value instanceof Error)),
      )
      .sort((left, right) => compareIndex(left.index, right.index));
  }

  private async variantPrices() {
    const ids = await this.$ctx.loaders.variantIds.load(this.$props);
    const values = await this.$ctx.loaders.variantPricing.loadMany(ids);
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    const now = Date.now();
    return values.flatMap((prices) =>
      prices instanceof Error
        ? []
        : prices.filter(
            (price) =>
              price.currency === currency &&
              Date.parse(price.effectiveFrom) <= now &&
              (!price.effectiveTo || Date.parse(price.effectiveTo) > now),
          ),
    );
  }

  private async variantsWithAvailability() {
    const ids = await this.$ctx.loaders.variantIds.load(this.$props);
    const prices = await this.$ctx.loaders.variantPricing.loadMany(ids);
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    return Promise.all(
      ids.map(async (id, index) => {
        const variantPrices = prices[index];
        const now = Date.now();
        return {
          id,
          available:
            !(variantPrices instanceof Error) &&
            variantPrices.some(
              (price) =>
                price.currency === currency &&
                Date.parse(price.effectiveFrom) <= now &&
                (!price.effectiveTo || Date.parse(price.effectiveTo) > now),
            ) &&
            (await inventoryState(this.$ctx, id)).availableForSale,
        };
      }),
    );
  }

  private async findVariant(
    selectedOptions: SelectedOptionInput[],
    requireExact: boolean,
    requireAvailable: boolean,
  ) {
    const ids = await this.$ctx.loaders.variantIds.load(this.$props);
    const variants = await this.$ctx.loaders.variant.loadMany(ids);
    const candidates = variants.flatMap((variant, index) =>
      variant instanceof Error || !variant ? [] : [{ id: ids[index]!, variant }],
    );
    candidates.sort((left, right) =>
      left.variant.isDefault === right.variant.isDefault
        ? left.variant.createdAt.localeCompare(right.variant.createdAt)
        : left.variant.isDefault
          ? -1
          : 1,
    );

    for (const candidate of candidates) {
      const links = await this.$ctx.loaders.variantSelectedOptions.load(
        candidate.id,
      );
      const pairs = await Promise.all(
        links.flatMap((link) =>
          link.optionValueId
            ? [
                Promise.all([
                  this.$ctx.loaders.productOption.load(link.optionId),
                  this.$ctx.loaders.optionValue.load(link.optionValueId),
                ]),
              ]
            : [],
        ),
      );
      const matches = selectedOptions.every((selected) =>
        pairs.some(
          ([option, value]) =>
            option?.slug === selected.option && value?.slug === selected.value,
        ),
      );
      if (!matches || (requireExact && selectedOptions.length !== pairs.length)) {
        continue;
      }
      if (requireAvailable) {
        const [prices, stock] = await Promise.all([
          this.$ctx.loaders.variantPricing.load(candidate.id),
          inventoryState(this.$ctx, candidate.id),
        ]);
        const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
        const now = Date.now();
        if (
          !prices.some(
            (price) =>
              price.currency === currency &&
              Date.parse(price.effectiveFrom) <= now &&
              (!price.effectiveTo || Date.parse(price.effectiveTo) > now),
          ) ||
          !stock.availableForSale
        ) {
          continue;
        }
      }
      return this.resolvers.productVariant(candidate.id);
    }
    return null;
  }
}

function compareIndex(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? -1) - (right[index] ?? -1);
    if (difference !== 0) return difference;
  }
  return 0;
}
