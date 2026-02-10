import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { ConditionGroup } from "../../repositories/models/index.js";
import { ConditionResolver } from "./ConditionResolver.js";

export class ConditionGroupResolver extends CatalogType<string, ConditionGroup> {
  async $preload() {
    const group = await this.$ctx.loaders.conditionGroup.load(this.$props);
    if (!group) {
      throw new Error(`ConditionGroup with ID ${this.$props} not found`);
    }
    return group;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.ConditionGroup);
  }

  async ruleId() {
    return encodeGlobalIdByType(
      await this.$get("ruleId"),
      GlobalIdEntity.DependencyRule
    );
  }

  async logicOperator() {
    return this.$get("logicOperator");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }

  async conditions() {
    const conditions = await this.$ctx.loaders.conditionsByGroupId.load(
      this.$props
    );
    return conditions.map(
      (condition) => new ConditionResolver(condition.id, this.$ctx)
    );
  }
}
