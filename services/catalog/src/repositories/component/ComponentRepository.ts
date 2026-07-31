import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  component,
  componentConfiguration,
  componentConfigurationVariant,
  componentGroup,
  componentGroupTranslation,
  componentItem,
  componentItemOptionSelection,
  componentItemOptionValueSelection,
  componentItemTranslation,
  componentPriceRule,
  componentPriceRuleAmount,
  componentPriceRulePercent,
  componentPricingTemplate,
  condition,
  conditionGroup,
  dependencyAction,
  dependencyRule,
  variant,
  type Component,
  type ComponentConfiguration,
  type ComponentConfigurationVariant,
  type ComponentGroup,
  type ComponentGroupTranslation,
  type ComponentItem,
  type ComponentItemOptionSelection,
  type ComponentItemOptionValueSelection,
  type ComponentItemTranslation,
  type ComponentPriceRule,
  type ComponentPriceRuleAmount,
  type ComponentPriceRulePercent,
  type ComponentPricingTemplate,
  type Condition,
  type ConditionGroup,
  type DependencyAction,
  type DependencyRule,
} from "../models/index.js";

export class ComponentRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  async getByIds(ids: readonly string[]): Promise<Component[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(component)
      .where(
        and(
          eq(component.storeId, this.storeId),
          inArray(component.id, [...ids]),
        ),
      );
  }

  async getByProductIds(productIds: readonly string[]): Promise<Component[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(component)
      .where(
        and(
          eq(component.storeId, this.storeId),
          inArray(component.productId, [...productIds]),
        ),
      );
  }

  async getConfigurationsByIds(
    ids: readonly string[],
  ): Promise<ComponentConfiguration[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentConfiguration)
      .where(
        and(
          eq(componentConfiguration.storeId, this.storeId),
          inArray(componentConfiguration.id, [...ids]),
        ),
      );
  }

  async getConfigurationsByComponentIds(
    componentIds: readonly string[],
  ): Promise<ComponentConfiguration[]> {
    if (componentIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentConfiguration)
      .where(
        and(
          eq(componentConfiguration.storeId, this.storeId),
          inArray(componentConfiguration.componentId, [...componentIds]),
        ),
      )
      .orderBy(
        asc(componentConfiguration.componentId),
        asc(componentConfiguration.createdAt),
        asc(componentConfiguration.id),
      );
  }

  async getConfigurationVariantsByConfigurationIds(
    configurationIds: readonly string[],
  ): Promise<ComponentConfigurationVariant[]> {
    if (configurationIds.length === 0) return [];
    return this.connection
      .select({
        storeId: componentConfigurationVariant.storeId,
        configurationId: componentConfigurationVariant.configurationId,
        variantId: componentConfigurationVariant.variantId,
      })
      .from(componentConfigurationVariant)
      .innerJoin(
        variant,
        and(
          eq(variant.storeId, componentConfigurationVariant.storeId),
          eq(variant.id, componentConfigurationVariant.variantId),
          isNull(variant.deletedAt),
        ),
      )
      .where(
        and(
          eq(componentConfigurationVariant.storeId, this.storeId),
          inArray(
            componentConfigurationVariant.configurationId,
            [...configurationIds],
          ),
        ),
      )
      .orderBy(
        asc(componentConfigurationVariant.configurationId),
        asc(componentConfigurationVariant.variantId),
      );
  }

  async getConfigurationVariantsByVariantIds(
    variantIds: readonly string[],
  ): Promise<ComponentConfigurationVariant[]> {
    if (variantIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentConfigurationVariant)
      .where(
        and(
          eq(componentConfigurationVariant.storeId, this.storeId),
          inArray(componentConfigurationVariant.variantId, [...variantIds]),
        ),
      );
  }

  async getGroupsByIds(ids: readonly string[]): Promise<ComponentGroup[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentGroup)
      .where(
        and(
          eq(componentGroup.storeId, this.storeId),
          inArray(componentGroup.id, [...ids]),
        ),
      );
  }

  async getGroupsByConfigurationIds(
    configurationIds: readonly string[],
  ): Promise<ComponentGroup[]> {
    if (configurationIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentGroup)
      .where(
        and(
          eq(componentGroup.storeId, this.storeId),
          inArray(componentGroup.configurationId, [...configurationIds]),
        ),
      )
      .orderBy(
        asc(componentGroup.configurationId),
        asc(componentGroup.sortIndex),
        asc(componentGroup.id),
      );
  }

  async getGroupTranslationsByGroupIds(
    groupIds: readonly string[],
  ): Promise<ComponentGroupTranslation[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentGroupTranslation)
      .where(
        and(
          eq(componentGroupTranslation.storeId, this.storeId),
          eq(componentGroupTranslation.locale, this.locale),
          inArray(componentGroupTranslation.groupId, [...groupIds]),
        ),
      );
  }

  async getItemsByIds(ids: readonly string[]): Promise<ComponentItem[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentItem)
      .where(
        and(
          eq(componentItem.storeId, this.storeId),
          inArray(componentItem.id, [...ids]),
        ),
      );
  }

  async getItemsByGroupIds(
    groupIds: readonly string[],
  ): Promise<ComponentItem[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentItem)
      .where(
        and(
          eq(componentItem.storeId, this.storeId),
          inArray(componentItem.groupId, [...groupIds]),
        ),
      )
      .orderBy(
        asc(componentItem.groupId),
        asc(componentItem.sortIndex),
        asc(componentItem.id),
      );
  }

  async getItemTranslationsByItemIds(
    itemIds: readonly string[],
  ): Promise<ComponentItemTranslation[]> {
    if (itemIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentItemTranslation)
      .where(
        and(
          eq(componentItemTranslation.storeId, this.storeId),
          eq(componentItemTranslation.locale, this.locale),
          inArray(componentItemTranslation.itemId, [...itemIds]),
        ),
      );
  }

  async getOptionSelectionsByIds(
    ids: readonly string[],
  ): Promise<ComponentItemOptionSelection[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentItemOptionSelection)
      .where(
        and(
          eq(componentItemOptionSelection.storeId, this.storeId),
          inArray(componentItemOptionSelection.id, [...ids]),
        ),
      );
  }

  async getOptionSelectionsByItemIds(
    itemIds: readonly string[],
  ): Promise<ComponentItemOptionSelection[]> {
    if (itemIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentItemOptionSelection)
      .where(
        and(
          eq(componentItemOptionSelection.storeId, this.storeId),
          inArray(componentItemOptionSelection.itemId, [...itemIds]),
        ),
      )
      .orderBy(
        asc(componentItemOptionSelection.itemId),
        asc(componentItemOptionSelection.sortIndex),
        asc(componentItemOptionSelection.id),
      );
  }

  async getOptionValueSelectionsByIds(
    ids: readonly string[],
  ): Promise<ComponentItemOptionValueSelection[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentItemOptionValueSelection)
      .where(
        and(
          eq(componentItemOptionValueSelection.storeId, this.storeId),
          inArray(componentItemOptionValueSelection.id, [...ids]),
        ),
      );
  }

  async getOptionValueSelectionsBySelectionIds(
    selectionIds: readonly string[],
  ): Promise<ComponentItemOptionValueSelection[]> {
    if (selectionIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentItemOptionValueSelection)
      .where(
        and(
          eq(componentItemOptionValueSelection.storeId, this.storeId),
          inArray(
            componentItemOptionValueSelection.optionSelectionId,
            [...selectionIds],
          ),
        ),
      )
      .orderBy(
        asc(componentItemOptionValueSelection.optionSelectionId),
        asc(componentItemOptionValueSelection.sortIndex),
        asc(componentItemOptionValueSelection.id),
      );
  }

  async getPriceRulesByIds(
    ids: readonly string[],
  ): Promise<ComponentPriceRule[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentPriceRule)
      .where(
        and(
          eq(componentPriceRule.storeId, this.storeId),
          inArray(componentPriceRule.id, [...ids]),
        ),
      );
  }

  async getPriceRuleAmountsByPriceRuleIds(
    priceRuleIds: readonly string[],
  ): Promise<ComponentPriceRuleAmount[]> {
    if (priceRuleIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentPriceRuleAmount)
      .where(
        and(
          eq(componentPriceRuleAmount.storeId, this.storeId),
          inArray(componentPriceRuleAmount.priceRuleId, [...priceRuleIds]),
        ),
      )
      .orderBy(
        asc(componentPriceRuleAmount.priceRuleId),
        asc(componentPriceRuleAmount.currency),
      );
  }

  async getPriceRulePercentsByPriceRuleIds(
    priceRuleIds: readonly string[],
  ): Promise<ComponentPriceRulePercent[]> {
    if (priceRuleIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentPriceRulePercent)
      .where(
        and(
          eq(componentPriceRulePercent.storeId, this.storeId),
          inArray(componentPriceRulePercent.priceRuleId, [...priceRuleIds]),
        ),
      );
  }

  async getPricingTemplatesByIds(
    ids: readonly string[],
  ): Promise<ComponentPricingTemplate[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(componentPricingTemplate)
      .where(
        and(
          eq(componentPricingTemplate.storeId, this.storeId),
          inArray(componentPricingTemplate.id, [...ids]),
        ),
      );
  }

  async getPricingTemplatesByConfigurationIds(
    configurationIds: readonly string[],
  ): Promise<ComponentPricingTemplate[]> {
    if (configurationIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentPricingTemplate)
      .where(
        and(
          eq(componentPricingTemplate.storeId, this.storeId),
          inArray(componentPricingTemplate.configurationId, [
            ...configurationIds,
          ]),
        ),
      )
      .orderBy(
        asc(componentPricingTemplate.configurationId),
        asc(componentPricingTemplate.sortIndex),
        asc(componentPricingTemplate.id),
      );
  }

  async getDependencyRulesByIds(
    ids: readonly string[],
  ): Promise<DependencyRule[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyRule)
      .where(
        and(
          eq(dependencyRule.storeId, this.storeId),
          inArray(dependencyRule.id, [...ids]),
        ),
      );
  }

  async getDependencyRulesByConfigurationIds(
    configurationIds: readonly string[],
  ): Promise<DependencyRule[]> {
    if (configurationIds.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyRule)
      .where(
        and(
          eq(dependencyRule.storeId, this.storeId),
          inArray(dependencyRule.configurationId, [...configurationIds]),
        ),
      )
      .orderBy(
        asc(dependencyRule.configurationId),
        asc(dependencyRule.priority),
        asc(dependencyRule.id),
      );
  }

  async getConditionGroupsByIds(
    ids: readonly string[],
  ): Promise<ConditionGroup[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(conditionGroup)
      .where(
        and(
          eq(conditionGroup.storeId, this.storeId),
          inArray(conditionGroup.id, [...ids]),
        ),
      );
  }

  async getConditionGroupsByRuleIds(
    ruleIds: readonly string[],
  ): Promise<ConditionGroup[]> {
    if (ruleIds.length === 0) return [];
    return this.connection
      .select()
      .from(conditionGroup)
      .where(
        and(
          eq(conditionGroup.storeId, this.storeId),
          inArray(conditionGroup.ruleId, [...ruleIds]),
        ),
      )
      .orderBy(
        asc(conditionGroup.ruleId),
        asc(conditionGroup.sortIndex),
        asc(conditionGroup.id),
      );
  }

  async getConditionsByIds(ids: readonly string[]): Promise<Condition[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(condition)
      .where(
        and(
          eq(condition.storeId, this.storeId),
          inArray(condition.id, [...ids]),
        ),
      );
  }

  async getConditionsByGroupIds(
    groupIds: readonly string[],
  ): Promise<Condition[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(condition)
      .where(
        and(
          eq(condition.storeId, this.storeId),
          inArray(condition.groupId, [...groupIds]),
        ),
      )
      .orderBy(
        asc(condition.groupId),
        asc(condition.sortIndex),
        asc(condition.id),
      );
  }

  async getDependencyActionsByIds(
    ids: readonly string[],
  ): Promise<DependencyAction[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyAction)
      .where(
        and(
          eq(dependencyAction.storeId, this.storeId),
          inArray(dependencyAction.id, [...ids]),
        ),
      );
  }

  async getDependencyActionsByRuleIds(
    ruleIds: readonly string[],
  ): Promise<DependencyAction[]> {
    if (ruleIds.length === 0) return [];
    return this.connection
      .select()
      .from(dependencyAction)
      .where(
        and(
          eq(dependencyAction.storeId, this.storeId),
          inArray(dependencyAction.ruleId, [...ruleIds]),
        ),
      )
      .orderBy(
        asc(dependencyAction.ruleId),
        asc(dependencyAction.sortIndex),
        asc(dependencyAction.id),
      );
  }
}
