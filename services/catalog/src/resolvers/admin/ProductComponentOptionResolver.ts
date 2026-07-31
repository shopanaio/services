import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type {
  ComponentItemOptionSelection,
  ComponentItemOptionValueSelection,
} from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { OptionResolver } from "./OptionResolver.js";
import { OptionValueResolver } from "./OptionValueResolver.js";

export class ProductComponentItemOptionSelectionResolver extends CatalogType<
  string,
  ComponentItemOptionSelection
> {
  async $preload() {
    const selection =
      await this.$ctx.loaders.componentOptionSelection.load(this.$props);
    if (!selection) {
      throw new PreloadNotFoundError(
        `Product component option selection with ID ${this.$props} not found`,
      );
    }
    return selection;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentItemOptionSelection,
    );
  }

  async option() {
    return new OptionResolver(await this.$get("refOptionId"), this.$ctx);
  }

  async parentOption() {
    const id = await this.$get("parentOptionId");
    return id ? new OptionResolver(id, this.$ctx) : null;
  }

  async values() {
    const ids =
      await this.$ctx.loaders.componentOptionValueSelectionIdsBySelectionId.load(
        this.$props,
      );
    return ids.map(
      (id: string) =>
        new ProductComponentItemOptionValueSelectionResolver(id, this.$ctx),
    );
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}

export class ProductComponentItemOptionValueSelectionResolver extends CatalogType<
  string,
  ComponentItemOptionValueSelection
> {
  async $preload() {
    const selection =
      await this.$ctx.loaders.componentOptionValueSelection.load(this.$props);
    if (!selection) {
      throw new PreloadNotFoundError(
        `Product component option value selection with ID ${this.$props} not found`,
      );
    }
    return selection;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentItemOptionValueSelection,
    );
  }

  async optionValue() {
    const id = await this.$get("refOptionValueId");
    return id ? new OptionValueResolver(id, this.$ctx) : null;
  }

  async value() {
    return this.$get("value");
  }

  async status() {
    return this.$get("status");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}
