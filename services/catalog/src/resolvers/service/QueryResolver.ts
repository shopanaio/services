import { ServiceType } from "./ServiceType.js";
import type { ProductConnectionInput } from "../../repositories/product/ProductRepository.js";

export type ServiceQueryProductsArgs = Omit<
  ProductConnectionInput,
  "orderBy" | "meta"
>;

export class ServiceQueryResolver extends ServiceType<Record<string, never>> {
  protected $preload(): Record<string, never> {
    return this.$props;
  }

  products(args: ServiceQueryProductsArgs) {
    return this.resolvers.productConnection(args);
  }
}
