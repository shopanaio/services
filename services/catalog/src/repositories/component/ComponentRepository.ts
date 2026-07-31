import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  notExists,
  notInArray,
} from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import type {
  ProductComponentDependencyRulesSyncParams,
  ProductComponentGroupsSyncParams,
  ProductComponentItemOptionValueSelectionSyncItem,
  ProductComponentPriceRuleInput,
  ProductComponentPricingTemplatesSyncParams,
} from "../../workflows/dto/ProductUpdateWorkflowDto.js";
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
  componentTarget,
  condition,
  conditionGroup,
  dependencyAction,
  dependencyRule,
  productComponentTarget,
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

  async getByProductId(productId: string): Promise<Component | null> {
    const rows = await this.getByProductIds([productId]);
    return rows[0] ?? null;
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

  async getPriceRulesByConfigurationIds(
    configurationIds: readonly string[],
  ): Promise<ComponentPriceRule[]> {
    if (configurationIds.length === 0) return [];
    return this.connection
      .select()
      .from(componentPriceRule)
      .where(
        and(
          eq(componentPriceRule.storeId, this.storeId),
          inArray(
            componentPriceRule.configurationId,
            [...configurationIds],
          ),
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

  async upsertSettings(
    productId: string,
    displayStyle: string,
  ): Promise<Component> {
    const existing = await this.getByProductId(productId);
    if (existing) {
      const rows = await this.connection
        .update(component)
        .set({ displayStyle, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(component.storeId, this.storeId),
            eq(component.id, existing.id),
          ),
        )
        .returning();
      return rows[0];
    }

    const id = await this.generateUuidV7();
    const rows = await this.connection
      .insert(component)
      .values({
        id,
        storeId: this.storeId,
        productId,
        displayStyle,
      })
      .returning();
    return rows[0];
  }

  async removeByProductId(productId: string): Promise<boolean> {
    const owner = await this.getByProductId(productId);
    if (!owner) return false;
    const configurations = await this.getConfigurationsByComponentIds([
      owner.id,
    ]);
    await this.deleteConfigurationGraph(
      configurations.map((configuration) => configuration.id),
    );
    const rows = await this.connection
      .delete(component)
      .where(
        and(
          eq(component.storeId, this.storeId),
          eq(component.productId, productId),
        ),
      )
      .returning({ id: component.id });
    return rows.length > 0;
  }

  async createConfiguration(
    productId: string,
    name: string,
  ): Promise<ComponentConfiguration> {
    const owner = await this.ensureComponent(productId);
    const id = await this.generateUuidV7();
    const rows = await this.connection
      .insert(componentConfiguration)
      .values({
        id,
        storeId: this.storeId,
        componentId: owner.id,
        name,
      })
      .returning();
    await this.connection.insert(componentTarget).values({
      id: productId,
      storeId: this.storeId,
      configurationId: id,
      kind: "PRODUCT_COMPONENT",
      parentId: null,
      parentKind: null,
    });
    await this.connection.insert(productComponentTarget).values({
      id: productId,
      storeId: this.storeId,
      configurationId: id,
      componentId: owner.id,
      kind: "PRODUCT_COMPONENT",
    });
    return rows[0];
  }

  async updateConfiguration(
    configurationId: string,
    name: string,
  ): Promise<ComponentConfiguration | null> {
    const rows = await this.connection
      .update(componentConfiguration)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(componentConfiguration.storeId, this.storeId),
          eq(componentConfiguration.id, configurationId),
        ),
      )
      .returning();
    return rows[0] ?? null;
  }

  async deleteConfiguration(configurationId: string): Promise<boolean> {
    const existing = await this.getConfigurationsByIds([configurationId]);
    if (existing.length === 0) return false;
    await this.deleteConfigurationGraph([configurationId]);
    return true;
  }

  private async deleteConfigurationGraph(
    configurationIds: string[],
  ): Promise<void> {
    if (configurationIds.length === 0) return;
    const [groups, rules, templates] = await Promise.all([
      this.getGroupsByConfigurationIds(configurationIds),
      this.getDependencyRulesByConfigurationIds(configurationIds),
      this.getPricingTemplatesByConfigurationIds(configurationIds),
    ]);
    await this.deleteDependencyRules(rules.map((rule) => rule.id));
    await this.deleteGroups(groups.map((group) => group.id));
    if (templates.length > 0) {
      await this.connection
        .delete(componentPricingTemplate)
        .where(
          and(
            eq(componentPricingTemplate.storeId, this.storeId),
            inArray(componentPricingTemplate.configurationId, configurationIds),
          ),
        );
    }
    await this.connection
      .delete(componentPriceRule)
      .where(
        and(
          eq(componentPriceRule.storeId, this.storeId),
          inArray(componentPriceRule.configurationId, configurationIds),
        ),
      );
    const rows = await this.connection
      .delete(componentConfiguration)
      .where(
        and(
          eq(componentConfiguration.storeId, this.storeId),
          inArray(componentConfiguration.id, configurationIds),
        ),
      )
      .returning();
    if (rows.length !== configurationIds.length) {
      throw new Error("Failed to delete product component configurations");
    }
  }

  async syncGroups(
    params: ProductComponentGroupsSyncParams,
    locale: string,
  ): Promise<void> {
    const existingGroups = await this.getGroupsByConfigurationIds([
      params.configurationId,
    ]);
    const keepGroupIds = params.groups.flatMap((group) =>
      group.id ? [group.id] : [],
    );
    const removedGroups = existingGroups.filter(
      (group) => !keepGroupIds.includes(group.id),
    );
    await this.deleteGroups(removedGroups.map((group) => group.id));

    for (const groupInput of params.groups) {
      const groupId = groupInput.id ?? (await this.generateUuidV7());
      if (groupInput.id) {
        await this.connection
          .update(componentGroup)
          .set({
            sortIndex: groupInput.sortIndex,
            minSelection: groupInput.minSelection,
            maxSelection: groupInput.maxSelection,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(componentGroup.storeId, this.storeId),
              eq(componentGroup.id, groupId),
              eq(componentGroup.configurationId, params.configurationId),
            ),
          );
      } else {
        await this.connection.insert(componentTarget).values({
          id: groupId,
          storeId: this.storeId,
          configurationId: params.configurationId,
          kind: "GROUP",
          parentId: params.productId,
          parentKind: "PRODUCT_COMPONENT",
        });
        await this.connection.insert(componentGroup).values({
          id: groupId,
          storeId: this.storeId,
          configurationId: params.configurationId,
          sortIndex: groupInput.sortIndex,
          minSelection: groupInput.minSelection,
          maxSelection: groupInput.maxSelection,
        });
      }
      await this.connection
        .insert(componentGroupTranslation)
        .values({
          storeId: this.storeId,
          groupId,
          locale:
            locale as (typeof componentGroupTranslation.$inferInsert)["locale"],
          name: groupInput.title,
        })
        .onConflictDoUpdate({
          target: [
            componentGroupTranslation.groupId,
            componentGroupTranslation.locale,
          ],
          set: { name: groupInput.title },
        });

      await this.syncGroupItems(
        params.configurationId,
        groupId,
        groupInput.items,
        locale,
      );
    }
  }

  async syncPricingTemplates(
    params: ProductComponentPricingTemplatesSyncParams,
  ): Promise<void> {
    const existing = await this.getPricingTemplatesByConfigurationIds([
      params.configurationId,
    ]);
    const keepIds = params.pricingTemplates.flatMap((template) =>
      template.id ? [template.id] : [],
    );
    const removed = existing.filter((template) => !keepIds.includes(template.id));
    if (removed.length > 0) {
      await this.connection
        .delete(componentPricingTemplate)
        .where(
          and(
            eq(componentPricingTemplate.storeId, this.storeId),
            inArray(
              componentPricingTemplate.id,
              removed.map((template) => template.id),
            ),
          ),
        );
      await this.deletePriceRules(removed.map((template) => template.priceRuleId));
    }

    for (const input of params.pricingTemplates) {
      const existingTemplate = input.id
        ? existing.find((template) => template.id === input.id)
        : undefined;
      const priceRuleId = await this.upsertPriceRule(
        params.configurationId,
        input.priceRule,
        existingTemplate?.priceRuleId,
      );

      if (input.id) {
        await this.connection
          .update(componentPricingTemplate)
          .set({
            name: input.name,
            priceRuleId,
            sortIndex: input.sortIndex,
          })
          .where(
            and(
              eq(componentPricingTemplate.storeId, this.storeId),
              eq(componentPricingTemplate.id, input.id),
              eq(
                componentPricingTemplate.configurationId,
                params.configurationId,
              ),
            ),
          );
      } else {
        await this.connection.insert(componentPricingTemplate).values({
          id: await this.generateUuidV7(),
          storeId: this.storeId,
          configurationId: params.configurationId,
          name: input.name,
          priceRuleId,
          sortIndex: input.sortIndex,
        });
      }

      if (
        existingTemplate &&
        existingTemplate.priceRuleId !== priceRuleId
      ) {
        await this.deletePriceRules([existingTemplate.priceRuleId]);
      }
    }
  }

  async syncDependencyRules(
    params: ProductComponentDependencyRulesSyncParams,
  ): Promise<void> {
    const existingRules = await this.getDependencyRulesByConfigurationIds([
      params.configurationId,
    ]);
    const keepRuleIds = params.dependencyRules.flatMap((rule) =>
      rule.id ? [rule.id] : [],
    );
    const removedRules = existingRules.filter(
      (rule) => !keepRuleIds.includes(rule.id),
    );
    await this.deleteDependencyRules(removedRules.map((rule) => rule.id));

    for (const ruleInput of params.dependencyRules) {
      const ruleId = ruleInput.id ?? (await this.generateUuidV7());
      if (ruleInput.id) {
        await this.connection
          .update(dependencyRule)
          .set({
            name: ruleInput.name,
            enabled: ruleInput.enabled,
            priority: ruleInput.priority,
            logicOperator: ruleInput.logicOperator,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(dependencyRule.storeId, this.storeId),
              eq(dependencyRule.id, ruleId),
              eq(dependencyRule.configurationId, params.configurationId),
            ),
          );
      } else {
        await this.connection.insert(dependencyRule).values({
          id: ruleId,
          storeId: this.storeId,
          configurationId: params.configurationId,
          name: ruleInput.name,
          enabled: ruleInput.enabled,
          priority: ruleInput.priority,
          logicOperator: ruleInput.logicOperator,
        });
      }

      await this.syncConditionGroups(
        params.configurationId,
        ruleId,
        ruleInput.conditionGroups,
      );
      await this.syncDependencyActions(
        params.configurationId,
        ruleId,
        ruleInput.actions,
      );
    }
  }

  private async ensureComponent(productId: string): Promise<Component> {
    return (await this.getByProductId(productId)) ??
      this.upsertSettings(productId, "ACCORDION");
  }

  private async syncGroupItems(
    configurationId: string,
    groupId: string,
    items: ProductComponentGroupsSyncParams["groups"][number]["items"],
    locale: string,
  ): Promise<void> {
    const existingItems = await this.getItemsByGroupIds([groupId]);
    const keepIds = items.flatMap((item) => (item.id ? [item.id] : []));
    const removedItems = existingItems.filter((item) => !keepIds.includes(item.id));
    await this.deleteItems(removedItems.map((item) => item.id));

    for (const input of items) {
      const existing = input.id
        ? existingItems.find((item) => item.id === input.id)
        : undefined;
      const priceRuleId = input.priceRule
        ? await this.upsertPriceRule(
            configurationId,
            input.priceRule,
            existing?.priceRuleId ?? undefined,
          )
        : null;
      const itemId = input.id ?? (await this.generateUuidV7());
      const values = {
        itemType: input.itemType,
        sortIndex: input.sortIndex,
        refProductId: input.refProductId,
        refVariantId: input.refVariantId,
        featuredImageId: input.featuredImageId,
        minQty: input.minQty,
        maxQty: input.maxQty,
        defaultQty: input.defaultQty,
        priceRuleId,
        pricingTemplateId: input.pricingTemplateId,
        visible: input.visible,
        selected: input.selected,
        updatedAt: new Date().toISOString(),
      };

      if (input.id) {
        await this.connection
          .update(componentItem)
          .set(values)
          .where(
            and(
              eq(componentItem.storeId, this.storeId),
              eq(componentItem.id, itemId),
              eq(componentItem.groupId, groupId),
            ),
          );
      } else {
        await this.connection.insert(componentTarget).values({
          id: itemId,
          storeId: this.storeId,
          configurationId,
          kind: "ITEM",
          parentId: groupId,
          parentKind: "GROUP",
        });
        await this.connection.insert(componentItem).values({
          id: itemId,
          storeId: this.storeId,
          configurationId,
          groupId,
          ...values,
        });
      }

      if (input.title == null) {
        await this.connection
          .delete(componentItemTranslation)
          .where(
            and(
              eq(componentItemTranslation.storeId, this.storeId),
              eq(componentItemTranslation.itemId, itemId),
              eq(componentItemTranslation.locale, locale),
            ),
          );
      } else {
        await this.connection
          .insert(componentItemTranslation)
          .values({
            storeId: this.storeId,
            itemId,
            locale:
              locale as (typeof componentItemTranslation.$inferInsert)["locale"],
            name: input.title,
          })
          .onConflictDoUpdate({
            target: [
              componentItemTranslation.itemId,
              componentItemTranslation.locale,
            ],
            set: { name: input.title },
          });
      }

      await this.syncOptionSelections(itemId, input.optionSelections ?? []);
      if (existing?.priceRuleId && existing.priceRuleId !== priceRuleId) {
        await this.deletePriceRules([existing.priceRuleId]);
      }
    }
  }

  private async syncOptionSelections(
    itemId: string,
    selections: NonNullable<
      ProductComponentGroupsSyncParams["groups"][number]["items"][number]["optionSelections"]
    >,
  ): Promise<void> {
    const keepIds = selections.flatMap((selection) =>
      selection.id ? [selection.id] : [],
    );
    await this.deleteExcept(
      componentItemOptionSelection,
      componentItemOptionSelection.itemId,
      itemId,
      componentItemOptionSelection.id,
      keepIds,
    );

    for (const input of selections) {
      const selectionId = input.id ?? (await this.generateUuidV7());
      if (input.id) {
        await this.connection
          .update(componentItemOptionSelection)
          .set({
            refOptionId: input.optionId,
            parentOptionId: input.parentOptionId,
            sortIndex: input.sortIndex,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(componentItemOptionSelection.storeId, this.storeId),
              eq(componentItemOptionSelection.id, selectionId),
              eq(componentItemOptionSelection.itemId, itemId),
            ),
          );
      } else {
        await this.connection.insert(componentItemOptionSelection).values({
          id: selectionId,
          storeId: this.storeId,
          itemId,
          refOptionId: input.optionId,
          parentOptionId: input.parentOptionId,
          sortIndex: input.sortIndex,
        });
      }
      await this.syncOptionValues(selectionId, input.values);
    }
  }

  private async syncOptionValues(
    selectionId: string,
    values: ProductComponentItemOptionValueSelectionSyncItem[],
  ): Promise<void> {
    const keepIds = values.flatMap((value) => (value.id ? [value.id] : []));
    await this.deleteExcept(
      componentItemOptionValueSelection,
      componentItemOptionValueSelection.optionSelectionId,
      selectionId,
      componentItemOptionValueSelection.id,
      keepIds,
    );
    for (const input of values) {
      if (input.id) {
        await this.connection
          .update(componentItemOptionValueSelection)
          .set({
            refOptionValueId: input.optionValueId,
            value: input.value,
            status: input.status,
            sortIndex: input.sortIndex,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(componentItemOptionValueSelection.storeId, this.storeId),
              eq(componentItemOptionValueSelection.id, input.id),
              eq(
                componentItemOptionValueSelection.optionSelectionId,
                selectionId,
              ),
            ),
          );
      } else {
        await this.connection.insert(componentItemOptionValueSelection).values({
          id: await this.generateUuidV7(),
          storeId: this.storeId,
          optionSelectionId: selectionId,
          refOptionValueId: input.optionValueId,
          value: input.value,
          status: input.status,
          sortIndex: input.sortIndex,
        });
      }
    }
  }

  private async upsertPriceRule(
    configurationId: string,
    input: ProductComponentPriceRuleInput,
    fallbackId?: string,
  ): Promise<string> {
    const id = input.id ?? fallbackId ?? (await this.generateUuidV7());
    const ruleValues = {
      strategy: input.strategy,
      operation: input.operation,
      valueType: input.valueType,
    };
    if (input.id || fallbackId) {
      await this.connection
        .update(componentPriceRule)
        .set(ruleValues)
        .where(
          and(
            eq(componentPriceRule.storeId, this.storeId),
            eq(componentPriceRule.id, id),
            eq(componentPriceRule.configurationId, configurationId),
          ),
        );
    } else {
      await this.connection.insert(componentPriceRule).values({
        id,
        storeId: this.storeId,
        configurationId,
        ...ruleValues,
      });
    }

    await this.connection
      .delete(componentPriceRuleAmount)
      .where(
        and(
          eq(componentPriceRuleAmount.storeId, this.storeId),
          eq(componentPriceRuleAmount.priceRuleId, id),
        ),
      );
    await this.connection
      .delete(componentPriceRulePercent)
      .where(
        and(
          eq(componentPriceRulePercent.storeId, this.storeId),
          eq(componentPriceRulePercent.priceRuleId, id),
        ),
      );
    if (input.amounts && input.amounts.length > 0) {
      await this.connection.insert(componentPriceRuleAmount).values(
        input.amounts.map((amount) => ({
          storeId: this.storeId,
          priceRuleId: id,
          currency:
            amount.currency as (typeof componentPriceRuleAmount.$inferInsert)["currency"],
          amountMinor: amount.amountMinor,
        })),
      );
    }
    if (input.percentageBps != null) {
      await this.connection.insert(componentPriceRulePercent).values({
        storeId: this.storeId,
        priceRuleId: id,
        percentageBps: input.percentageBps,
      });
    }
    return id;
  }

  private async syncConditionGroups(
    configurationId: string,
    ruleId: string,
    groups: ProductComponentDependencyRulesSyncParams["dependencyRules"][number]["conditionGroups"],
  ): Promise<void> {
    const keepIds = groups.flatMap((group) => (group.id ? [group.id] : []));
    await this.deleteExcept(
      conditionGroup,
      conditionGroup.ruleId,
      ruleId,
      conditionGroup.id,
      keepIds,
    );
    for (const input of groups) {
      const groupId = input.id ?? (await this.generateUuidV7());
      if (input.id) {
        await this.connection
          .update(conditionGroup)
          .set({
            logicOperator: input.logicOperator,
            sortIndex: input.sortIndex,
          })
          .where(
            and(
              eq(conditionGroup.storeId, this.storeId),
              eq(conditionGroup.id, groupId),
              eq(conditionGroup.ruleId, ruleId),
            ),
          );
      } else {
        await this.connection.insert(conditionGroup).values({
          id: groupId,
          storeId: this.storeId,
          configurationId,
          ruleId,
          logicOperator: input.logicOperator,
          sortIndex: input.sortIndex,
        });
      }
      await this.syncConditions(configurationId, groupId, input.conditions);
    }
  }

  private async syncConditions(
    configurationId: string,
    groupId: string,
    conditions: ProductComponentDependencyRulesSyncParams["dependencyRules"][number]["conditionGroups"][number]["conditions"],
  ): Promise<void> {
    const keepIds = conditions.flatMap((item) => (item.id ? [item.id] : []));
    await this.deleteExcept(
      condition,
      condition.groupId,
      groupId,
      condition.id,
      keepIds,
    );
    for (const input of conditions) {
      const values = {
        category: input.category,
        subject: input.subject,
        operator: input.operator,
        targetType: input.targetType,
        targetId: input.targetId,
        value: input.value,
        sortIndex: input.sortIndex,
      };
      if (input.id) {
        await this.connection
          .update(condition)
          .set(values)
          .where(
            and(
              eq(condition.storeId, this.storeId),
              eq(condition.configurationId, configurationId),
              eq(condition.id, input.id),
              eq(condition.groupId, groupId),
            ),
          );
      } else {
        await this.connection.insert(condition).values({
          id: await this.generateUuidV7(),
          storeId: this.storeId,
          configurationId,
          groupId,
          ...values,
        });
      }
    }
  }

  private async syncDependencyActions(
    configurationId: string,
    ruleId: string,
    actions: ProductComponentDependencyRulesSyncParams["dependencyRules"][number]["actions"],
  ): Promise<void> {
    const existing = await this.getDependencyActionsByRuleIds([ruleId]);
    const keepIds = actions.flatMap((action) => (action.id ? [action.id] : []));
    const removed = existing.filter((action) => !keepIds.includes(action.id));
    if (removed.length > 0) {
      await this.connection
        .delete(dependencyAction)
        .where(
          and(
            eq(dependencyAction.storeId, this.storeId),
            inArray(
              dependencyAction.id,
              removed.map((action) => action.id),
            ),
          ),
        );
      await this.deletePriceRules(
        removed.flatMap((action) =>
          action.priceRuleId ? [action.priceRuleId] : [],
        ),
      );
    }

    for (const input of actions) {
      const existingAction = input.id
        ? existing.find((action) => action.id === input.id)
        : undefined;
      const priceRuleId = input.priceRule
        ? await this.upsertPriceRule(
            configurationId,
            input.priceRule,
            existingAction?.priceRuleId ?? undefined,
          )
        : null;
      const values = {
        actionType: input.actionType,
        targetType: input.targetType,
        targetId: input.targetId,
        requiredValue: input.requiredValue,
        priceRuleId,
        stackable: input.stackable,
        sortIndex: input.sortIndex,
      };
      if (input.id) {
        await this.connection
          .update(dependencyAction)
          .set(values)
          .where(
            and(
              eq(dependencyAction.storeId, this.storeId),
              eq(dependencyAction.configurationId, configurationId),
              eq(dependencyAction.id, input.id),
              eq(dependencyAction.ruleId, ruleId),
            ),
          );
      } else {
        await this.connection.insert(dependencyAction).values({
          id: await this.generateUuidV7(),
          storeId: this.storeId,
          configurationId,
          ruleId,
          ...values,
        });
      }
      if (
        existingAction?.priceRuleId &&
        existingAction.priceRuleId !== priceRuleId
      ) {
        await this.deletePriceRules([existingAction.priceRuleId]);
      }
    }
  }

  private async deleteGroups(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const items = await this.getItemsByGroupIds(ids);
    await this.connection
      .delete(componentTarget)
      .where(
        and(
          eq(componentTarget.storeId, this.storeId),
          eq(componentTarget.kind, "GROUP"),
          inArray(componentTarget.id, ids),
        ),
      );
    await this.deletePriceRules(
      items.flatMap((item) => (item.priceRuleId ? [item.priceRuleId] : [])),
    );
  }

  private async deleteItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const items = await this.getItemsByIds(ids);
    await this.connection
      .delete(componentTarget)
      .where(
        and(
          eq(componentTarget.storeId, this.storeId),
          eq(componentTarget.kind, "ITEM"),
          inArray(componentTarget.id, ids),
        ),
      );
    await this.deletePriceRules(
      items.flatMap((item) => (item.priceRuleId ? [item.priceRuleId] : [])),
    );
  }

  private async deleteDependencyRules(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const actions = await this.getDependencyActionsByRuleIds(ids);
    await this.connection
      .delete(dependencyRule)
      .where(
        and(
          eq(dependencyRule.storeId, this.storeId),
          inArray(dependencyRule.id, ids),
        ),
      );
    await this.deletePriceRules(
      actions.flatMap((action) =>
        action.priceRuleId ? [action.priceRuleId] : [],
      ),
    );
  }

  private async deletePriceRules(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return;
    await this.connection
      .delete(componentPriceRule)
      .where(
        and(
          eq(componentPriceRule.storeId, this.storeId),
          inArray(componentPriceRule.id, uniqueIds),
          notExists(
            this.connection
              .select({ id: componentItem.id })
              .from(componentItem)
              .where(eq(componentItem.priceRuleId, componentPriceRule.id)),
          ),
          notExists(
            this.connection
              .select({ id: componentPricingTemplate.id })
              .from(componentPricingTemplate)
              .where(
                eq(
                  componentPricingTemplate.priceRuleId,
                  componentPriceRule.id,
                ),
              ),
          ),
          notExists(
            this.connection
              .select({ id: dependencyAction.id })
              .from(dependencyAction)
              .where(
                eq(dependencyAction.priceRuleId, componentPriceRule.id),
              ),
          ),
        ),
      );
  }

  private async deleteExcept(
    table: any,
    parentColumn: any,
    parentId: string,
    idColumn: any,
    keepIds: string[],
  ): Promise<void> {
    const filters = [
      eq(table.storeId, this.storeId),
      eq(parentColumn, parentId),
    ];
    if (keepIds.length > 0) filters.push(notInArray(idColumn, keepIds));
    await this.connection
      .delete(table)
      .where(and(...filters));
  }
}
