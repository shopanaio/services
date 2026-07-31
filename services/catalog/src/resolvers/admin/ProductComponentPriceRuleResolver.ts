import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import type {
  ComponentPriceRule,
  ComponentPricingTemplate,
} from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

abstract class ProductComponentPriceRuleResolver extends CatalogType<
  string,
  ComponentPriceRule
> {
  async $preload() {
    const rule = await this.$ctx.loaders.componentPriceRule.load(this.$props);
    if (!rule) {
      throw new PreloadNotFoundError(
        `Product component price rule with ID ${this.$props} not found`,
      );
    }
    return rule;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentPriceRule,
    );
  }

  async strategy() {
    return this.$get("strategy");
  }
}

export class ProductComponentBasePriceRuleResolver extends ProductComponentPriceRuleResolver {}

export class ProductComponentAdjustmentPriceRuleResolver extends ProductComponentPriceRuleResolver {
  async operation() {
    return this.$get("operation");
  }

  async valueType() {
    return this.$get("valueType");
  }

  async amounts() {
    return this.$ctx.loaders.componentPriceRuleAmounts.load(this.$props);
  }

  async percentageBps() {
    const percent =
      await this.$ctx.loaders.componentPriceRulePercent.load(this.$props);
    return percent?.percentageBps ?? null;
  }
}

export class ProductComponentOverridePriceRuleResolver extends ProductComponentPriceRuleResolver {
  async amounts() {
    return this.$ctx.loaders.componentPriceRuleAmounts.load(this.$props);
  }
}

export class ProductComponentFreePriceRuleResolver extends ProductComponentPriceRuleResolver {}

export async function createProductComponentPriceRuleResolver(
  id: string,
  ctx: ServiceContext,
) {
  const rule = await ctx.loaders.componentPriceRule.load(id);
  if (!rule) {
    throw new PreloadNotFoundError(
      `Product component price rule with ID ${id} not found`,
    );
  }

  switch (rule.strategy) {
    case "BASE":
      return new ProductComponentBasePriceRuleResolver(id, ctx);
    case "ADJUSTMENT":
      return new ProductComponentAdjustmentPriceRuleResolver(id, ctx);
    case "OVERRIDE":
      return new ProductComponentOverridePriceRuleResolver(id, ctx);
    case "FREE":
      return new ProductComponentFreePriceRuleResolver(id, ctx);
    default:
      throw new Error(
        `Unsupported product component price strategy: ${rule.strategy}`,
      );
  }
}

export class ProductComponentPricingTemplateResolver extends CatalogType<
  string,
  ComponentPricingTemplate
> {
  async $preload() {
    const template =
      await this.$ctx.loaders.componentPricingTemplate.load(this.$props);
    if (!template) {
      throw new PreloadNotFoundError(
        `Product component pricing template with ID ${this.$props} not found`,
      );
    }
    return template;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentPricingTemplate,
    );
  }

  async name() {
    return this.$get("name");
  }

  async priceRule() {
    return this.resolvers.productComponentPriceRule(
      await this.$get("priceRuleId"),
    );
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}
