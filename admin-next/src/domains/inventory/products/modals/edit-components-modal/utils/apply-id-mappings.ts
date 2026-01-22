import type { IDependencyRule, IComponentGroup, ComponentItem } from "../types";

/**
 * Apply ID mappings to dependency rules after server save.
 *
 * When saving new items/groups, the server returns a mapping of
 * temporary IDs to real server IDs. This function updates all
 * references in dependency rules to use the new IDs.
 *
 * @param rules - Array of dependency rules to update
 * @param idMappings - Map of temp IDs to real server IDs
 * @returns Updated rules with mapped IDs
 */
export const applyIdMappingsToDependencyRules = (
  rules: IDependencyRule[],
  idMappings: Map<string, string>
): IDependencyRule[] => {
  if (idMappings.size === 0) {
    return rules;
  }

  return rules.map((rule) => ({
    ...rule,
    // Map rule ID if it was a temp ID
    id: idMappings.get(rule.id) ?? rule.id,
    // Map condition target IDs
    conditions: rule.conditions.map((condition) => ({
      ...condition,
      id: idMappings.get(condition.id) ?? condition.id,
      targetId: idMappings.get(condition.targetId) ?? condition.targetId,
    })),
    // Map action target IDs
    actions: rule.actions.map((action) => ({
      ...action,
      id: idMappings.get(action.id) ?? action.id,
      targetId: action.targetId
        ? idMappings.get(action.targetId) ?? action.targetId
        : undefined,
    })),
  }));
};

/**
 * Apply ID mappings to component groups after server save.
 *
 * @param groups - Array of component groups to update
 * @param idMappings - Map of temp IDs to real server IDs
 * @returns Updated groups with mapped IDs
 */
export const applyIdMappingsToGroups = (
  groups: IComponentGroup[],
  idMappings: Map<string, string>
): IComponentGroup[] => {
  if (idMappings.size === 0) {
    return groups;
  }

  return groups.map((group) => ({
    ...group,
    id: idMappings.get(group.id) ?? group.id,
    items: group.items.map((item) => ({
      ...item,
      id: idMappings.get(item.id) ?? item.id,
    })),
  }));
};

/**
 * Check if an ID is a temporary client-generated ID.
 * Temp IDs typically start with prefixes like "grp-", "item-", "rule-", etc.
 * followed by a timestamp.
 *
 * @param id - ID to check
 * @returns True if the ID appears to be a temp ID
 */
export const isTempId = (id: string): boolean => {
  const tempPrefixes = ["grp-", "item-", "rule-", "cond-", "act-", "tpl-", "tier-"];
  return tempPrefixes.some((prefix) => id.startsWith(prefix));
};

/**
 * Extract all temp IDs from rules that need to be mapped.
 *
 * @param rules - Array of dependency rules
 * @returns Set of temp IDs found in rules
 */
export const extractTempIdsFromRules = (
  rules: IDependencyRule[]
): Set<string> => {
  const tempIds = new Set<string>();

  rules.forEach((rule) => {
    if (isTempId(rule.id)) {
      tempIds.add(rule.id);
    }

    rule.conditions.forEach((condition) => {
      if (isTempId(condition.id)) {
        tempIds.add(condition.id);
      }
      if (isTempId(condition.targetId)) {
        tempIds.add(condition.targetId);
      }
    });

    rule.actions.forEach((action) => {
      if (isTempId(action.id)) {
        tempIds.add(action.id);
      }
      if (action.targetId && isTempId(action.targetId)) {
        tempIds.add(action.targetId);
      }
    });
  });

  return tempIds;
};

/**
 * Extract all temp IDs from groups that need to be mapped.
 *
 * @param groups - Array of component groups
 * @returns Set of temp IDs found in groups
 */
export const extractTempIdsFromGroups = (
  groups: IComponentGroup[]
): Set<string> => {
  const tempIds = new Set<string>();

  groups.forEach((group) => {
    if (isTempId(group.id)) {
      tempIds.add(group.id);
    }

    group.items.forEach((item) => {
      if (isTempId(item.id)) {
        tempIds.add(item.id);
      }
    });
  });

  return tempIds;
};

/**
 * Validate that all rule references point to existing items/groups.
 *
 * @param rules - Array of dependency rules to validate
 * @param groups - Array of component groups to check against
 * @returns Object with valid rules and array of validation errors
 */
export const validateRuleReferences = (
  rules: IDependencyRule[],
  groups: IComponentGroup[]
): {
  validRules: IDependencyRule[];
  errors: Array<{ ruleId: string; ruleName: string; message: string }>;
} => {
  const allItemIds = new Set(groups.flatMap((g) => g.items.map((i) => i.id)));
  const allGroupIds = new Set(groups.map((g) => g.id));

  const errors: Array<{ ruleId: string; ruleName: string; message: string }> = [];
  const validRules: IDependencyRule[] = [];

  rules.forEach((rule) => {
    let isValid = true;

    // Check conditions
    rule.conditions.forEach((condition) => {
      if (condition.targetType === "ITEM" && !allItemIds.has(condition.targetId)) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Condition references missing item: ${condition.targetId}`,
        });
        isValid = false;
      }
      if (condition.targetType === "GROUP" && !allGroupIds.has(condition.targetId)) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Condition references missing group: ${condition.targetId}`,
        });
        isValid = false;
      }
    });

    // Check actions
    rule.actions.forEach((action) => {
      if (action.targetType === "ITEM" && action.targetId && !allItemIds.has(action.targetId)) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Action references missing item: ${action.targetId}`,
        });
        isValid = false;
      }
      if (action.targetType === "GROUP" && action.targetId && !allGroupIds.has(action.targetId)) {
        errors.push({
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Action references missing group: ${action.targetId}`,
        });
        isValid = false;
      }
    });

    if (isValid) {
      validRules.push(rule);
    }
  });

  return { validRules, errors };
};
