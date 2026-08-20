import type {
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentDependencyRule,
  ApiProductComponentDependencyRuleSyncItemInput,
  ApiProductComponentGroup,
  ApiProductComponentGroupSyncItemInput,
  ApiProductComponentOverridePriceRule,
  ApiProductComponentPriceRule,
  ApiProductComponentPriceRuleInput,
  ApiProductComponentPricingTemplate,
  ApiProductComponentPricingTemplateSyncItemInput,
  CurrencyCode,
} from "@/graphql/types";
import {
  ProductComponentDependencyTargetType,
  ProductComponentItemType,
  ProductComponentPriceStrategy,
} from "@/graphql/types";

const GLOBAL_ID_PREFIX = "Z2lkOi8v";

const persistedId = (id: string | null | undefined): string | undefined => {
  return id?.startsWith(GLOBAL_ID_PREFIX) ? id : undefined;
};

export const toProductComponentPriceRuleInput = (
  rule: ApiProductComponentPriceRule,
  currency: CurrencyCode,
  includeId = true,
): ApiProductComponentPriceRuleInput => {
  const result: ApiProductComponentPriceRuleInput = {
    id: includeId ? persistedId(rule.id) : undefined,
    strategy: rule.strategy,
  };

  if (rule.strategy === ProductComponentPriceStrategy.Adjustment) {
    const adjustment = rule as ApiProductComponentAdjustmentPriceRule;
    result.operation = adjustment.operation;
    result.valueType = adjustment.valueType;
    result.percentageBps = adjustment.percentageBps ?? null;
    result.amounts = adjustment.amounts.map((amount) => ({
      amountMinor: amount.amountMinor,
      currency,
    }));
  }

  if (rule.strategy === ProductComponentPriceStrategy.Override) {
    const override = rule as ApiProductComponentOverridePriceRule;
    result.amounts = override.amounts.map((amount) => ({
      amountMinor: amount.amountMinor,
      currency,
    }));
  }

  return result;
};

export const toProductComponentGroupsInput = (
  groups: ApiProductComponentGroup[],
  currency: CurrencyCode,
): ApiProductComponentGroupSyncItemInput[] =>
  groups.map((group, groupIndex) => {
    const groupId = persistedId(group.id);

    return {
      id: groupId,
      title: group.title,
      minSelection: group.minSelection ?? null,
      maxSelection: group.maxSelection ?? null,
      sortIndex: groupIndex,
      items: group.items.map((item, itemIndex) => {
        const itemId = groupId ? persistedId(item.id) : undefined;

        return {
          id: itemId,
          itemType: item.itemType,
          sortIndex: itemIndex,
          refProductId:
            item.itemType === ProductComponentItemType.Product ? item.refProduct?.id : undefined,
          refVariantId:
            item.itemType === ProductComponentItemType.Variant ? item.refVariant?.id : undefined,
          featuredImageId: item.featuredImage?.id ?? null,
          minQty: item.minQty ?? null,
          maxQty: item.maxQty ?? null,
          defaultQty: item.defaultQty ?? null,
          priceRule:
            !item.pricingTemplate && item.priceRule
              ? toProductComponentPriceRuleInput(item.priceRule, currency, !!itemId)
              : undefined,
          pricingTemplateId: persistedId(item.pricingTemplate?.id),
          optionSelections:
            item.itemType === ProductComponentItemType.Product
              ? item.optionSelections.map((selection, selectionIndex) => {
                  const selectionId = itemId ? persistedId(selection.id) : undefined;

                  return {
                    id: selectionId,
                    optionId: selection.option.id,
                    parentOptionId: selection.parentOption?.id ?? null,
                    sortIndex: selectionIndex,
                    values: selection.values.map((value, valueIndex) => ({
                      id: selectionId ? persistedId(value.id) : undefined,
                      optionValueId: value.optionValue?.id ?? null,
                      value: value.value,
                      status: value.status,
                      sortIndex: valueIndex,
                    })),
                  };
                })
              : undefined,
          title: item.title ?? null,
          visible: item.visible,
          selected: item.selected,
        };
      }),
    };
  });

export const toProductComponentPricingTemplatesInput = (
  templates: ApiProductComponentPricingTemplate[],
  currency: CurrencyCode,
): ApiProductComponentPricingTemplateSyncItemInput[] =>
  templates.map((template, index) => {
    const templateId = persistedId(template.id);
    return {
      id: templateId,
      name: template.name,
      sortIndex: index,
      priceRule: toProductComponentPriceRuleInput(template.priceRule, currency, !!templateId),
    };
  });

export const toProductComponentDependencyRulesInput = (
  rules: ApiProductComponentDependencyRule[],
  configurationId: string,
  currency: CurrencyCode,
): ApiProductComponentDependencyRuleSyncItemInput[] =>
  rules.map((rule) => {
    const ruleId = persistedId(rule.id);

    return {
      id: ruleId,
      name: rule.name,
      enabled: rule.enabled,
      priority: rule.priority,
      logicOperator: rule.logicOperator,
      conditionGroups: rule.conditionGroups.map((group, groupIndex) => {
        const groupId = ruleId ? persistedId(group.id) : undefined;

        return {
          id: groupId,
          logicOperator: group.logicOperator,
          sortIndex: groupIndex,
          conditions: group.conditions.map((condition, conditionIndex) => ({
            id: groupId ? persistedId(condition.id) : undefined,
            category: condition.category,
            subject: condition.subject,
            operator: condition.operator,
            targetType: condition.targetType,
            targetId:
              condition.targetType === ProductComponentDependencyTargetType.Configuration
                ? configurationId
                : condition.targetId,
            value: condition.value ?? null,
            sortIndex: conditionIndex,
          })),
        };
      }),
      actions: rule.actions.map((action, actionIndex) => {
        const actionId = ruleId ? persistedId(action.id) : undefined;

        return {
          id: actionId,
          actionType: action.actionType,
          targetType: action.targetType,
          targetId:
            action.targetType === ProductComponentDependencyTargetType.Configuration
              ? configurationId
              : action.targetId,
          requiredValue: action.requiredValue ?? null,
          priceRule: action.priceRule
            ? toProductComponentPriceRuleInput(action.priceRule, currency, !!actionId)
            : undefined,
          stackable: action.stackable,
          sortIndex: actionIndex,
        };
      }),
    };
  });
