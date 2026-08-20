import type { ServiceContext } from "../../context/types.js";
import { comparisonPolicy } from "./comparison-policy.js";
import { ProductComparisonMatrixBuilder } from "./ProductComparisonMatrixBuilder.js";

export class ProductComparisonService {
  constructor(private readonly ctx: ServiceContext) {}
  async forProduct(productId: string) {
    const links = await this.ctx.loaders.productCategoryLinksByProductId.load(productId);
    const primary = links.find((link) => link.isPrimary);
    if (!primary) return null;
    const effective = await this.ctx.loaders.effectiveComparisonProfileByProduct.load(productId);
    if (!effective?.profileId || !effective.enabled) return null;
    const candidates = await this.ctx.kernel.repository.comparisonRead.getVisibleCandidates(
      primary.categoryId,
      productId,
      comparisonPolicy.productPageDefaultColumns,
    );
    if (!candidates.some((candidate) => candidate.productId === productId)) return null;
    const saved = this.ctx.customer
      ? await this.savedVariantIds(this.ctx.customer.id)
      : new Set<string>();
    const columns = candidates.map((row, position) => ({
      productId: row.productId,
      variantId: row.variantId,
      position,
      savedForComparison: saved.has(row.variantId),
    }));
    return new ProductComparisonMatrixBuilder(
      this.ctx.kernel.repository,
      this.ctx.locale ?? this.ctx.store.defaultLocale,
      this.ctx.kernel.cache,
      this.ctx.store.id,
    ).build({ profileId: effective.profileId, categoryId: primary.categoryId, columns });
  }
  async build(
    profileId: string,
    categoryId: string,
    columns: Array<{ productId: string; variantId: string; position: number }>,
    saved = true,
  ) {
    return new ProductComparisonMatrixBuilder(
      this.ctx.kernel.repository,
      this.ctx.locale ?? this.ctx.store.defaultLocale,
      this.ctx.kernel.cache,
      this.ctx.store.id,
    ).build({
      profileId,
      categoryId,
      columns: columns.map((column) => ({ ...column, savedForComparison: saved })),
    });
  }
  private async savedVariantIds(customerId: string) {
    const result: any = await this.ctx.kernel
      .getServices()
      .broker.call("customers.getCustomerComparisonSelection", {
        storeId: this.ctx.store.id,
        customerId,
      });
    return new Set<string>(result.ok ? result.items.map((item: any) => item.variantId) : []);
  }
}
