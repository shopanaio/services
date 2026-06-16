import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { DependencyAction } from "../../repositories/models/index.js";

export class DependencyActionResolver extends CatalogType<
  string,
  DependencyAction
> {
  async $preload() {
    const action = await this.$ctx.loaders.dependencyAction.load(this.$props);
    if (!action) {
      throw new Error(`DependencyAction with ID ${this.$props} not found`);
    }
    return action;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.DependencyAction);
  }

  async ruleId() {
    return encodeGlobalIdByType(
      await this.$get("ruleId"),
      GlobalIdEntity.DependencyRule
    );
  }

  async actionType() {
    return this.$get("actionType");
  }

  async targetType() {
    return this.$get("targetType");
  }

  async targetId() {
    const targetType = await this.$get("targetType");
    const targetId = await this.$get("targetId");

    if (!targetId) return null;

    // Encode based on target type
    if (targetType === "ITEM") {
      return encodeGlobalIdByType(targetId, GlobalIdEntity.BundleItem);
    } else if (targetType === "GROUP") {
      return encodeGlobalIdByType(targetId, GlobalIdEntity.BundleGroup);
    }
    // BUNDLE type doesn't have a targetId
    return targetId;
  }

  async requiredValue() {
    return this.$get("requiredValue");
  }

  async priceType() {
    return this.$get("priceType");
  }

  async priceValue() {
    return this.$get("priceValue");
  }

  async stackable() {
    return this.$get("stackable");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}
