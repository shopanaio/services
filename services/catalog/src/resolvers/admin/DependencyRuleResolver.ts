import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { DependencyRule } from "../../repositories/models/index.js";
import { ConditionGroupResolver } from "./ConditionGroupResolver.js";
import { DependencyActionResolver } from "./DependencyActionResolver.js";

export class DependencyRuleResolver extends CatalogType<string, DependencyRule> {
  async $preload() {
    const rule = await this.$ctx.loaders.dependencyRule.load(this.$props);
    if (!rule) {
      throw new Error(`DependencyRule with ID ${this.$props} not found`);
    }
    return rule;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.DependencyRule);
  }

  async productId() {
    return encodeGlobalIdByType(
      await this.$get("productId"),
      GlobalIdEntity.Product
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
    const groups = await this.$ctx.loaders.conditionGroupsByRuleId.load(
      this.$props
    );
    return groups.map((group) => new ConditionGroupResolver(group.id, this.$ctx));
  }

  async actions() {
    const actions = await this.$ctx.loaders.dependencyActionsByRuleId.load(
      this.$props
    );
    return actions.map(
      (action) => new DependencyActionResolver(action.id, this.$ctx)
    );
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
