import type { ServiceContext } from "../../context/types.js";
import { comparisonPolicy } from "./comparison-policy.js";
import { ProductComparisonMatrixBuilder } from "./ProductComparisonMatrixBuilder.js";

export class ProductComparisonService {
  constructor(private readonly ctx: ServiceContext) {}
  async forProduct(productId: string) {
    const links = await this.ctx.loaders.productCategoryLinksByProductId.load(productId); const primary = links.find((link) => link.isPrimary); if (!primary) return null;
    const effective = await this.ctx.loaders.effectiveComparisonProfileByProduct.load(productId); if (!effective?.profileId || !effective.enabled) return null;
    const candidates = await this.ctx.kernel.repository.comparisonRead.getVisibleCandidates(primary.categoryId); const products = [...new Set(candidates.map((row) => row.productId))]; const profiles = await this.ctx.kernel.repository.comparisonRead.getEffectiveProfilesByProductIds(products); const compatible = new Set(profiles.filter((row) => row.profileId === effective.profileId && row.enabled).map((row) => row.ownerId));
    const saved = this.ctx.customer ? await this.savedVariantIds(this.ctx.customer.id) : new Set<string>();
    const ordered = candidates.filter((row) => compatible.has(row.productId)).sort((left, right) => left.productId === productId && right.productId !== productId ? -1 : right.productId === productId && left.productId !== productId ? 1 : 0);
    const columns = ordered.slice(0, comparisonPolicy.productPageDefaultColumns).map((row, position) => ({ productId: row.productId, variantId: row.variantId, position, savedForComparison: saved.has(row.variantId) }));
    return new ProductComparisonMatrixBuilder(this.ctx.kernel.repository, this.ctx.locale ?? this.ctx.store.defaultLocale, this.ctx.kernel.cache, this.ctx.store.id).build({ profileId: effective.profileId, categoryId: primary.categoryId, columns });
  }
  async build(profileId: string, categoryId: string, columns: Array<{ productId: string; variantId: string; position: number }>, saved = true) { return new ProductComparisonMatrixBuilder(this.ctx.kernel.repository, this.ctx.locale ?? this.ctx.store.defaultLocale, this.ctx.kernel.cache, this.ctx.store.id).build({ profileId, categoryId, columns: columns.map((column) => ({ ...column, savedForComparison: saved })) }); }
  private async savedVariantIds(customerId: string) { const result: any = await this.ctx.kernel.getServices().broker.call("customers.getCustomerComparisonSelection", { storeId: this.ctx.store.id, customerId }); return new Set<string>(result.ok ? result.items.map((item: any) => item.variantId) : []); }
}
