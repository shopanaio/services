import { ServiceType } from "./ServiceType.js";
import type { ProductQueryProductsArgs } from "../admin/ProductConnectionResolver.js";
import { normalizeProductCategoriesScopeInput } from "../admin/filter-normalizers.js";
import { ServiceProductConnectionResolver } from "./ProductConnectionResolver.js";

export type ServiceQueryProductsArgs = ProductQueryProductsArgs;

export class ServiceQueryResolver extends ServiceType<Record<string, never>> {
  products(args: ServiceQueryProductsArgs) {
    return new ServiceProductConnectionResolver(
      {
        ...args,
        meta: {
          categoriesScope: normalizeProductCategoriesScopeInput(
            args.meta?.categoriesScope
          ),
        },
      },
      this.$ctx
    );
  }
}
