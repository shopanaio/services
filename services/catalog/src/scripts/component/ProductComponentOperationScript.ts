import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type {
  ProductComponentDependencyRulesSyncParams,
  ProductComponentGroupsSyncParams,
  ProductComponentPriceRuleInput,
  ProductUpdateOperation,
} from "../../workflows/dto/ProductUpdateWorkflowDto.js";
import type { UserError } from "../types/ScriptResult.js";

export type ProductComponentWorkflowOperation = Extract<
  ProductUpdateOperation,
  {
    type:
      | "productComponentSettingsUpdate"
      | "productComponentRemove"
      | "productComponentConfigurationCreate"
      | "productComponentConfigurationUpdate"
      | "productComponentConfigurationDelete"
      | "productComponentGroupsSync"
      | "productComponentPricingTemplatesSync"
      | "productComponentDependencyRulesSync";
  }
>;

export interface ProductComponentOperationResult {
  entityId?: string;
  userErrors: UserError[];
}

export class ProductComponentOperationScript extends BaseScript<
  ProductComponentWorkflowOperation,
  ProductComponentOperationResult
> {
  @Transactional()
  protected async execute(
    operation: ProductComponentWorkflowOperation,
  ): Promise<ProductComponentOperationResult> {
    const product = await this.repository.product.findById(operation.params.productId);
    if (!product) {
      return this.error("Product not found", ["productId"], "NOT_FOUND");
    }

    if (operation.type === "productComponentSettingsUpdate") {
      const component = await this.repository.component.upsertSettings(
        operation.params.productId,
        operation.params.displayStyle,
      );
      this.logger.info(
        { productId: operation.params.productId, componentId: component.id },
        "Product component settings updated",
      );
      return { userErrors: [] };
    }

    if (operation.type === "productComponentRemove") {
      await this.repository.component.removeByProductId(operation.params.productId);
      return { userErrors: [] };
    }

    if (operation.type === "productComponentConfigurationCreate") {
      const configuration = await this.repository.component.createConfiguration(
        operation.params.productId,
        operation.params.name,
      );
      return { entityId: configuration.id, userErrors: [] };
    }

    const ownershipError = await this.validateConfigurationOwnership(
      operation.params.productId,
      operation.params.configurationId,
    );
    if (ownershipError) return { userErrors: [ownershipError] };

    if (operation.type === "productComponentConfigurationUpdate") {
      const configuration = await this.repository.component.updateConfiguration(
        operation.params.configurationId,
        operation.params.name,
      );
      return configuration
        ? { entityId: configuration.id, userErrors: [] }
        : this.error("Product component configuration not found", ["configurationId"], "NOT_FOUND");
    }

    if (operation.type === "productComponentConfigurationDelete") {
      await this.repository.component.deleteConfiguration(operation.params.configurationId);
      return {
        entityId: operation.params.configurationId,
        userErrors: [],
      };
    }

    const validationErrors =
      operation.type === "productComponentGroupsSync"
        ? await this.validateGroups(operation.params)
        : operation.type === "productComponentPricingTemplatesSync"
          ? await this.validatePricingTemplates(operation.params)
          : await this.validateDependencyRules(operation.params);
    if (validationErrors.length > 0) {
      return { userErrors: validationErrors };
    }

    if (operation.type === "productComponentGroupsSync") {
      await this.repository.component.syncGroups(operation.params, this.getLocale());
    } else if (operation.type === "productComponentPricingTemplatesSync") {
      await this.repository.component.syncPricingTemplates(operation.params);
    } else {
      await this.repository.component.syncDependencyRules(operation.params);
    }

    return {
      entityId: operation.params.configurationId,
      userErrors: [],
    };
  }

  private async validateConfigurationOwnership(
    productId: string,
    configurationId: string,
  ): Promise<UserError | null> {
    const [owner, configuration] = await Promise.all([
      this.repository.component.getByProductId(productId),
      this.repository.component.getConfigurationsByIds([configurationId]),
    ]);
    if (!owner || configuration[0]?.componentId !== owner.id) {
      return {
        message: "Product component configuration not found",
        field: ["configurationId"],
        code: "NOT_FOUND",
      };
    }
    return null;
  }

  private async validateGroups(params: ProductComponentGroupsSyncParams): Promise<UserError[]> {
    const errors: UserError[] = [];
    const existingGroups = await this.repository.component.getGroupsByConfigurationIds([
      params.configurationId,
    ]);
    const groupById = new Map(existingGroups.map((group) => [group.id, group]));
    const existingItems = await this.repository.component.getItemsByGroupIds(
      existingGroups.map((group) => group.id),
    );
    const itemById = new Map(existingItems.map((item) => [item.id, item]));
    const existingSelections = await this.repository.component.getOptionSelectionsByItemIds(
      existingItems.map((item) => item.id),
    );
    const selectionById = new Map(existingSelections.map((selection) => [selection.id, selection]));
    const existingValues = await this.repository.component.getOptionValueSelectionsBySelectionIds(
      existingSelections.map((selection) => selection.id),
    );
    const valueById = new Map(existingValues.map((value) => [value.id, value]));
    const templates = await this.repository.component.getPricingTemplatesByConfigurationIds([
      params.configurationId,
    ]);
    const templateIds = new Set(templates.map((template) => template.id));
    const priceRules = await this.repository.component.getPriceRulesByConfigurationIds([
      params.configurationId,
    ]);
    const priceRuleIds = new Set(priceRules.map((rule) => rule.id));
    for (const [groupIndex, group] of params.groups.entries()) {
      const groupPrefix = ["groups", String(groupIndex)];
      if (group.id && !groupById.has(group.id)) {
        errors.push(this.notFound("Group", [...groupPrefix, "id"]));
      }
      if (
        group.minSelection != null &&
        group.maxSelection != null &&
        group.maxSelection < group.minSelection
      ) {
        errors.push({
          message: "Maximum selection cannot be less than minimum selection",
          field: [...groupPrefix, "maxSelection"],
          code: "INVALID_RANGE",
        });
      }
      for (const [itemIndex, item] of group.items.entries()) {
        const itemPrefix = [...groupPrefix, "items", String(itemIndex)];
        if (item.id && (itemById.get(item.id)?.groupId !== group.id || !group.id)) {
          errors.push(this.notFound("Item", [...itemPrefix, "id"]));
        }
        if (item.minQty != null && item.maxQty != null && item.maxQty < item.minQty) {
          errors.push({
            message: "Maximum quantity cannot be less than minimum quantity",
            field: [...itemPrefix, "maxQty"],
            code: "INVALID_RANGE",
          });
        }
        if (
          item.defaultQty != null &&
          ((item.minQty != null && item.defaultQty < item.minQty) ||
            (item.maxQty != null && item.defaultQty > item.maxQty))
        ) {
          errors.push({
            message: "Default quantity must be within the allowed range",
            field: [...itemPrefix, "defaultQty"],
            code: "INVALID_RANGE",
          });
        }
        if (item.pricingTemplateId && !templateIds.has(item.pricingTemplateId)) {
          errors.push(this.notFound("Pricing template", [...itemPrefix, "pricingTemplateId"]));
        }
        if (item.priceRule) {
          errors.push(...this.validatePriceRule(item.priceRule, [...itemPrefix, "priceRule"]));
          if (item.priceRule.id && !priceRuleIds.has(item.priceRule.id)) {
            errors.push(this.notFound("Price rule", [...itemPrefix, "priceRule", "id"]));
          }
        }
        if (item.refProductId) {
          const product = await this.repository.product.findById(item.refProductId);
          if (!product) {
            errors.push(this.notFound("Referenced product", [...itemPrefix, "refProductId"]));
          }
        }
        if (item.refVariantId) {
          const variant = await this.repository.variant.findById(item.refVariantId);
          if (!variant) {
            errors.push(this.notFound("Referenced variant", [...itemPrefix, "refVariantId"]));
          }
        }
        for (const [selectionIndex, selection] of (item.optionSelections ?? []).entries()) {
          const selectionPrefix = [...itemPrefix, "optionSelections", String(selectionIndex)];
          if (selection.id && (selectionById.get(selection.id)?.itemId !== item.id || !item.id)) {
            errors.push(this.notFound("Option selection", [...selectionPrefix, "id"]));
          }
          const referencedOption = await this.repository.option.findById(selection.optionId);
          if (!referencedOption || referencedOption.productId !== item.refProductId) {
            errors.push(
              this.notFound("Referenced product option", [...selectionPrefix, "optionId"]),
            );
          }
          if (selection.parentOptionId) {
            const parentOption = await this.repository.option.findById(selection.parentOptionId);
            if (!parentOption || parentOption.productId !== item.refProductId) {
              errors.push(
                this.notFound("Parent product option", [...selectionPrefix, "parentOptionId"]),
              );
            }
          }
          for (const [valueIndex, value] of selection.values.entries()) {
            if (
              value.id &&
              (valueById.get(value.id)?.optionSelectionId !== selection.id || !selection.id)
            ) {
              errors.push(
                this.notFound("Option value selection", [
                  ...selectionPrefix,
                  "values",
                  String(valueIndex),
                  "id",
                ]),
              );
            }
            if (value.optionValueId) {
              const optionValue = await this.repository.option.findValueById(value.optionValueId);
              if (!optionValue || optionValue.optionId !== selection.optionId) {
                errors.push(
                  this.notFound("Referenced option value", [
                    ...selectionPrefix,
                    "values",
                    String(valueIndex),
                    "optionValueId",
                  ]),
                );
              }
            }
          }
        }
      }
    }
    return errors;
  }

  private async validatePricingTemplates(
    params: Extract<
      ProductComponentWorkflowOperation,
      { type: "productComponentPricingTemplatesSync" }
    >["params"],
  ): Promise<UserError[]> {
    const [existingTemplates, priceRules] = await Promise.all([
      this.repository.component.getPricingTemplatesByConfigurationIds([params.configurationId]),
      this.repository.component.getPriceRulesByConfigurationIds([params.configurationId]),
    ]);
    const templateIds = new Set(existingTemplates.map((template) => template.id));
    const priceRuleIds = new Set(priceRules.map((rule) => rule.id));
    return params.pricingTemplates.flatMap((template, index) => {
      const prefix = ["pricingTemplates", String(index)];
      const errors = this.validatePriceRule(template.priceRule, [...prefix, "priceRule"]);
      if (template.id && !templateIds.has(template.id)) {
        errors.push(this.notFound("Pricing template", [...prefix, "id"]));
      }
      if (template.priceRule.id && !priceRuleIds.has(template.priceRule.id)) {
        errors.push(this.notFound("Price rule", [...prefix, "priceRule", "id"]));
      }
      return errors;
    });
  }

  private async validateDependencyRules(
    params: ProductComponentDependencyRulesSyncParams,
  ): Promise<UserError[]> {
    const errors: UserError[] = [];
    const existingRules = await this.repository.component.getDependencyRulesByConfigurationIds([
      params.configurationId,
    ]);
    const ruleById = new Map(existingRules.map((rule) => [rule.id, rule]));
    const existingGroups = await this.repository.component.getConditionGroupsByRuleIds(
      existingRules.map((rule) => rule.id),
    );
    const groupById = new Map(existingGroups.map((group) => [group.id, group]));
    const existingConditions = await this.repository.component.getConditionsByGroupIds(
      existingGroups.map((group) => group.id),
    );
    const conditionById = new Map(existingConditions.map((condition) => [condition.id, condition]));
    const existingActions = await this.repository.component.getDependencyActionsByRuleIds(
      existingRules.map((rule) => rule.id),
    );
    const actionById = new Map(existingActions.map((action) => [action.id, action]));
    const priceRules = await this.repository.component.getPriceRulesByConfigurationIds([
      params.configurationId,
    ]);
    const priceRuleIds = new Set(priceRules.map((rule) => rule.id));
    const componentGroups = await this.repository.component.getGroupsByConfigurationIds([
      params.configurationId,
    ]);
    const componentGroupIds = new Set(componentGroups.map((group) => group.id));
    const componentItems = await this.repository.component.getItemsByGroupIds(
      componentGroups.map((group) => group.id),
    );
    const componentItemIds = new Set(componentItems.map((item) => item.id));
    const validateTarget = (
      targetType: "ITEM" | "GROUP" | "CONFIGURATION",
      targetId: string,
      field: string[],
    ) => {
      const valid =
        targetType === "ITEM"
          ? Boolean(targetId && componentItemIds.has(targetId))
          : targetType === "GROUP"
            ? Boolean(targetId && componentGroupIds.has(targetId))
            : targetId === params.configurationId;
      if (!valid) {
        errors.push(this.notFound("Dependency target", field));
      }
    };

    for (const [ruleIndex, rule] of params.dependencyRules.entries()) {
      const rulePrefix = ["dependencyRules", String(ruleIndex)];
      if (rule.id && !ruleById.has(rule.id)) {
        errors.push(this.notFound("Dependency rule", [...rulePrefix, "id"]));
      }
      for (const [groupIndex, group] of rule.conditionGroups.entries()) {
        const groupPrefix = [...rulePrefix, "conditionGroups", String(groupIndex)];
        if (group.id && (groupById.get(group.id)?.ruleId !== rule.id || !rule.id)) {
          errors.push(this.notFound("Condition group", [...groupPrefix, "id"]));
        }
        for (const [conditionIndex, condition] of group.conditions.entries()) {
          const prefix = [...groupPrefix, "conditions", String(conditionIndex)];
          if (
            condition.id &&
            (conditionById.get(condition.id)?.groupId !== group.id || !group.id)
          ) {
            errors.push(this.notFound("Condition", [...prefix, "id"]));
          }
          if (condition.category === "NUMERIC" && condition.value == null) {
            errors.push({
              message: "Value is required for numeric conditions",
              field: [...prefix, "value"],
              code: "REQUIRED",
            });
          }
          validateTarget(condition.targetType, condition.targetId, [...prefix, "targetId"]);
        }
      }
      for (const [actionIndex, action] of rule.actions.entries()) {
        const prefix = [...rulePrefix, "actions", String(actionIndex)];
        if (action.id && (actionById.get(action.id)?.ruleId !== rule.id || !rule.id)) {
          errors.push(this.notFound("Dependency action", [...prefix, "id"]));
        }
        validateTarget(action.targetType, action.targetId, [...prefix, "targetId"]);
        if (action.priceRule) {
          errors.push(...this.validatePriceRule(action.priceRule, [...prefix, "priceRule"]));
          if (action.priceRule.id && !priceRuleIds.has(action.priceRule.id)) {
            errors.push(this.notFound("Price rule", [...prefix, "priceRule", "id"]));
          }
        }
        if (action.actionType === "SET_REQUIRED" && action.requiredValue == null) {
          errors.push({
            message: "Required value is required for set required actions",
            field: [...prefix, "requiredValue"],
            code: "REQUIRED",
          });
        }
        if (action.actionType !== "SET_REQUIRED" && action.requiredValue != null) {
          errors.push({
            message: "Required value is only allowed for set required actions",
            field: [...prefix, "requiredValue"],
            code: "FIELD_NOT_ALLOWED",
          });
        }
        if (action.actionType !== "ADJUST_PRICE" && action.priceRule) {
          errors.push({
            message: "Price rule is only allowed for adjust price actions",
            field: [...prefix, "priceRule"],
            code: "FIELD_NOT_ALLOWED",
          });
        }
      }
    }
    return errors;
  }

  private validatePriceRule(rule: ProductComponentPriceRuleInput, field: string[]): UserError[] {
    const errors: UserError[] = [];
    const amounts = rule.amounts ?? [];
    const hasAmounts = amounts.length > 0;
    const hasPercentage = rule.percentageBps != null;
    if (rule.strategy === "ADJUSTMENT" && (!rule.operation || !rule.valueType)) {
      errors.push({
        message: "Adjustment price rules require operation and value type",
        field,
        code: "INVALID_PRICE_RULE",
      });
    }
    const usesAmounts =
      rule.strategy === "OVERRIDE" ||
      (rule.strategy === "ADJUSTMENT" && rule.valueType === "FIXED_AMOUNT");
    if (usesAmounts && amounts.length === 0) {
      errors.push({
        message: "Currency amounts are required for this price rule",
        field: [...field, "amounts"],
        code: "REQUIRED",
      });
    }
    if (!usesAmounts && hasAmounts) {
      errors.push({
        message: "Currency amounts are not allowed for this price rule",
        field: [...field, "amounts"],
        code: "FIELD_NOT_ALLOWED",
      });
    }
    const currencies = new Set<string>();
    for (const [index, amount] of amounts.entries()) {
      if (currencies.has(amount.currency)) {
        errors.push({
          message: "Currency amounts must be unique",
          field: [...field, "amounts", String(index), "currency"],
          code: "DUPLICATE_CURRENCY",
        });
      }
      currencies.add(amount.currency);
      if (!Number.isSafeInteger(amount.amountMinor) || amount.amountMinor <= 0) {
        errors.push({
          message: "Amount must be a positive integer",
          field: [...field, "amounts", String(index), "amountMinor"],
          code: "INVALID_AMOUNT",
        });
      }
    }
    if (
      rule.strategy === "ADJUSTMENT" &&
      rule.valueType === "PERCENTAGE" &&
      (rule.percentageBps == null ||
        !Number.isInteger(rule.percentageBps) ||
        rule.percentageBps < 1 ||
        rule.percentageBps > 10_000)
    ) {
      errors.push({
        message: "Percentage must be between 1 and 10000 basis points",
        field: [...field, "percentageBps"],
        code: "INVALID_PERCENTAGE",
      });
    }
    const usesPercentage = rule.strategy === "ADJUSTMENT" && rule.valueType === "PERCENTAGE";
    if (!usesPercentage && hasPercentage) {
      errors.push({
        message: "Percentage is not allowed for this price rule",
        field: [...field, "percentageBps"],
        code: "FIELD_NOT_ALLOWED",
      });
    }
    if (rule.strategy !== "ADJUSTMENT" && (rule.operation != null || rule.valueType != null)) {
      errors.push({
        message: "Operation and value type are only allowed for adjustment price rules",
        field,
        code: "FIELD_NOT_ALLOWED",
      });
    }
    return errors;
  }

  private notFound(entity: string, field: string[]): UserError {
    return {
      message: `${entity} not found in this product component configuration`,
      field,
      code: "NOT_FOUND",
    };
  }

  private error(message: string, field: string[], code: string): ProductComponentOperationResult {
    return { userErrors: [{ message, field, code }] };
  }

  protected handleError(_error: unknown): ProductComponentOperationResult {
    return {
      userErrors: [
        {
          message: "Failed to update product component",
          code: "INTERNAL_ERROR",
        },
      ],
    };
  }
}
