import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import type {
  ComponentGroup,
  ComponentItem,
  ComponentPriceRule,
  DependencyAction,
  DependencyRule,
} from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";
import type { ProductComponentSelectionInput } from "./generated/types.js";
import { inventoryState, isPublishedProduct } from "./helpers.js";
import { mediaReference } from "./MediaConnectionResolver.js";
import { minorUnitsToMoney, type StorefrontMoney } from "./money.js";

export interface ProductComponentConfigurationInput {
  variantId: string;
  selections?: ProductComponentSelectionInput[] | null;
}

interface EffectiveItem {
  source: ComponentItem;
  visible: boolean;
  selected: boolean;
  required: boolean;
  groupRequired: boolean;
  quantity: number;
  priceRuleId: string | null;
}

interface ResolvedItem {
  id: string;
  title: string;
  productId: string;
  variantId: string;
  featuredMediaId: string | null;
  selected: boolean;
  required: boolean;
  availableForSale: boolean;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: StorefrontMoney;
  totalPrice: StorefrontMoney;
  totalPriceMinor: number;
}

interface ResolvedGroup {
  source: ComponentGroup;
  title: string;
  required: boolean;
  items: ResolvedItem[];
}

interface ResolvedConfiguration {
  id: string;
  displayStyle: string;
  groups: ResolvedGroup[];
  componentsSubtotal: StorefrontMoney;
  totalPrice: StorefrontMoney;
}

export class ProductComponentConfigurationResolver extends CatalogType<
  ProductComponentConfigurationInput,
  ResolvedConfiguration
