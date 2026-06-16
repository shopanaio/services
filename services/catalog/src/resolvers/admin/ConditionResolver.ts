import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { Condition } from "../../repositories/models/index.js";

export class ConditionResolver extends CatalogType<string, Condition> {
  async $preload() {
    const condition = await this.$ctx.loaders.condition.load(this.$props);
    if (!condition) {
      throw new Error(`Condition with ID ${this.$props} not found`);
    }
    return condition;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Condition);
  }

  async groupId() {
    return encodeGlobalIdByType(
      await this.$get("groupId"),
      GlobalIdEntity.ConditionGroup
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
    const targetType = await this.$get("targetType");
    const targetId = await this.$get("targetId");

    // Encode based on target type
    if (targetType === "ITEM") {
      return encodeGlobalIdByType(targetId, GlobalIdEntity.BundleItem);
    } else if (targetType === "GROUP") {
      return encodeGlobalIdByType(targetId, GlobalIdEntity.BundleGroup);
    }
    // BUNDLE type doesn't have a targetId
    return targetId;
  }

  async value() {
    return this.$get("value");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}
