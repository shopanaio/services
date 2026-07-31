import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { ComponentConfiguration } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

export class ProductComponentConfigurationResolver extends CatalogType<
  string,
  ComponentConfiguration
> {
  async $preload() {
    const configuration =
      await this.$ctx.loaders.componentConfiguration.load(this.$props);
    if (!configuration) {
      throw new PreloadNotFoundError(
        `Product component configuration with ID ${this.$props} not found`,
      );
    }
    return configuration;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentConfiguration,
    );
  }

  async product() {
    const componentId = await this.$get("componentId");
    const component = await this.$ctx.loaders.component.load(componentId);
    if (!component) {
      throw new PreloadNotFoundError(
        `Product component with ID ${componentId} not found`,
      );
    }
    return this.resolvers.product(component.productId);
  }

  async name() {
    return this.$get("name");
  }

  async variants() {
    const ids =
      await this.$ctx.loaders.componentConfigurationVariantIds.load(
        this.$props,
      );
    return Promise.all(
      ids.map((id: string) => this.resolvers.variant(id)),
    );
  }

  async groups() {
    const ids =
      await this.$ctx.loaders.componentGroupIdsByConfigurationId.load(
        this.$props,
      );
    return Promise.all(
      ids.map((id: string) => this.resolvers.productComponentGroup(id)),
    );
  }

  async pricingTemplates() {
    const ids =
      await this.$ctx.loaders.componentPricingTemplateIdsByConfigurationId.load(
        this.$props,
      );
    return Promise.all(
      ids.map((id: string) =>
        this.resolvers.productComponentPricingTemplate(id)
      ),
    );
  }

  async dependencyRules() {
    const ids =
      await this.$ctx.loaders.componentDependencyRuleIdsByConfigurationId.load(
        this.$props,
      );
    return Promise.all(
      ids.map((id: string) =>
        this.resolvers.productComponentDependencyRule(id)
      ),
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
