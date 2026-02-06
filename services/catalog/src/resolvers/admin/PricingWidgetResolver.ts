import { CatalogType } from "./CatalogType.js";
import { VariantPriceResolver } from "./VariantPriceResolver.js";
import type { CurrencyCode, VariantCost } from "./interfaces/index.js";

export interface PricingWidgetInput {
  variantId: string;
  currency: CurrencyCode;
  from?: string | Date;
  to?: string | Date;
  first?: number;
  after?: string;
}

export class PricingWidgetResolver extends CatalogType<PricingWidgetInput> {
  private toDate(value: string | Date | undefined, defaultValue: Date): Date {
    if (!value) return defaultValue;
    return value instanceof Date ? value : new Date(value);
  }

  private getDateRange() {
    const to = this.toDate(this.$props.to, new Date());
    const from = this.toDate(
      this.$props.from,
      new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)
    );
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
    try {
      const services = this.$ctx.kernel.getServices();
      const cost = await services.broker.call<VariantCost | null>("inventory.getVariantCost", {
        projectId: this.$ctx.store.id,
        variantId: this.$props.variantId,
        currency: this.$props.currency,
      });

      return cost;
    } catch {
      return null;
    }
  }

  async history() {
    const services = this.$ctx.kernel.getServices();
    const { from, to } = this.getDateRange();
    const first = this.$props.first ?? 50;

    const result = await services.repository.pricing.getPriceHistory({
      variantId: this.$props.variantId,
      currency: this.$props.currency,
      from,
      to,
      first,
      after: this.$props.after,
    });

    const edges = result.edges.map((edge) => ({
      node: new VariantPriceResolver(edge.node.id, this.$ctx),
      cursor: edge.cursor,
    }));

    return {
      edges,
      pageInfo: result.pageInfo,
      totalCount: result.totalCount ?? edges.length,
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
