import type { OptionCategoryRelayInput } from "../../repositories/option-category/OptionCategoryRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export type OptionCategoryConnectionInput = OptionCategoryRelayInput;

export class OptionCategoryConnectionResolver extends BaseConnectionResolver<OptionCategoryRelayInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.optionCategory.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.optionCategory(nodeId);
  }
}
