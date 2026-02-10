import DataLoader from "dataloader";
import type {
  BundleGroup,
  BundleItem,
  BundlePricingTemplate,
  DependencyRule,
  ConditionGroup,
  Condition,
  DependencyAction,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";

export class BundleLoader {
  // BundleGroup loaders
  public readonly bundleGroup: DataLoader<string, BundleGroup | null>;
  public readonly bundleGroupsByProductId: DataLoader<string, BundleGroup[]>;

  // BundleItem loaders
  public readonly bundleItem: DataLoader<string, BundleItem | null>;
  public readonly bundleItemsByGroupId: DataLoader<string, BundleItem[]>;

  // BundlePricingTemplate loaders
  public readonly bundlePricingTemplate: DataLoader<string, BundlePricingTemplate | null>;
  public readonly bundlePricingTemplatesByProductId: DataLoader<string, BundlePricingTemplate[]>;

  // DependencyRule loaders
  public readonly dependencyRule: DataLoader<string, DependencyRule | null>;
  public readonly dependencyRulesByProductId: DataLoader<string, DependencyRule[]>;

  // ConditionGroup loaders
  public readonly conditionGroup: DataLoader<string, ConditionGroup | null>;
  public readonly conditionGroupsByRuleId: DataLoader<string, ConditionGroup[]>;

  // Condition loaders
  public readonly condition: DataLoader<string, Condition | null>;
  public readonly conditionsByGroupId: DataLoader<string, Condition[]>;

  // DependencyAction loaders
  public readonly dependencyAction: DataLoader<string, DependencyAction | null>;
  public readonly dependencyActionsByRuleId: DataLoader<string, DependencyAction[]>;

  constructor(repository: Repository) {
    // BundleGroup loaders
    this.bundleGroup = new DataLoader<string, BundleGroup | null>(async (ids) => {
      const rows = await repository.bundleGroup.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.bundleGroupsByProductId = new DataLoader<string, BundleGroup[]>(
      async (productIds) => {
        const rows = await repository.bundleGroup.findByProductIds([...productIds]);
        return productIds.map((productId) =>
          rows.filter((row) => row.productId === productId)
        );
      }
    );

    // BundleItem loaders
    this.bundleItem = new DataLoader<string, BundleItem | null>(async (ids) => {
      const rows = await repository.bundleItem.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.bundleItemsByGroupId = new DataLoader<string, BundleItem[]>(
      async (groupIds) => {
        const rows = await repository.bundleItem.findByGroupIds(groupIds);
        return groupIds.map((groupId) =>
          rows.filter((row) => row.groupId === groupId)
        );
      }
    );

    // BundlePricingTemplate loaders
    this.bundlePricingTemplate = new DataLoader<string, BundlePricingTemplate | null>(
      async (ids) => {
        const rows = await repository.bundlePricingTemplate.getByIds(ids);
        return ids.map((id) => rows.find((row) => row.id === id) ?? null);
      }
    );

    this.bundlePricingTemplatesByProductId = new DataLoader<string, BundlePricingTemplate[]>(
      async (productIds) => {
        const rows = await repository.bundlePricingTemplate.findByProductIds([...productIds]);
        return productIds.map((productId) =>
          rows.filter((row) => row.productId === productId)
        );
      }
    );

    // DependencyRule loaders
    this.dependencyRule = new DataLoader<string, DependencyRule | null>(async (ids) => {
      const rows = await repository.dependencyRule.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.dependencyRulesByProductId = new DataLoader<string, DependencyRule[]>(
      async (productIds) => {
        const rows = await repository.dependencyRule.findByProductIds([...productIds]);
        return productIds.map((productId) =>
          rows.filter((row) => row.productId === productId)
        );
      }
    );

    // ConditionGroup loaders
    this.conditionGroup = new DataLoader<string, ConditionGroup | null>(async (ids) => {
      const rows = await repository.conditionGroup.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.conditionGroupsByRuleId = new DataLoader<string, ConditionGroup[]>(
      async (ruleIds) => {
        const rows = await repository.conditionGroup.findByRuleIds(ruleIds);
        return ruleIds.map((ruleId) =>
          rows.filter((row) => row.ruleId === ruleId)
        );
      }
    );

    // Condition loaders
    this.condition = new DataLoader<string, Condition | null>(async (ids) => {
      const rows = await repository.condition.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.conditionsByGroupId = new DataLoader<string, Condition[]>(
      async (groupIds) => {
        const rows = await repository.condition.findByGroupIds(groupIds);
        return groupIds.map((groupId) =>
          rows.filter((row) => row.groupId === groupId)
        );
      }
    );

    // DependencyAction loaders
    this.dependencyAction = new DataLoader<string, DependencyAction | null>(async (ids) => {
      const rows = await repository.dependencyAction.getByIds(ids);
      return ids.map((id) => rows.find((row) => row.id === id) ?? null);
    });

    this.dependencyActionsByRuleId = new DataLoader<string, DependencyAction[]>(
      async (ruleIds) => {
        const rows = await repository.dependencyAction.findByRuleIds(ruleIds);
        return ruleIds.map((ruleId) =>
          rows.filter((row) => row.ruleId === ruleId)
        );
      }
    );
  }
}
