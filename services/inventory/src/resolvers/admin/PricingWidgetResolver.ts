import { InventoryType } from "./InventoryType.js";
import { VariantPriceResolver } from "./VariantPriceResolver.js";
import type { CurrencyCode, VariantCost } from "./interfaces/index.js";

export interface PricingWidgetInput {
  variantId: string;
  currency: CurrencyCode;
  from?: Date;
  to?: Date;
  first?: number;
  after?: string;
}

export class PricingWidgetResolver extends InventoryType<PricingWidgetInput> {
  private getDateRange() {
    const to = this.$props.to ?? new Date();
    const from =
      this.$props.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to };
  }

  async currentPrice() {
    const services = this.$ctx.kernel.getServices();
    const price = await services.repository.pricing.getCurrentPrice({
      variantId: this.$props.variantId,
      currency: this.$props.currency,
    });

    return price ? new VariantPriceResolver(price.id, this.$ctx) : null;
  }

  async currentCostPrice(): Promise<VariantCost | null> {
    const services = this.$ctx.kernel.getServices();
    const cost = await services.repository.cost.getCurrentCost({
      variantId: this.$props.variantId,
      currency: this.$props.currency,
    });

    if (!cost) return null;

    return {
      id: cost.id,
      currency: cost.currency as CurrencyCode,
      unitCostMinor: cost.unitCostMinor,
      effectiveFrom: cost.effectiveFrom,
      effectiveTo: cost.effectiveTo,
      recordedAt: cost.recordedAt,
      isCurrent: cost.effectiveTo === null,
    };
  }

  async history() {
    const services = this.$ctx.kernel.getServices();
    const { from, to } = this.getDateRange();
    const first = this.$props.first ?? 50;

    const prices = await services.repository.pricing.getPriceHistory({
      variantId: this.$props.variantId,
      currency: this.$props.currency,
      from,
      to,
      limit: first + 1,
      after: this.$props.after,
    });

    const hasNextPage = prices.length > first;
    const resultPrices = hasNextPage ? prices.slice(0, first) : prices;

    const edges = resultPrices.map((price) => ({
      node: new VariantPriceResolver(price.id, this.$ctx),
      cursor: Buffer.from(price.id).toString("base64"),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!this.$props.after,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount: resultPrices.length,
    };
  }

  async statistics() {
    const services = this.$ctx.kernel.getServices();
    const { from, to } = this.getDateRange();

    const stats = await services.repository.pricing.getPriceStatistics({
      variantId: this.$props.variantId,
      currency: this.$props.currency,
      from,
      to,
    });

    return (
      stats ?? {
        minPriceMinor: 0,
        maxPriceMinor: 0,
        avgPriceMinor: 0,
        currency: this.$props.currency,
      }
    );
  }
}
