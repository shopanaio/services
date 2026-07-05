import type { CatalogProductSeoSnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export type CatalogProductSeoSnapshotInput = {
  productId: string;
  locale: string;
};

export class CatalogProductSeoSnapshotResolver extends ServiceType<
  CatalogProductSeoSnapshotInput,
  CatalogProductSeoSnapshot
> {
  protected async $preload(): Promise<CatalogProductSeoSnapshot> {
    const seoRows = await this.$ctx.loaders.productSeos.load(
      this.$props.productId
    );
    const seo = seoRows.find((item) => item.locale === this.$props.locale);

    return {
      locale: this.$props.locale,
      seoTitle: seo?.seoTitle ?? null,
      seoDescription: seo?.seoDescription ?? null,
    };
  }

  async locale(): Promise<string> {
    return this.$get("locale");
  }

  async seoTitle(): Promise<string | null> {
    return (await this.$get("seoTitle")) ?? null;
  }

  async seoDescription(): Promise<string | null> {
    return (await this.$get("seoDescription")) ?? null;
  }

  async $snapshot() {
    return this.$data;
  }
}
