import type { CheckoutCatalogRow, FlatCheckoutMerchandiseLine } from "./contracts.js";

export type SelectedComponentItem = NonNullable<
  CheckoutCatalogRow["configuration"]
>["items"][number];

export interface ComponentSelectionValidationResult {
  invalidParentLineIds: Set<string>;
  selectedItemsByLineId: Map<string, SelectedComponentItem>;
}

type EffectiveItem = SelectedComponentItem & {
  required: boolean;
  groupRequired: boolean;
};

export function validateComponentSelections(
  flat: readonly FlatCheckoutMerchandiseLine[],
  rows: ReadonlyMap<string, CheckoutCatalogRow>,
): ComponentSelectionValidationResult {
  const invalidParentLineIds = new Set<string>();
  const selectedItemsByLineId = new Map<string, SelectedComponentItem>();
  const childrenByParent = new Map<string, FlatCheckoutMerchandiseLine[]>();
  for (const line of flat) {
    if (line.parentLineId === null) continue;
    const children = childrenByParent.get(line.parentLineId) ?? [];
    children.push(line);
    childrenByParent.set(line.parentLineId, children);
  }

  for (const parent of flat) {
    const children = childrenByParent.get(parent.input.lineId) ?? [];
    const configuration = rows.get(parent.input.variantId)?.configuration ?? null;
    if (!configuration) {
      if (children.length > 0) invalidParentLineIds.add(parent.input.lineId);
      continue;
    }

    const effectiveItems = applyDependencyRules(configuration, children);
    const selected = children.map((child) =>
      effectiveItems.find((item) => item.id === child.input.componentSelection?.componentItemId),
    );
    const selectedItemIds = new Set<string>();

    for (const child of children) {
      const itemId = child.input.componentSelection?.componentItemId;
      if (!itemId || selectedItemIds.has(itemId)) {
        invalidParentLineIds.add(parent.input.lineId);
        continue;
      }
      selectedItemIds.add(itemId);
      const item = effectiveItems.find((candidate) => candidate.id === itemId);
      const childRow = rows.get(child.input.variantId);
      const matchesReference =
        item !== undefined &&
        childRow !== undefined &&
        (item.itemType === "VARIANT"
          ? item.refVariantId === child.input.variantId
          : item.refProductId === childRow.variant.productId);
      const matchesQuantity =
        item !== undefined &&
        (item.minQty === null || child.input.quantity >= item.minQty) &&
        (item.maxQty === null || child.input.quantity <= item.maxQty);

      if (!item || !item.visible || !matchesReference || !matchesQuantity) {
        invalidParentLineIds.add(parent.input.lineId);
      } else {
        selectedItemsByLineId.set(child.input.lineId, item);
      }
    }

    if (effectiveItems.some((item) => item.required && !selectedItemIds.has(item.id))) {
      invalidParentLineIds.add(parent.input.lineId);
    }

    for (const group of configuration.groups) {
      const count = selected.filter((item) => item?.groupId === group.id).length;
      const required = effectiveItems.some(
        (item) => item.groupId === group.id && item.groupRequired,
      );
      if (
        (group.minSelection !== null && count < group.minSelection) ||
        (required && count < 1) ||
        (group.maxSelection !== null && count > group.maxSelection)
      ) {
        invalidParentLineIds.add(parent.input.lineId);
      }
    }
  }

  return { invalidParentLineIds, selectedItemsByLineId };
}

function applyDependencyRules(
  configuration: NonNullable<CheckoutCatalogRow["configuration"]>,
  children: readonly FlatCheckoutMerchandiseLine[],
): EffectiveItem[] {
  const items: EffectiveItem[] = configuration.items.map((item) => ({
    ...item,
    required: false,
    groupRequired: false,
  }));
  const selectedQuantity = new Map(
    children.flatMap((child) =>
      child.input.componentSelection
        ? [[child.input.componentSelection.componentItemId, child.input.quantity] as const]
        : [],
    ),
  );
  const valueFor = (
    condition: NonNullable<
      CheckoutCatalogRow["configuration"]
    >["dependencyRules"][number]["groups"][number]["conditions"][number],
  ) => {
    if (condition.subject === "ITEM_SELECTED" || condition.subject === "ITEM_QTY") {
      return condition.targetType === "ITEM" ? (selectedQuantity.get(condition.targetId) ?? 0) : 0;
    }
    if (condition.subject === "GROUP_TOTAL_QTY") {
      return condition.targetType === "GROUP"
        ? items
            .filter((item) => item.groupId === condition.targetId)
            .reduce((sum, item) => sum + (selectedQuantity.get(item.id) ?? 0), 0)
        : [...selectedQuantity.values()].reduce((sum, value) => sum + value, 0);
    }
    return 0;
  };
  const matchesCondition = (
    condition: NonNullable<
      CheckoutCatalogRow["configuration"]
    >["dependencyRules"][number]["groups"][number]["conditions"][number],
  ) => {
    const value = valueFor(condition);
    if (condition.operator === "IS_SELECTED") return value > 0;
    if (condition.operator === "IS_NOT_SELECTED") return value === 0;
    if (condition.operator === "EQ") return value === condition.value;
    if (condition.operator === "GTE") {
      return condition.value !== null && value >= condition.value;
    }
    return condition.value !== null && value <= condition.value;
  };

  for (const rule of configuration.dependencyRules) {
    const groupResults = rule.groups.map((group) =>
      group.logicOperator === "OR"
        ? group.conditions.some(matchesCondition)
        : group.conditions.every(matchesCondition),
    );
    const matches =
      rule.logicOperator === "OR" ? groupResults.some(Boolean) : groupResults.every(Boolean);
    if (!matches) continue;

    for (const action of rule.actions) {
      const targets =
        action.targetType === "ITEM"
          ? items.filter((item) => item.id === action.targetId)
          : action.targetType === "GROUP"
            ? items.filter((item) => item.groupId === action.targetId)
            : items;
      for (const item of targets) {
        if (action.actionType === "SHOW") item.visible = true;
        else if (action.actionType === "HIDE") item.visible = false;
        else if (action.actionType === "SET_REQUIRED") {
          if (action.targetType === "ITEM") item.required = action.requiredValue === true;
          else item.groupRequired = action.requiredValue === true;
        } else if (action.actionType === "ADJUST_PRICE" && action.rule) {
          item.rule = action.rule;
        }
      }
    }
  }
  return items;
}
