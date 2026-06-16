import { BaseScript } from "../../kernel/BaseScript.js";

export interface SyncVariantIndexParams {
  productId: string;
  variantIds?: string[];
}

export interface SyncVariantIndexResult {
  productId: string;
  syncedVariants: string[];
}

export class SyncVariantIndexScript extends BaseScript<
  SyncVariantIndexParams,
  SyncVariantIndexResult
> {
  protected async execute(
    params: SyncVariantIndexParams
  ): Promise<SyncVariantIndexResult> {
    const { productId } = params;
    const requestedVariantIds = params.variantIds ?? [];

    const variants = params.variantIds?.length
      ? await this.repository.variant.getByIds(params.variantIds)
      : await this.repository.variant.getByProductId(productId);

    if (variants.length === 0) {
      await this.repository.variantSearchIndex.deleteByProductId(productId);
      return { productId, syncedVariants: [] };
    }

    const variantIds = variants.map((variant) => variant.id);
    const linksByVariant = await this.repository.option.findVariantLinks(variantIds);

    const optionIds = new Set<string>();
    const optionValueIds = new Set<string>();
    for (const links of linksByVariant.values()) {
      for (const link of links) {
        optionIds.add(link.optionId);
        if (link.optionValueId) {
          optionValueIds.add(link.optionValueId);
        }
      }
    }

    const [options, optionValues] = await Promise.all([
      this.repository.product.getOptionsByIds([...optionIds]),
      this.repository.option.getValuesByIds([...optionValueIds]),
    ]);

    const optionSlugById = new Map(options.map((option) => [option.id, option.slug]));
    const optionValueSlugById = new Map(
      optionValues.map((value) => [value.id, value.slug])
    );

    const currency =
      this.context.currency ?? this.context.store.defaultCurrency ?? "USD";

    const offersResult = (await this.services.broker.call(
      "inventory.getOffers",
      {
        storeId: this.getProjectId(),
        variantIds,
      }
    )) as {
      offers?: Array<{
        variantId: string;
        available?: boolean;
        quantity?: number;
      }>;
    };

    const offerByVariantId = new Map(
      (offersResult.offers ?? []).map((offer) => [offer.variantId, offer])
    );

    const syncedVariants: string[] = [];

    for (const variant of variants) {
      const links = linksByVariant.get(variant.id) ?? [];
      const optionSlugs: string[] = [];

      for (const link of links) {
        if (!link.optionValueId) continue;
        const optionSlug = optionSlugById.get(link.optionId);
        const optionValueSlug = optionValueSlugById.get(link.optionValueId);
        if (!optionSlug || !optionValueSlug) continue;
        optionSlugs.push(`${optionSlug}:${optionValueSlug}`);
      }

      const currentPrice = await this.repository.pricing.getCurrentPrice({
        variantId: variant.id,
        currency: currency as "UAH" | "USD" | "EUR",
      });
      const offer = offerByVariantId.get(variant.id);
      const quantity = offer?.quantity ?? 0;

      await this.repository.variantSearchIndex.upsert({
        variantId: variant.id,
        productId: variant.productId,
        priceCurrency: currency,
        priceMinor: currentPrice?.amountMinor ?? null,
        inStock: Boolean(offer?.available),
        totalStock: quantity,
        optionSlugs,
        createdAt: variant.createdAt,
      });

      syncedVariants.push(variant.id);
    }

    for (const requestedId of requestedVariantIds) {
      if (!syncedVariants.includes(requestedId)) {
        await this.repository.variantSearchIndex.delete(requestedId);
      }
    }

    return { productId, syncedVariants };
  }

  protected handleError(_error: unknown): SyncVariantIndexResult {
    return {
      productId: "",
      syncedVariants: [],
    };
  }
}
