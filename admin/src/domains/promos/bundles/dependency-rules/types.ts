import type {
  ComparisonOperator,
  LogicOperator,
  StateCheckOperator,
  ConditionCategory,
  ConditionSubject,
  DependencyTargetType,
  DependencyActionType,
} from "./enums";
import type { BundlePriceType } from "../types";

// ============================================================================
// Conditions
// ============================================================================

export interface IStateCheckCondition {
  id: string;
  category: ConditionCategory.STATE_CHECK;
  subject: ConditionSubject;
  operator: StateCheckOperator;
  targetType: DependencyTargetType;
  targetId: string;
}

export interface INumericCondition {
  id: string;
  category: ConditionCategory.NUMERIC;
  subject: ConditionSubject;
  operator: ComparisonOperator;
  targetType: DependencyTargetType;
  targetId: string;
  value: number;
}

export type IDependencyCondition = IStateCheckCondition | INumericCondition;

// ============================================================================
// Condition Group (AND/OR logic)
// ============================================================================

export interface IConditionGroup {
  id: string;
  logicOperator: LogicOperator;
  conditions: IDependencyCondition[];
}

// ============================================================================
// Action
// ============================================================================

export interface IDependencyAction {
  id: string;
  actionType: DependencyActionType;
  targetType: DependencyTargetType;
  targetId?: string;

  // For SET_REQUIRED
  requiredValue?: boolean;

  // For ADJUST_PRICE
  priceType?: BundlePriceType;
  priceValue?: number | null;
}

// ============================================================================
// Rule
// ============================================================================

export interface IDependencyRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  logicOperator: LogicOperator;
  conditionGroups: IConditionGroup[];
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
}

export interface ActionMetadata {
  label: string;
  description: string;
  requiresPriceType?: boolean;
}
