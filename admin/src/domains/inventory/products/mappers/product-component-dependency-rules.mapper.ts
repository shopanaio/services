import type {
  ApiProductComponentConditionGroup,
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentDependencyAction,
  ApiProductComponentDependencyRule,
  ApiProductComponentDependencyRuleSyncItemInput,
  ApiProductComponentPriceRule,
  ApiProductComponentPriceRuleInput,
  ApiProductComponentOverridePriceRule,
} from "@/graphql/types";
import type { ProductComponentLogicOperator } from "@/graphql/types";

export interface ProductComponentDependencyRuleDraft {
  id?: string;
  name: string;
  enabled: boolean;
  priority: number;
  logicOperator: ProductComponentLogicOperator;
  conditionGroups: ApiProductComponentConditionGroup[];
  actions: ApiProductComponentDependencyAction[];
}

export function toProductComponentDependencyRuleDraft(
  rule: ApiProductComponentDependencyRule,
): ProductComponentDependencyRuleDraft {
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    priority: rule.priority,
    logicOperator: rule.logicOperator,
    conditionGroups: rule.conditionGroups,
    actions: rule.actions,
  };
}

function toPriceRuleInput(
  rule: ApiProductComponentPriceRule | null | undefined,
): ApiProductComponentPriceRuleInput | null {
  if (!rule) return null;

  if (
    "__typename" in rule &&
    rule.__typename === "ProductComponentAdjustmentPriceRule"
  ) {
    const adjustmentRule =
      rule as ApiProductComponentAdjustmentPriceRule;
    return {
      id: adjustmentRule.id,
      strategy: adjustmentRule.strategy,
      operation: adjustmentRule.operation,
      valueType: adjustmentRule.valueType,
      percentageBps: adjustmentRule.percentageBps,
      amounts: adjustmentRule.amounts.map((amount) => ({
        currency: amount.currency,
        amountMinor: amount.amountMinor,
      })),
    };
  }

  if (
    "__typename" in rule &&
    rule.__typename === "ProductComponentOverridePriceRule"
  ) {
    const overrideRule = rule as ApiProductComponentOverridePriceRule;
    return {
      id: overrideRule.id,
      strategy: overrideRule.strategy,
      amounts: overrideRule.amounts.map((amount) => ({
        currency: amount.currency,
        amountMinor: amount.amountMinor,
      })),
    };
  }

  return {
    id: rule.id,
    strategy: rule.strategy,
  };
}

export function toProductComponentDependencyRuleSyncInput(
  draft: ProductComponentDependencyRuleDraft,
): ApiProductComponentDependencyRuleSyncItemInput {
  return {
    id: draft.id,
    name: draft.name.trim(),
    enabled: draft.enabled,
    priority: draft.priority,
    logicOperator: draft.logicOperator,
    conditionGroups: draft.conditionGroups.map((group) => ({
      id: group.id,
      logicOperator: group.logicOperator,
      sortIndex: group.sortIndex,
      conditions: group.conditions.map((condition) => ({
        id: condition.id,
        category: condition.category,
        subject: condition.subject,
        operator: condition.operator,
        targetType: condition.targetType,
        targetId: condition.targetId,
        value: condition.value,
        sortIndex: condition.sortIndex,
      })),
    })),
    actions: draft.actions.map((action) => ({
      id: action.id,
      actionType: action.actionType,
      targetType: action.targetType,
      targetId: action.targetId,
      requiredValue: action.requiredValue,
      priceRule: toPriceRuleInput(action.priceRule),
      stackable: action.stackable,
      sortIndex: action.sortIndex,
    })),
  };
}
