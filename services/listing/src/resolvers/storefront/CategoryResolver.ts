import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CategoryProductsArgs } from "./generated/types.js";
import { ListingType } from "./ListingType.js";
import { categoryProductsInput } from "./ListingQueryTypes.js";

export class CategoryResolver extends ListingType<string> {
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Category);
  }

  products(args: CategoryProductsArgs) {
    return this.resolvers.productConnection(
      categoryProductsInput(this.$props, args)
    );
  }
}
