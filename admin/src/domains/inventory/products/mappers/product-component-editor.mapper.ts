import type {
  ApiProductComponent,
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentDependencyAction,
  ApiProductComponentPriceRule,
} from "@/graphql/types";
import {
  PriceAdjustmentOperation,
  PriceAdjustmentValueType,
  ProductComponentConditionCategory,
  ProductComponentConditionOperator,
  ProductComponentDependencyTargetType,
  ProductComponentPriceStrategy,
} from "@/graphql/types";
import type {
  IBundleConfiguration,
  PricingRuleTemplate,
} from "../components/product-details-card/bundle-ui/types";
import { BundlePriceType } from "../components/product-details-card/bundle-ui/types";
import {
  ComparisonOperator,
  ConditionCategory,
  DependencyTargetType,
  StateCheckOperator,
  type IDependencyAction,
  type IDependencyCondition,
} from "../components/product-details-card/bundle-ui/dependency-rules";

interface EditorPriceRule {
  priceType: BundlePriceType;
  priceValue: number | null;
}

const getRuleAmounts = (
  rule: ApiProductComponentPriceRule,
): Array<{ amountMinor: number }> =>
  "amounts" in rule
    ? (rule.amounts as Array<{ amountMinor: number }>)
    : [];

const toEditorPriceRule = (
  rule: ApiProductComponentPriceRule | null | undefined,
): EditorPriceRule => {
  if (!rule || rule.strategy === ProductComponentPriceStrategy.Base) {
    return { priceType: BundlePriceType.Base, priceValue: null };
  }
  if (rule.strategy === ProductComponentPriceStrategy.Free) {
    return { priceType: BundlePriceType.Free, priceValue: null };
  }
  if (rule.strategy === ProductComponentPriceStrategy.Override) {
    return {
      priceType: BundlePriceType.Fixed,
      priceValue: Number(getRuleAmounts(rule)[0]?.amountMinor ?? 0),
    };
  }

  const adjustmentRule = rule as ApiProductComponentAdjustmentPriceRule;
  if (adjustmentRule.valueType === PriceAdjustmentValueType.Percentage) {
    return {
      priceType:
        adjustmentRule.operation === PriceAdjustmentOperation.Decrease
          ? BundlePriceType.DiscountPercent
          : BundlePriceType.MarkupPercent,
      priceValue: Number(adjustmentRule.percentageBps ?? 0) / 100,
    };
  }

  const amount = Number(getRuleAmounts(rule)[0]?.amountMinor ?? 0);
  return {
    priceType:
      adjustmentRule.operation === PriceAdjustmentOperation.Decrease
        ? BundlePriceType.DiscountFixed
        : BundlePriceType.MarkupFixed,
    priceValue: amount,
  };
};

const toEditorTargetType = (
  targetType: ProductComponentDependencyTargetType,
): DependencyTargetType => {
  if (targetType === ProductComponentDependencyTargetType.Item) {
    return DependencyTargetType.ITEM;
  }
  if (targetType === ProductComponentDependencyTargetType.Group) {
    return DependencyTargetType.GROUP;
  }
  return DependencyTargetType.BUNDLE;
};

const toEditorCondition = (
  condition: ApiProductComponent["configurations"][number]["dependencyRules"][number]["conditionGroups"][number]["conditions"][number],
): IDependencyCondition => {
  const common = {
    id: condition.id,
    subject: condition.subject,
    targetType: toEditorTargetType(condition.targetType),
    targetId: condition.targetId,
  };

  if (condition.category === ProductComponentConditionCategory.StateCheck) {
    return {
      ...common,
      category: ConditionCategory.STATE_CHECK,
      operator:
        condition.operator === ProductComponentConditionOperator.IsSelected
          ? StateCheckOperator.IS_SELECTED
          : StateCheckOperator.IS_NOT_SELECTED,
    };
  }

  const operator =
    condition.operator === ProductComponentConditionOperator.Gte
      ? ComparisonOperator.GTE
      : condition.operator === ProductComponentConditionOperator.Lte
        ? ComparisonOperator.LTE
        : ComparisonOperator.EQ;

  return {
    ...common,
    category: ConditionCategory.NUMERIC,
    operator,
    value: condition.value ?? 0,
  };
};

const toEditorAction = (
  action: ApiProductComponentDependencyAction,
): IDependencyAction => ({
  id: action.id,
  actionType: action.actionType,
  targetType: toEditorTargetType(action.targetType),
  targetId: action.targetId,
  requiredValue: action.requiredValue ?? undefined,
  ...(action.priceRule ? toEditorPriceRule(action.priceRule) : {}),
});

/**
 * Converts API response objects into mutable state for the existing mock-only
 * component editors. Fields without an editor equivalent are intentionally
 * retained only in the API mock, not invented in the editor model.
 */
export const toProductComponentEditorConfigurations = (
  component: ApiProductComponent,
): IBundleConfiguration[] =>
  component.configurations.map((configuration) => ({
    id: configuration.id,
    title: configuration.name,
    bundleItems: configuration.groups.map((group) => ({
      id: group.id,
      title: group.title,
      sortIndex: group.sortIndex,
      minSelection: group.minSelection ?? null,
      maxSelection: group.maxSelection ?? null,
      items: group.items.map((item) => ({
        id: item.id,
        itemType: item.itemType,
        sortIndex: item.sortIndex,
        assignedProduct: item.refProduct ?? undefined,
        assignedVariant: item.refVariant ?? undefined,
        title: item.title ?? null,
        featuredImage: item.featuredImage ?? null,
        minQty: item.minQty ?? null,
        maxQty: item.maxQty ?? null,
        pricingRule: item.pricingTemplate
          ? ({
              id: item.pricingTemplate.id,
              name: item.pricingTemplate.name,
              ...toEditorPriceRule(item.pricingTemplate.priceRule),
            } satisfies PricingRuleTemplate)
          : toEditorPriceRule(item.priceRule),
        visible: item.visible ? "yes" : "no",
        selected: item.selected ? "yes" : "no",
      })),
    })),
    dependencyRules: configuration.dependencyRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      priority: rule.priority,
      logicOperator: rule.logicOperator,
      conditionGroups: rule.conditionGroups.map((group) => ({
        id: group.id,
        logicOperator: group.logicOperator,
        conditions: group.conditions.map(toEditorCondition),
      })),
      actions: rule.actions.map(toEditorAction),
    })),
  }));

export const toProductComponentEditorPricingTemplates = (
  component: ApiProductComponent,
  configurationId: string,
): PricingRuleTemplate[] =>
  (component.configurations.find(({ id }) => id === configurationId)
    ?.pricingTemplates ?? []
  ).map((template) => ({
    id: template.id,
    name: template.name,
    ...toEditorPriceRule(template.priceRule),
  }));
