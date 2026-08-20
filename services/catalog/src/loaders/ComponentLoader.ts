import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

function byId<TEntity extends { id: string }>(
  keys: readonly string[],
  rows: readonly TEntity[],
): Array<TEntity | null> {
  const map = new Map(rows.map((row) => [row.id, row]));
  return keys.map((key) => map.get(key) ?? null);
}

function grouped<TEntity, TKey extends string>(
  keys: readonly TKey[],
  rows: readonly TEntity[],
  getKey: (row: TEntity) => TKey,
): TEntity[][] {
  const map = new Map<TKey, TEntity[]>();
  for (const row of rows) {
    const key = getKey(row);
    const values = map.get(key) ?? [];
    values.push(row);
    map.set(key, values);
  }
  return keys.map((key) => map.get(key) ?? []);
}

export class ComponentLoader {
  public readonly component;
  public readonly componentByProductId;
  public readonly configuration;
  public readonly configurationIdsByComponentId;
  public readonly configurationVariantIds;
  public readonly configurationIdByVariantId;
  public readonly group;
  public readonly groupIdsByConfigurationId;
  public readonly groupTranslation;
  public readonly item;
  public readonly itemIdsByGroupId;
  public readonly itemTranslation;
  public readonly optionSelection;
  public readonly optionSelectionIdsByItemId;
  public readonly optionValueSelection;
  public readonly optionValueSelectionIdsBySelectionId;
  public readonly priceRule;
  public readonly priceRuleAmounts;
  public readonly priceRulePercent;
  public readonly pricingTemplate;
  public readonly pricingTemplateIdsByConfigurationId;
  public readonly dependencyRule;
  public readonly dependencyRuleIdsByConfigurationId;
  public readonly conditionGroup;
  public readonly conditionGroupIdsByRuleId;
  public readonly condition;
  public readonly conditionIdsByGroupId;
  public readonly dependencyAction;
  public readonly dependencyActionIdsByRuleId;