> {
  async $preload(): Promise<ResolvedConfiguration> {
    const configurationId =
      await this.$ctx.loaders.componentConfigurationIdByVariantId.load(
        this.$props.variantId,
      );
    if (!configurationId) {
      throw new PreloadNotFoundError(
        `Product component configuration for variant ${this.$props.variantId} not found`,
      );
    }

    const [configuration, parentVariant] = await Promise.all([
      this.$ctx.loaders.componentConfiguration.load(configurationId),
      this.$ctx.loaders.variant.load(this.$props.variantId),
    ]);
    if (!configuration || !parentVariant) {
      throw new PreloadNotFoundError(
        `Product component configuration ${configurationId} not found`,
      );
    }
    const [component, parentProduct] = await Promise.all([
      this.$ctx.loaders.component.load(configuration.componentId),
      this.$ctx.loaders.product.load(parentVariant.productId),
    ]);
    if (!component || !isPublishedProduct(parentProduct)) {
      throw new PreloadNotFoundError(
        `Published product component for configuration ${configurationId} not found`,
      );
    }

    const groupIds =
      await this.$ctx.loaders.componentGroupIdsByConfigurationId.load(
        configurationId,
      );
    const groups = await Promise.all(
      groupIds.map((id) => this.$ctx.loaders.componentGroup.load(id)),
    );
    const itemIdsByGroup = await Promise.all(
      groupIds.map((id) => this.$ctx.loaders.componentItemIdsByGroupId.load(id)),
    );
    const items = await Promise.all(
      itemIdsByGroup.flat().map((id) => this.$ctx.loaders.componentItem.load(id)),
    );
    const effective = this.initialItemState(
      items.filter((item): item is ComponentItem => Boolean(item)),
    );
    await this.applyDependencyRules(configurationId, effective);

    const resolvedGroups: ResolvedGroup[] = [];
    for (const group of groups) {
      if (!group) continue;
      const groupItems = effective.filter(
        (item) => item.source.groupId === group.id && item.visible,
      );
      const resolvedItems = (
        await Promise.all(groupItems.map((item) => this.resolveItem(item)))
      ).filter((item): item is ResolvedItem => Boolean(item));
      if (resolvedItems.length === 0) continue;
      const translation =
        await this.$ctx.loaders.componentGroupTranslation.load(group.id);
      resolvedGroups.push({
        source: group,
        title: translation?.name ?? "",
        required:
          (group.minSelection ?? 0) > 0 ||
          groupItems.some((item) => item.groupRequired),
        items: resolvedItems,
      });
    }

    const componentsSubtotalMinor = resolvedGroups
      .flatMap((group) => group.items)
      .reduce((sum, item) => sum + item.totalPriceMinor, 0);
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    const parentPrice = await this.currentPriceMinor(this.$props.variantId);

    return {
      id: configurationId,
      displayStyle: component.displayStyle,
      groups: resolvedGroups,
      componentsSubtotal: minorUnitsToMoney(componentsSubtotalMinor, currency),
      totalPrice: minorUnitsToMoney(
        (parentPrice ?? 0) + componentsSubtotalMinor,
        currency,
      ),
    };
  }

  async id() {
    const value = await this.$get("id");
    return this.encodeId(
      value,
      GlobalIdEntity.ProductComponentConfiguration,
    );
  }

  displayStyle() {
    return this.$get("displayStyle");
  }

  async groups() {
    const values = await this.$get("groups");
    return values.map(
      (value) => new ProductComponentGroupResolver(value, this.$ctx),
    );
  }

  componentsSubtotal() {
    return this.$get("componentsSubtotal");
  }

  totalPrice() {
    return this.$get("totalPrice");
  }

  private initialItemState(items: ComponentItem[]): EffectiveItem[] {
    const explicit = this.$props.selections !== undefined;
    const selections = new Map<string, ProductComponentSelectionInput>();
    for (const selection of this.$props.selections ?? []) {
      let itemId: string;
      try {
        itemId = decodeGlobalIdByType(
          selection.itemId,
          GlobalIdEntity.ProductComponentItem,
        );
      } catch {
        throw badSelection("Invalid product component item ID");
      }
      if (selections.has(itemId)) {
        throw badSelection("A product component item can only be selected once");
      }
      if (!Number.isSafeInteger(selection.quantity) || selection.quantity < 0) {
        throw badSelection("Product component quantity cannot be negative");
      }
      selections.set(itemId, { ...selection, itemId });
    }

    for (const itemId of selections.keys()) {
      if (!items.some((item) => item.id === itemId)) {
        throw badSelection("Selected product component item does not belong to this configuration");
      }
    }

    return items.map((source) => {
      const selection = selections.get(source.id);
      const selected = explicit
        ? Boolean(selection && selection.quantity > 0)
        : Boolean(source.selected && (source.defaultQty ?? source.minQty ?? 1) > 0);
      return {
        source,
        visible: source.visible,
        selected,
        required: false,
        groupRequired: false,
        quantity: selected
          ? (selection?.quantity ?? source.defaultQty ?? source.minQty ?? 1)
          : 0,
        priceRuleId: source.priceRuleId,
      };
    });
  }

  private async applyDependencyRules(
    configurationId: string,
    items: EffectiveItem[],
  ): Promise<void> {
    const ruleIds =
      await this.$ctx.loaders.componentDependencyRuleIdsByConfigurationId.load(
        configurationId,
      );
    for (const ruleId of ruleIds) {
      const rule = await this.$ctx.loaders.componentDependencyRule.load(ruleId);
      if (!rule?.enabled || !(await this.ruleMatches(rule, items))) continue;
      const actionIds =
        await this.$ctx.loaders.componentDependencyActionIdsByRuleId.load(
          rule.id,
        );
      const actions = await Promise.all(
        actionIds.map((id) => this.$ctx.loaders.componentDependencyAction.load(id)),
      );
      for (const action of actions) {
        if (action) applyAction(action, items);
      }
    }
  }

  private async ruleMatches(
    rule: DependencyRule,
    items: EffectiveItem[],
  ): Promise<boolean> {
    const groupIds =
      await this.$ctx.loaders.componentConditionGroupIdsByRuleId.load(rule.id);
    const results = await Promise.all(
      groupIds.map(async (groupId) => {
        const group = await this.$ctx.loaders.componentConditionGroup.load(
          groupId,
        );
        if (!group) return false;
        const conditionIds =
          await this.$ctx.loaders.componentConditionIdsByGroupId.load(groupId);
        const conditions = await Promise.all(
          conditionIds.map((id) => this.$ctx.loaders.componentCondition.load(id)),
        );
        const matches = conditions.map((condition) =>
          condition ? conditionMatches(condition, items) : false,
        );
        return group.logicOperator === "OR"
          ? matches.some(Boolean)
          : matches.every(Boolean);
      }),
    );
    return rule.logicOperator === "OR"
      ? results.some(Boolean)
      : results.every(Boolean);
  }

  private async resolveItem(item: EffectiveItem): Promise<ResolvedItem | null> {
    const variantId = await this.resolveItemVariant(item);
    if (!variantId) return null;
    const variant = await this.$ctx.loaders.variant.load(variantId);
    if (!variant) return null;
    const product = await this.$ctx.loaders.product.load(variant.productId);
    if (!isPublishedProduct(product)) return null;

    const basePrice = await this.currentPriceMinor(variantId);
    const unitPriceMinor = await this.applyPriceRule(
      item.priceRuleId ?? (await this.templatePriceRuleId(item.source)),
      basePrice ?? 0,
    );
    const selectedQuantity = item.selected ? item.quantity : 0;
    const totalPriceMinor = unitPriceMinor * selectedQuantity;
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    const [itemTranslation, variantTranslation, productTranslation, inventory] =
      await Promise.all([
        this.$ctx.loaders.componentItemTranslation.load(item.source.id),
        this.$ctx.loaders.variantTranslation.load(variantId),
        this.$ctx.loaders.productTranslation.load(product.id),
        inventoryState(this.$ctx, variantId),
      ]);
    const variantMedia = await this.$ctx.loaders.variantMedia.load(variantId);
    const productMedia = variantMedia.length
      ? []
      : await this.$ctx.loaders.productMedia.load(product.id);

    return {
      id: item.source.id,
      title:
        itemTranslation?.name ??
        variantTranslation?.title ??
        productTranslation?.name ??
        variant.handle,
      productId: product.id,
      variantId,
      featuredMediaId:
        item.source.featuredImageId ??
        variantMedia[0]?.fileId ??
        productMedia[0]?.fileId ??
        null,
      selected: item.selected,
      required: item.required,
      availableForSale: Boolean(basePrice != null && inventory.availableForSale),
      quantity: selectedQuantity,
      minQuantity: item.source.minQty ?? 0,
      maxQuantity: item.source.maxQty,
      unitPrice: minorUnitsToMoney(unitPriceMinor, currency),
      totalPrice: minorUnitsToMoney(totalPriceMinor, currency),
      totalPriceMinor,
    };
  }

  private async resolveItemVariant(item: EffectiveItem): Promise<string | null> {
    if (item.source.refVariantId) return item.source.refVariantId;
    if (!item.source.refProductId) return null;

    const explicitSelection = (this.$props.selections ?? []).find((selection) => {
      try {
        return (
          decodeGlobalIdByType(
            selection.itemId,
            GlobalIdEntity.ProductComponentItem,
          ) === item.source.id
        );
      } catch {
        return false;
      }
    });
    if (explicitSelection?.variantId) {
      try {
        const id = decodeGlobalIdByType(
          explicitSelection.variantId,
          GlobalIdEntity.ProductVariant,
        );
        const variant = await this.$ctx.loaders.variant.load(id);
        if (!variant || variant.productId !== item.source.refProductId) {
          throw badSelection("Selected component variant does not belong to the referenced product");
        }
        if (!(await this.variantAllowedForItem(item.source, id))) {
          throw badSelection("Selected component variant is not allowed for this item");
        }
        return id;
      } catch (error) {
        if (error instanceof GraphQLError) throw error;
        throw badSelection("Invalid product component variant ID");
      }
    }

    const ids = await this.$ctx.loaders.variantIds.load(item.source.refProductId);
    const variants = await this.$ctx.loaders.variant.loadMany(ids);
    const candidates = variants.flatMap((variant, index) =>
      variant instanceof Error || !variant
        ? []
        : [{ id: ids[index]!, variant }],
    );
    candidates.sort((left, right) =>
      left.variant.isDefault === right.variant.isDefault
        ? left.variant.createdAt.localeCompare(right.variant.createdAt)
        : left.variant.isDefault
          ? -1
          : 1,
    );
    for (const candidate of candidates) {
      if (await this.variantAllowedForItem(item.source, candidate.id)) {
        return candidate.id;
      }
    }
    return null;
  }

  private async variantAllowedForItem(
    item: ComponentItem,
    variantId: string,
  ): Promise<boolean> {
    const selectionIds =
      await this.$ctx.loaders.componentOptionSelectionIdsByItemId.load(item.id);
    if (selectionIds.length === 0) return true;
    const links = await this.$ctx.loaders.variantSelectedOptions.load(variantId);

    for (const selectionId of selectionIds) {
      const selection =
        await this.$ctx.loaders.componentOptionSelection.load(selectionId);
      if (!selection) return false;
      const valueIds =
        await this.$ctx.loaders.componentOptionValueSelectionIdsBySelectionId.load(
          selectionId,
        );
      const values = await Promise.all(
        valueIds.map((id) =>
          this.$ctx.loaders.componentOptionValueSelection.load(id),
        ),
      );
      const allowedIds = new Set(
        values.flatMap((value) =>
          value?.status === "SELECTED" && value.refOptionValueId
            ? [value.refOptionValueId]
            : [],
        ),
      );
      const link = links.find(
        (candidate) => candidate.optionId === selection.refOptionId,
      );
      if (!link?.optionValueId) return false;
      if (allowedIds.size > 0 && !allowedIds.has(link.optionValueId)) {
        return false;
      }
    }
    return true;
  }

  private async currentPriceMinor(variantId: string): Promise<number | null> {
    const prices = await this.$ctx.loaders.variantPricing.load(variantId);
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    const now = Date.now();
    return (
      prices.find(
        (price) =>
          price.currency === currency &&
          Date.parse(price.effectiveFrom) <= now &&
          (!price.effectiveTo || Date.parse(price.effectiveTo) > now),
      )?.amountMinor ?? null
    );
  }

  private async templatePriceRuleId(item: ComponentItem): Promise<string | null> {
    if (!item.pricingTemplateId) return null;
    const template = await this.$ctx.loaders.componentPricingTemplate.load(
      item.pricingTemplateId,
    );
    return template?.priceRuleId ?? null;
  }

  private async applyPriceRule(
    ruleId: string | null,
    baseMinor: number,
  ): Promise<number> {
    if (!ruleId) return baseMinor;
    const rule = await this.$ctx.loaders.componentPriceRule.load(ruleId);
    if (!rule || rule.strategy === "BASE") return baseMinor;
    if (rule.strategy === "FREE") return 0;

    const adjustment = await this.ruleAdjustment(rule, baseMinor);
    if (rule.strategy === "OVERRIDE") return adjustment;
    return Math.max(
      0,
      rule.operation === "DECREASE"
        ? baseMinor - adjustment
        : baseMinor + adjustment,
    );
  }

  private async ruleAdjustment(
    rule: ComponentPriceRule,
    baseMinor: number,
  ): Promise<number> {
    if (rule.valueType === "PERCENTAGE") {
      const percentage =
        await this.$ctx.loaders.componentPriceRulePercent.load(rule.id);
      return Math.round(
        (baseMinor * (percentage?.percentageBps ?? 0)) / 10_000,
      );
    }
    const currency = this.$ctx.currency ?? this.$ctx.store.currencyCode;
    const amounts = await this.$ctx.loaders.componentPriceRuleAmounts.load(rule.id);
    return amounts.find((amount) => amount.currency === currency)?.amountMinor ?? 0;
  }

}

