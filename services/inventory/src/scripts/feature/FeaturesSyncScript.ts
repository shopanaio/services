import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import type {
  FeatureSyncParams,
  FeatureSyncResult,
  FeatureSyncItemInput,
  FeatureValueSyncInput,
} from "./dto/index.js";
import type { ProductFeature, ProductFeatureValue } from "../../repositories/models/index.js";

const REORDER_SORT_OFFSET = 1000000;
const TEMP_GROUP_SORT_OFFSET = 2000000;

type NormalizedFeatureItem = FeatureSyncItemInput & {
  id?: string;
  isGroup: boolean;
  parentId: string | null;
  inputIndex: number;
};

export class FeaturesSyncScript extends BaseScript<
  FeatureSyncParams,
  FeatureSyncResult
> {
  @Transactional()
  protected async execute(params: FeatureSyncParams): Promise<FeatureSyncResult> {
    const { productId, features } = params;
    const userErrors: UserError[] = [];

    const productExists = await this.repository.product.exists(productId);
    if (!productExists) {
      return {
        product: undefined,
        features: [],
        userErrors: [
          { message: "Product not found", field: ["productId"], code: "NOT_FOUND" },
        ],
      };
    }

    const existingFeatures = await this.repository.feature.findByProductId(productId);
    const existingById = new Map(existingFeatures.map((feature) => [feature.id, feature]));

    const normalizedItems: NormalizedFeatureItem[] = [];
    const inputById = new Map<string, NormalizedFeatureItem>();
    const inputByClientId = new Map<string, NormalizedFeatureItem>();
    const seenIds = new Set<string>();
    const seenClientIds = new Set<string>();
    const seenSlugs = new Set<string>();

    for (const [index, input] of features.entries()) {
      if (input.id) {
        if (seenIds.has(input.id)) {
          userErrors.push({
            message: `Duplicate feature id "${input.id}"`,
            field: ["features", String(index), "id"],
            code: "DUPLICATE_ID",
          });
        } else {
          seenIds.add(input.id);
        }
      }

      if (input.clientId) {
        if (seenClientIds.has(input.clientId)) {
          userErrors.push({
            message: `Duplicate clientId "${input.clientId}"`,
            field: ["features", String(index), "clientId"],
            code: "DUPLICATE_CLIENT_ID",
          });
        } else {
          seenClientIds.add(input.clientId);
        }
      }

      if (seenSlugs.has(input.slug)) {
        userErrors.push({
          message: `Feature slug "${input.slug}" is duplicated`,
          field: ["features", String(index), "slug"],
          code: "SLUG_ALREADY_EXISTS",
        });
      } else {
        seenSlugs.add(input.slug);
      }

      const existing = input.id ? existingById.get(input.id) : undefined;
      if (input.id && !existing) {
        userErrors.push({
          message: "Feature not found",
          field: ["features", String(index), "id"],
          code: "NOT_FOUND",
        });
      }

      const isGroup = input.isGroup ?? existing?.isGroup ?? false;
      if (existing && input.isGroup !== undefined && input.isGroup !== existing.isGroup) {
        userErrors.push({
          message: "Feature type cannot be changed",
          field: ["features", String(index), "isGroup"],
          code: "IMMUTABLE",
        });
      }

      if (input.parentId && input.parentClientId) {
        userErrors.push({
          message: "Provide either parentId or parentClientId, not both",
          field: ["features", String(index), "parentId"],
          code: "INVALID_INPUT",
        });
      }

      if (isGroup && (input.parentId || input.parentClientId)) {
        userErrors.push({
          message: "Groups cannot have a parent",
          field: ["features", String(index), "parentId"],
          code: "INVALID_PARENT",
        });
      }

      if (isGroup && input.values && input.values.length > 0) {
        userErrors.push({
          message: "Groups cannot have values",
          field: ["features", String(index), "values"],
          code: "INVALID_VALUES",
        });
      }

      const normalizedItem: NormalizedFeatureItem = {
        ...input,
        id: input.id,
        isGroup,
        parentId: input.parentId ?? null,
        inputIndex: index,
      };

      normalizedItems.push(normalizedItem);

      if (normalizedItem.id) {
        inputById.set(normalizedItem.id, normalizedItem);
      }
      if (normalizedItem.clientId) {
        inputByClientId.set(normalizedItem.clientId, normalizedItem);
      }
    }

    for (const item of normalizedItems) {
      if (item.parentId) {
        const parentItem = inputById.get(item.parentId);
        if (!parentItem) {
          userErrors.push({
            message: "Parent not found in sync list",
            field: ["features", String(item.inputIndex), "parentId"],
            code: "PARENT_NOT_FOUND",
          });
          continue;
        }

        if (!parentItem.isGroup) {
          userErrors.push({
            message: "Parent must be a group",
            field: ["features", String(item.inputIndex), "parentId"],
            code: "PARENT_NOT_GROUP",
          });
        }

        if (parentItem.parentId || parentItem.parentClientId) {
          userErrors.push({
            message: "Parent group must be at root level",
            field: ["features", String(item.inputIndex), "parentId"],
            code: "PARENT_NOT_ROOT",
          });
        }
      }

      if (item.parentClientId) {
        const parentItem = inputByClientId.get(item.parentClientId);
        if (!parentItem) {
          userErrors.push({
            message: "Parent clientId not found in request",
            field: ["features", String(item.inputIndex), "parentClientId"],
            code: "PARENT_NOT_FOUND",
          });
          continue;
        }

        if (!parentItem.isGroup) {
          userErrors.push({
            message: "Parent must be a group",
            field: ["features", String(item.inputIndex), "parentClientId"],
            code: "PARENT_NOT_GROUP",
          });
        }

        if (parentItem.parentId || parentItem.parentClientId) {
          userErrors.push({
            message: "Parent group must be at root level",
            field: ["features", String(item.inputIndex), "parentClientId"],
            code: "PARENT_NOT_ROOT",
          });
        }
      }
    }

    const existingFeatureIds = normalizedItems
      .filter((item) => item.id && existingById.has(item.id))
      .map((item) => item.id as string);

    const existingValuesByFeatureId = await this.repository.feature.findValuesByFeatureIds(
      existingFeatureIds
    );

    for (const item of normalizedItems) {
      if (item.isGroup) continue;

      const values = item.values ?? [];
      const seenValueSlugs = new Set<string>();
      const seenValueIds = new Set<string>();

      for (const [valueIndex, value] of values.entries()) {
        if (seenValueSlugs.has(value.slug)) {
          userErrors.push({
            message: `Duplicate value slug "${value.slug}"`,
            field: ["features", String(item.inputIndex), "values", String(valueIndex), "slug"],
            code: "SLUG_ALREADY_EXISTS",
          });
        } else {
          seenValueSlugs.add(value.slug);
        }

        if (value.id) {
          if (seenValueIds.has(value.id)) {
            userErrors.push({
              message: `Duplicate value id "${value.id}"`,
              field: ["features", String(item.inputIndex), "values", String(valueIndex), "id"],
              code: "DUPLICATE_ID",
            });
          } else {
            seenValueIds.add(value.id);
          }

          if (!item.id || !existingById.has(item.id)) {
            userErrors.push({
              message: "Cannot reference existing values for a new feature",
              field: ["features", String(item.inputIndex), "values", String(valueIndex), "id"],
              code: "INVALID_VALUE",
            });
          } else {
            const existingValues = existingValuesByFeatureId.get(item.id) ?? [];
            const valueExists = existingValues.some((existingValue) => existingValue.id === value.id);
            if (!valueExists) {
              userErrors.push({
                message: "Feature value not found",
                field: ["features", String(item.inputIndex), "values", String(valueIndex), "id"],
                code: "NOT_FOUND",
              });
            }
          }
        }
      }
    }

    if (userErrors.length > 0) {
      return { product: undefined, features: [], userErrors };
    }

    const clientIdMap = new Map<string, string>();
    const newGroupItems = normalizedItems.filter((item) => !item.id && item.isGroup);

    for (const [index, item] of newGroupItems.entries()) {
      const created = await this.repository.feature.create(productId, {
        slug: item.slug,
        isGroup: true,
        parentId: null,
        sortIndex: TEMP_GROUP_SORT_OFFSET + index,
      });
      item.id = created.id;
      if (item.clientId) {
        clientIdMap.set(item.clientId, created.id);
      }
    }

    for (const item of normalizedItems) {
      if (item.parentClientId) {
        const resolvedParentId = clientIdMap.get(item.parentClientId) ?? null;
        item.parentId = resolvedParentId;
      }
      if (item.isGroup) {
        item.parentId = null;
      }
    }

    this.normalizeFeatureSortIndexes(normalizedItems);

    const inputIds = new Set(normalizedItems.map((item) => item.id).filter(Boolean) as string[]);
    const toDelete = existingFeatures
      .filter((feature) => !inputIds.has(feature.id))
      .map((feature) => feature.id);

    const existingItems = normalizedItems.filter((item) => item.id && existingById.has(item.id));
    const reorderIds = existingItems
      .filter((item) => {
        const existing = existingById.get(item.id as string);
        if (!existing) return false;
        const parentChanged = (item.parentId ?? null) !== (existing.parentId ?? null);
        const sortChanged = item.sortIndex !== existing.sortIndex;
        return parentChanged || sortChanged;
      })
      .map((item) => item.id as string);

    await this.repository.feature.offsetSortIndexes(reorderIds, REORDER_SORT_OFFSET);

    for (const item of existingItems) {
      const existing = existingById.get(item.id as string);
      if (!existing) continue;

      const updateData: { slug?: string; parentId?: string | null; sortIndex?: number } = {};
      if (item.slug !== existing.slug) updateData.slug = item.slug;
      if ((item.parentId ?? null) !== (existing.parentId ?? null)) {
        updateData.parentId = item.parentId ?? null;
      }
      if (item.sortIndex !== existing.sortIndex) updateData.sortIndex = item.sortIndex;

      if (Object.keys(updateData).length > 0) {
        await this.repository.feature.update(item.id as string, updateData);
      }

      await this.repository.translation.upsertFeatureTranslation({
        projectId: this.getProjectId(),
        featureId: item.id as string,
        locale: this.getLocale(),
        name: item.name,
      });
    }

    for (const item of newGroupItems) {
      if (!item.id) continue;
      if (item.sortIndex !== undefined) {
        await this.repository.feature.update(item.id, { sortIndex: item.sortIndex });
      }
      await this.repository.translation.upsertFeatureTranslation({
        projectId: this.getProjectId(),
        featureId: item.id,
        locale: this.getLocale(),
        name: item.name,
      });
    }

    const newAttributeItems = normalizedItems.filter((item) => !item.id && !item.isGroup);
    for (const item of newAttributeItems) {
      const created = await this.repository.feature.create(productId, {
        slug: item.slug,
        isGroup: false,
        parentId: item.parentId,
        sortIndex: item.sortIndex ?? 0,
      });
      item.id = created.id;
      await this.repository.translation.upsertFeatureTranslation({
        projectId: this.getProjectId(),
        featureId: created.id,
        locale: this.getLocale(),
        name: item.name,
      });
    }

    const attributeItems = normalizedItems.filter((item) => item.id && !item.isGroup);
    for (const item of attributeItems) {
      const existingValues = item.id ? existingValuesByFeatureId.get(item.id) ?? [] : [];
      await this.syncValues(item.id as string, item.values ?? [], existingValues);
    }

    for (const id of toDelete) {
      await this.repository.feature.delete(id);
    }

    const [product, syncedFeatures] = await Promise.all([
      this.repository.product.findById(productId),
      this.repository.feature.findByProductId(productId),
    ]);

    this.logger.info(
      {
        productId,
        featureCount: syncedFeatures.length,
        deletedCount: toDelete.length,
      },
      "Product features synced"
    );

    return {
      product: product ?? undefined,
      features: syncedFeatures,
      userErrors: [],
    };
  }

  private normalizeFeatureSortIndexes(items: NormalizedFeatureItem[]): void {
    const byContainer = new Map<string, NormalizedFeatureItem[]>();

    for (const item of items) {
      const key = item.parentId ?? "root";
      const existing = byContainer.get(key) ?? [];
      existing.push(item);
      byContainer.set(key, existing);
    }

    for (const containerItems of byContainer.values()) {
      const withIndex = containerItems.map((item) => ({ item, inputIndex: item.inputIndex }));
      withIndex.sort((a, b) => {
        const aSort = a.item.sortIndex ?? Number.POSITIVE_INFINITY;
        const bSort = b.item.sortIndex ?? Number.POSITIVE_INFINITY;
        if (aSort !== bSort) return aSort - bSort;
        return a.inputIndex - b.inputIndex;
      });

      withIndex.forEach(({ item }, index) => {
        item.sortIndex = index;
      });
    }
  }

  private normalizeValueSortIndexes(values: FeatureValueSyncInput[]): FeatureValueSyncInput[] {
    const withIndex = values.map((value, inputIndex) => ({ value, inputIndex }));
    withIndex.sort((a, b) => {
      const aSort = a.value.sortIndex ?? Number.POSITIVE_INFINITY;
      const bSort = b.value.sortIndex ?? Number.POSITIVE_INFINITY;
      if (aSort !== bSort) return aSort - bSort;
      return a.inputIndex - b.inputIndex;
    });

    return withIndex.map(({ value }, index) => ({ ...value, sortIndex: index }));
  }

  private async syncValues(
    featureId: string,
    values: FeatureValueSyncInput[],
    existingValues: ProductFeatureValue[]
  ): Promise<void> {
    const normalizedValues = this.normalizeValueSortIndexes(values);
    const existingById = new Map(existingValues.map((value) => [value.id, value]));

    const inputIds = new Set<string>();
    const toCreate: FeatureValueSyncInput[] = [];
    const toUpdate: FeatureValueSyncInput[] = [];

    for (const value of normalizedValues) {
      if (value.id) {
        inputIds.add(value.id);
        toUpdate.push(value);
      } else {
        toCreate.push(value);
      }
    }

    const toDelete = existingValues.filter((value) => !inputIds.has(value.id));

    const slugUpdates = toUpdate.filter((value) => {
      const existing = existingById.get(value.id as string);
      return existing && existing.slug !== value.slug;
    });

    for (const value of slugUpdates) {
      await this.repository.feature.updateValue(value.id as string, {
        slug: `__tmp__${value.id}`,
      });
    }

    for (const value of toUpdate) {
      const existing = existingById.get(value.id as string);
      if (!existing) continue;

      const updateData: { slug?: string; sortIndex?: number } = {};
      if (existing.slug !== value.slug) updateData.slug = value.slug;
      if (existing.sortIndex !== value.sortIndex) updateData.sortIndex = value.sortIndex;

      if (Object.keys(updateData).length > 0) {
        await this.repository.feature.updateValue(value.id as string, updateData);
      }

      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: value.id as string,
        locale: this.getLocale(),
        name: value.name,
      });
    }

    for (const value of toCreate) {
      const created = await this.repository.feature.createValue(featureId, {
        slug: value.slug,
        sortIndex: value.sortIndex ?? 0,
      });

      await this.repository.translation.upsertFeatureValueTranslation({
        projectId: this.getProjectId(),
        featureValueId: created.id,
        locale: this.getLocale(),
        name: value.name,
      });
    }

    for (const value of toDelete) {
      await this.repository.feature.deleteValue(value.id);
    }
  }

  protected handleError(_error: unknown): FeatureSyncResult {
    return {
      product: undefined,
      features: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
