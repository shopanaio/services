import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type {
  Condition,
  ConditionGroup,
  DependencyAction,
  DependencyRule,
} from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import { createProductComponentPriceRuleResolver } from "./ProductComponentPriceRuleResolver.js";

function targetEntity(targetType: string) {
  switch (targetType) {
    case "ITEM":
      return GlobalIdEntity.ProductComponentItem;
    case "GROUP":
      return GlobalIdEntity.ProductComponentGroup;
    case "PRODUCT_COMPONENT":
      return GlobalIdEntity.Product;
    default:
      throw new Error(`Unsupported product component target type: ${targetType}`);
  }
}

export class ProductComponentDependencyRuleResolver extends CatalogType<
  string,
  DependencyRule
> {
  async $preload() {
    const rule =
      await this.$ctx.loaders.componentDependencyRule.load(this.$props);
    if (!rule) {
      throw new PreloadNotFoundError(
        `Product component dependency rule with ID ${this.$props} not found`,
      );
    }
    return rule;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentDependencyRule,
    );
  }

  async name() {
    return this.$get("name");
  }

  async enabled() {
    return this.$get("enabled");
  }

  async priority() {
    return this.$get("priority");
  }

  async logicOperator() {
    return this.$get("logicOperator");
  }

  async conditionGroups() {
    const ids =
      await this.$ctx.loaders.componentConditionGroupIdsByRuleId.load(
        this.$props,
      );
    return ids.map(
      (id: string) =>
        new ProductComponentConditionGroupResolver(id, this.$ctx),
    );
  }

  async actions() {
    const ids =
      await this.$ctx.loaders.componentDependencyActionIdsByRuleId.load(
        this.$props,
      );
    return ids.map(
      (id: string) =>
        new ProductComponentDependencyActionResolver(id, this.$ctx),
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}

export class ProductComponentConditionGroupResolver extends CatalogType<
  string,
  ConditionGroup
> {
  async $preload() {
    const group =
      await this.$ctx.loaders.componentConditionGroup.load(this.$props);
    if (!group) {
      throw new PreloadNotFoundError(
        `Product component condition group with ID ${this.$props} not found`,
      );
    }
    return group;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentConditionGroup,
    );
  }

  async logicOperator() {
    return this.$get("logicOperator");
  }

  async conditions() {
    const ids = await this.$ctx.loaders.componentConditionIdsByGroupId.load(
      this.$props,
    );
    return ids.map(
      (id: string) => new ProductComponentConditionResolver(id, this.$ctx),
    );
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}

export class ProductComponentConditionResolver extends CatalogType<
  string,
  Condition
> {
  async $preload() {
    const condition =
      await this.$ctx.loaders.componentCondition.load(this.$props);
    if (!condition) {
      throw new PreloadNotFoundError(
        `Product component condition with ID ${this.$props} not found`,
      );
    }
    return condition;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentCondition,
    );
  }

  async category() {
    return this.$get("category");
  }

  async subject() {
    return this.$get("subject");
  }

  async operator() {
    return this.$get("operator");
  }

  async targetType() {
    return this.$get("targetType");
  }

  async targetId() {
    const [targetType, targetId] = await Promise.all([
      this.$get("targetType"),
      this.$get("targetId"),
    ]);
    return this.encodeId(targetId, targetEntity(targetType));
  }

  async value() {
    return this.$get("value");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}

export class ProductComponentDependencyActionResolver extends CatalogType<
  string,
  DependencyAction
> {
  async $preload() {
    const action =
      await this.$ctx.loaders.componentDependencyAction.load(this.$props);
    if (!action) {
      throw new PreloadNotFoundError(
        `Product component dependency action with ID ${this.$props} not found`,
      );
    }
    return action;
  }

  id() {
    return this.encodeId(
      this.$props,
      GlobalIdEntity.ProductComponentDependencyAction,
    );
  }

  async actionType() {
    return this.$get("actionType");
  }

  async targetType() {
    return this.$get("targetType");
  }

  async targetId() {
    const [targetType, targetId] = await Promise.all([
      this.$get("targetType"),
      this.$get("targetId"),
    ]);
    return targetId
      ? this.encodeId(targetId, targetEntity(targetType))
      : null;
  }

  async requiredValue() {
    return this.$get("requiredValue");
  }

  async priceRule() {
    const id = await this.$get("priceRuleId");
    return id
      ? createProductComponentPriceRuleResolver(id, this.$ctx)
      : null;
  }

  async stackable() {
    return this.$get("stackable");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}