class ProductComponentGroupResolver extends CatalogType<ResolvedGroup> {
  id() {
    return this.encodeId(
      this.$props.source.id,
      GlobalIdEntity.ProductComponentGroup,
    );
  }

  title() {
    return this.$props.title;
  }

  required() {
    return this.$props.required;
  }

  minSelection() {
    return this.$props.source.minSelection;
  }

  maxSelection() {
    return this.$props.source.maxSelection;
  }

  items() {
    return this.$props.items.map(
      (item) => new ProductComponentItemResolver(item, this.$ctx),
    );
  }
}

class ProductComponentItemResolver extends CatalogType<ResolvedItem> {
  id() {
    return this.encodeId(
      this.$props.id,
      GlobalIdEntity.ProductComponentItem,
    );
  }

  title() {
    return this.$props.title;
  }

  product() {
    return this.resolvers.product(this.$props.productId);
  }

  variant() {
    return this.resolvers.productVariant(this.$props.variantId);
  }

  featuredMedia() {
    return this.$props.featuredMediaId
      ? mediaReference(this.$props.featuredMediaId)
      : null;
  }

  selected() {
    return this.$props.selected;
  }

  required() {
    return this.$props.required;
  }

  availableForSale() {
    return this.$props.availableForSale;
  }

  quantity() {
    return this.$props.quantity;
  }

