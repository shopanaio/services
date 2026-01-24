import type {
  ComparisonOperator,
  LogicOperator,
  StateCheckOperator,
  ConditionCategory,
  ConditionSubject,
  DependencyTargetType,
  DependencyActionType,
  DependencyConditionType,
} from "./enums";
import type { BundlePriceType } from "../types";

// ============================================================================
// V2 Conditions (expanded operator system)
// ============================================================================

export interface IStateCheckCondition {
  id: string;
  category: ConditionCategory.STATE_CHECK;
  subject: ConditionSubject;
  operator: StateCheckOperator;
  targetType: DependencyTargetType;
  targetId: string;
  /** For CONTAINS: the item/variant ID to check for */
  containsId?: string;
}

export interface INumericCondition {
  id: string;
  category: ConditionCategory.NUMERIC;
  subject: ConditionSubject;
  operator: ComparisonOperator;
  targetType: DependencyTargetType;
  targetId: string;
  value: number;
  /** Second value for BETWEEN operator */
  valueTo?: number;
  /** List of values for IN_LIST operator */
  valueList?: number[];
}

export type IDependencyConditionV2 = IStateCheckCondition | INumericCondition;

// ============================================================================
// Condition Group (AND/OR logic)
// ============================================================================

export interface IConditionGroup {
  id: string;
  logicOperator: LogicOperator;
  conditions: IDependencyConditionV2[];
}

// ============================================================================
// Action
// ============================================================================

export interface IDependencyAction {
  id: string;
  actionType: DependencyActionType;
  targetType: DependencyTargetType;
  targetId?: string;
  qtyValue?: number;
  priceType?: BundlePriceType;
  priceValue?: number | null;
  exclusiveKey?: string;
  applyTo?: "ITEM" | "BUNDLE_ITEMS_SUBTOTAL";
}

// ============================================================================
// Rule V2 (with AND/OR support)
// ============================================================================

export interface IDependencyRuleV2 {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  logicOperator: LogicOperator;
  conditionGroups: IConditionGroup[];
  actions: IDependencyAction[];
}

// ============================================================================
// Legacy Types (preserved for backward compat)
// ============================================================================

export interface IDependencyCondition {
  id: string;
  conditionType: DependencyConditionType;
  targetType: DependencyTargetType;
  targetId: string;
  value?: number;
}

export interface IDependencyRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: IDependencyCondition[];
  actions: IDependencyAction[];
}

// ============================================================================
// UI Helper Types
// ============================================================================

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface OperatorMetadata {
  label: string;
  symbol: string;
  requiresValue: boolean;
  requiresSecondValue?: boolean;
  requiresValueList?: boolean;
}

export interface ActionMetadata {
  label: string;
  description: string;
  requiresQtyValue?: boolean;
  requiresPriceType?: boolean;
}