  constructor(repository: Repository) {
    this.component = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getByIds(ids)),
    );

    this.componentByProductId = new DataLoader(async (productIds: readonly string[]) => {
      const rows = await repository.component.getByProductIds(productIds);
      const map = new Map(rows.map((row) => [row.productId, row]));
      return productIds.map((id) => map.get(id) ?? null);
    });

    this.configuration = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getConfigurationsByIds(ids)),
    );

    this.configurationIdsByComponentId = new DataLoader(async (componentIds: readonly string[]) =>
      grouped(
        componentIds,
        await repository.component.getConfigurationsByComponentIds(componentIds),
        (row) => row.componentId,
      ).map((rows) => rows.map((row) => row.id)),
    );

    this.configurationVariantIds = new DataLoader(async (configurationIds: readonly string[]) =>
      grouped(
        configurationIds,
        await repository.component.getConfigurationVariantsByConfigurationIds(configurationIds),
        (row) => row.configurationId,
      ).map((rows) => rows.map((row) => row.variantId)),
    );

    this.configurationIdByVariantId = new DataLoader(async (variantIds: readonly string[]) => {
      const rows = await repository.component.getConfigurationVariantsByVariantIds(variantIds);
      const map = new Map(rows.map((row) => [row.variantId, row.configurationId]));
      return variantIds.map((id) => map.get(id) ?? null);
    });

    this.group = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getGroupsByIds(ids)),
    );

    this.groupIdsByConfigurationId = new DataLoader(async (configurationIds: readonly string[]) =>
      grouped(
        configurationIds,
        await repository.component.getGroupsByConfigurationIds(configurationIds),
        (row) => row.configurationId,
      ).map((rows) => rows.map((row) => row.id)),
    );

    this.groupTranslation = new DataLoader(async (groupIds: readonly string[]) => {
      const rows = await repository.component.getGroupTranslationsByGroupIds(groupIds);
      const map = new Map(rows.map((row) => [row.groupId, row]));
      return groupIds.map((id) => map.get(id) ?? null);
    });

    this.item = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getItemsByIds(ids)),
    );

    this.itemIdsByGroupId = new DataLoader(async (groupIds: readonly string[]) =>
      grouped(
        groupIds,
        await repository.component.getItemsByGroupIds(groupIds),
        (row) => row.groupId,
      ).map((rows) => rows.map((row) => row.id)),
    );

    this.itemTranslation = new DataLoader(async (itemIds: readonly string[]) => {
      const rows = await repository.component.getItemTranslationsByItemIds(itemIds);
      const map = new Map(rows.map((row) => [row.itemId, row]));
      return itemIds.map((id) => map.get(id) ?? null);
    });

    this.optionSelection = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getOptionSelectionsByIds(ids)),
    );

    this.optionSelectionIdsByItemId = new DataLoader(async (itemIds: readonly string[]) =>
      grouped(
        itemIds,
        await repository.component.getOptionSelectionsByItemIds(itemIds),
        (row) => row.itemId,
      ).map((rows) => rows.map((row) => row.id)),
    );

    this.optionValueSelection = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getOptionValueSelectionsByIds(ids)),
    );

    this.optionValueSelectionIdsBySelectionId = new DataLoader(
      async (selectionIds: readonly string[]) =>
        grouped(
          selectionIds,
          await repository.component.getOptionValueSelectionsBySelectionIds(selectionIds),
          (row) => row.optionSelectionId,
        ).map((rows) => rows.map((row) => row.id)),
    );

    this.priceRule = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getPriceRulesByIds(ids)),
    );

    this.priceRuleAmounts = new DataLoader(async (priceRuleIds: readonly string[]) =>
      grouped(
        priceRuleIds,
        await repository.component.getPriceRuleAmountsByPriceRuleIds(priceRuleIds),
        (row) => row.priceRuleId,
      ),
    );

    this.priceRulePercent = new DataLoader(async (priceRuleIds: readonly string[]) => {
      const rows = await repository.component.getPriceRulePercentsByPriceRuleIds(priceRuleIds);
      const map = new Map(rows.map((row) => [row.priceRuleId, row]));
      return priceRuleIds.map((id) => map.get(id) ?? null);
    });

    this.pricingTemplate = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getPricingTemplatesByIds(ids)),
    );

    this.pricingTemplateIdsByConfigurationId = new DataLoader(
      async (configurationIds: readonly string[]) =>
        grouped(
          configurationIds,
          await repository.component.getPricingTemplatesByConfigurationIds(configurationIds),
          (row) => row.configurationId,
        ).map((rows) => rows.map((row) => row.id)),
    );

    this.dependencyRule = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getDependencyRulesByIds(ids)),
    );

    this.dependencyRuleIdsByConfigurationId = new DataLoader(
      async (configurationIds: readonly string[]) =>
        grouped(
          configurationIds,
          await repository.component.getDependencyRulesByConfigurationIds(configurationIds),
          (row) => row.configurationId,
        ).map((rows) => rows.map((row) => row.id)),
    );

    this.conditionGroup = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getConditionGroupsByIds(ids)),
    );

    this.conditionGroupIdsByRuleId = new DataLoader(async (ruleIds: readonly string[]) =>
      grouped(
        ruleIds,
        await repository.component.getConditionGroupsByRuleIds(ruleIds),
        (row) => row.ruleId,
      ).map((rows) => rows.map((row) => row.id)),
    );

    this.condition = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getConditionsByIds(ids)),
    );

    this.conditionIdsByGroupId = new DataLoader(async (groupIds: readonly string[]) =>
      grouped(
        groupIds,
        await repository.component.getConditionsByGroupIds(groupIds),
        (row) => row.groupId,
      ).map((rows) => rows.map((row) => row.id)),
    );

    this.dependencyAction = new DataLoader(async (ids: readonly string[]) =>
      byId(ids, await repository.component.getDependencyActionsByIds(ids)),
    );

    this.dependencyActionIdsByRuleId = new DataLoader(async (ruleIds: readonly string[]) =>
      grouped(
        ruleIds,
        await repository.component.getDependencyActionsByRuleIds(ruleIds),
        (row) => row.ruleId,
      ).map((rows) => rows.map((row) => row.id)),
    );
  }
}