  minQuantity() {
    return this.$props.minQuantity;
  }

  maxQuantity() {
    return this.$props.maxQuantity;
  }

  unitPrice() {
    return this.$props.unitPrice;
  }

  totalPrice() {
    return this.$props.totalPrice;
  }
}

function applyAction(action: DependencyAction, items: EffectiveItem[]): void {
  const targets =
    action.targetType === "ITEM"
      ? items.filter((item) => item.source.id === action.targetId)
      : action.targetType === "GROUP"
        ? items.filter((item) => item.source.groupId === action.targetId)
        : items;
  for (const item of targets) {
    if (action.actionType === "SHOW") item.visible = true;
    else if (action.actionType === "HIDE") item.visible = false;
    else if (action.actionType === "SET_REQUIRED") {
      if (action.targetType === "ITEM") {
        item.required = action.requiredValue === true;
      } else {
        item.groupRequired = action.requiredValue === true;
      }
    } else if (action.actionType === "ADJUST_PRICE" && action.priceRuleId) {
      item.priceRuleId = action.priceRuleId;
    }
  }
}

function conditionMatches(
  condition: {
    subject: string;
    operator: string;
    targetType: string;
    targetId: string;
    value: number | null;
  },
  items: EffectiveItem[],
): boolean {
  const targets =
    condition.targetType === "ITEM"
      ? items.filter((item) => item.source.id === condition.targetId)
      : condition.targetType === "GROUP"
        ? items.filter((item) => item.source.groupId === condition.targetId)
        : items;
  const value =
    condition.subject === "ITEM_SELECTED"
      ? targets.some((item) => item.selected)
        ? 1
        : 0
      : targets.reduce((sum, item) => sum + item.quantity, 0);
  if (condition.operator === "IS_SELECTED") return value > 0;
  if (condition.operator === "IS_NOT_SELECTED") return value === 0;
  if (condition.operator === "EQ") return value === condition.value;
  if (condition.operator === "GTE") {
    return condition.value != null && value >= condition.value;
  }
  return condition.value != null && value <= condition.value;
}

function badSelection(message: string): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}
