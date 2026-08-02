import { and, asc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import type { Catalog } from "@shopana/broker-types";
import type { Database } from "../infrastructure/db/database.js";
import type {
  CheckoutCatalogRow,
  CheckoutMerchandiseReadInput,
  ComponentConfigurationRead,
} from "./contracts.js";
import {
  componentConfiguration,
  componentConfigurationVariant,
  componentGroup,
  componentItem,
  componentPriceRule,
  componentPriceRuleAmount,
  componentPriceRulePercent,
  componentPricingTemplate,
  condition,
  conditionGroup,
  dependencyAction,
  dependencyRule,
  inventoryItem,
  itemPricing,
  product,
  productCategory,
  productFeature,
  productOptionVariantLink,
  productTag,
  productTranslation,
  variant,
  variantMedia,
  variantTranslation,
  warehouseStock,
} from "../repositories/models/index.js";

export class CheckoutMerchandiseRepository {
  constructor(private readonly db: Database) {}

  async read(input: CheckoutMerchandiseReadInput): Promise<Map<string, CheckoutCatalogRow>> {
    if (input.variantIds.length === 0) return new Map();
    return this.db.transaction(async (tx) => {
      const variants = await tx.select().from(variant).where(and(eq(variant.storeId, input.storeId), inArray(variant.id, input.variantIds), isNull(variant.deletedAt))).orderBy(asc(variant.id));
      const productIds = [...new Set(variants.map((row) => row.productId))];
      const [products, prices, currencyPriceVariants, inventories, stocks, variantTitles, productTitles, categories, tags, features, options, media, configLinks] = await Promise.all([
        productIds.length ? tx.select().from(product).where(and(eq(product.storeId, input.storeId), inArray(product.id, productIds), isNull(product.deletedAt))).orderBy(asc(product.id)) : [],
        tx.select().from(itemPricing).where(and(
          eq(itemPricing.storeId, input.storeId),
          inArray(itemPricing.variantId, input.variantIds),
          eq(itemPricing.currency, input.currencyCode as never),
          lte(itemPricing.effectiveFrom, input.effectiveAt),
          or(isNull(itemPricing.effectiveTo), gt(itemPricing.effectiveTo, input.effectiveAt)),
        )).orderBy(asc(itemPricing.variantId), asc(itemPricing.effectiveFrom), asc(itemPricing.id)),
        tx.select({ variantId: itemPricing.variantId }).from(itemPricing).where(and(eq(itemPricing.storeId, input.storeId), inArray(itemPricing.variantId, input.variantIds), eq(itemPricing.currency, input.currencyCode as never))).orderBy(asc(itemPricing.variantId), asc(itemPricing.effectiveFrom), asc(itemPricing.id)),
        tx.select().from(inventoryItem).where(and(eq(inventoryItem.storeId, input.storeId), inArray(inventoryItem.variantId, input.variantIds))).orderBy(asc(inventoryItem.variantId), asc(inventoryItem.id)),
        tx.select().from(warehouseStock).where(and(eq(warehouseStock.storeId, input.storeId), inArray(warehouseStock.variantId, input.variantIds))).orderBy(asc(warehouseStock.variantId), asc(warehouseStock.warehouseId), asc(warehouseStock.id)),
        tx.select().from(variantTranslation).where(and(eq(variantTranslation.storeId, input.storeId), inArray(variantTranslation.variantId, input.variantIds), inArray(variantTranslation.locale, [input.requestedLocale, input.defaultLocale] as never[]))).orderBy(asc(variantTranslation.variantId), asc(variantTranslation.locale)),
        productIds.length ? tx.select().from(productTranslation).where(and(eq(productTranslation.storeId, input.storeId), inArray(productTranslation.productId, productIds), inArray(productTranslation.locale, [input.requestedLocale, input.defaultLocale] as never[]))).orderBy(asc(productTranslation.productId), asc(productTranslation.locale)) : [],
        productIds.length ? tx.select().from(productCategory).where(and(eq(productCategory.storeId, input.storeId), inArray(productCategory.productId, productIds))).orderBy(asc(productCategory.productId), asc(productCategory.categoryId)) : [],
        productIds.length ? tx.select().from(productTag).where(and(eq(productTag.storeId, input.storeId), inArray(productTag.productId, productIds))).orderBy(asc(productTag.productId), asc(productTag.tagId)) : [],
        productIds.length ? tx.select().from(productFeature).where(and(eq(productFeature.storeId, input.storeId), inArray(productFeature.productId, productIds))).orderBy(asc(productFeature.productId), asc(productFeature.id)) : [],
        tx.select().from(productOptionVariantLink).where(and(eq(productOptionVariantLink.storeId, input.storeId), inArray(productOptionVariantLink.variantId, input.variantIds))).orderBy(asc(productOptionVariantLink.variantId), asc(productOptionVariantLink.optionId)),
        tx.select().from(variantMedia).where(and(eq(variantMedia.storeId, input.storeId), inArray(variantMedia.variantId, input.variantIds))).orderBy(asc(variantMedia.variantId), asc(variantMedia.sortIndex), asc(variantMedia.productMediaId)),
        tx.select().from(componentConfigurationVariant).where(and(eq(componentConfigurationVariant.storeId, input.storeId), inArray(componentConfigurationVariant.variantId, input.variantIds))).orderBy(asc(componentConfigurationVariant.variantId), asc(componentConfigurationVariant.configurationId)),
      ]);
      const variantsSupportingCurrency = new Set(currencyPriceVariants.map((row) => row.variantId));
      const configurationIds = configLinks.map((row) => row.configurationId);
      const configs = configurationIds.length ? await this.readConfigurations(tx as unknown as Database, input.storeId, configurationIds, input.currencyCode) : new Map<string, ComponentConfigurationRead>();
      const byProduct = new Map(products.map((row) => [row.id, row]));
      const rows = new Map<string, CheckoutCatalogRow>();
      for (const current of variants.sort((a, b) => a.id.localeCompare(b.id))) {
        const link = configLinks.find((row) => row.variantId === current.id);
        const vt = variantTitles.filter((row) => row.variantId === current.id);
        const pt = productTitles.filter((row) => row.productId === current.productId);
        rows.set(current.id, {
          variant: current,
          product: byProduct.get(current.productId) ?? null,
          prices: prices.filter((row) => row.variantId === current.id),
          supportsCurrency: variantsSupportingCurrency.has(current.id),
          inventory: inventories.find((row) => row.variantId === current.id) ?? null,
          stocks: stocks.filter((row) => row.variantId === current.id),
          titles: {
            requestedVariant: vt.find((row) => row.locale === input.requestedLocale)?.title ?? null,
            defaultVariant: vt.find((row) => row.locale === input.defaultLocale)?.title ?? null,
            requestedProduct: pt.find((row) => row.locale === input.requestedLocale)?.name ?? null,
            defaultProduct: pt.find((row) => row.locale === input.defaultLocale)?.name ?? null,
          },
          targeting: {
            categoryIds: sorted(categories.filter((row) => row.productId === current.productId).map((row) => row.categoryId)),
            tagIds: sorted(tags.filter((row) => row.productId === current.productId).map((row) => row.tagId)),
            featureIds: sorted(features.filter((row) => row.productId === current.productId).map((row) => row.id)),
            optionValueIds: sorted(options.filter((row) => row.variantId === current.id).flatMap((row) => row.optionValueId ? [row.optionValueId] : [])),
          },
          firstMediaId: media.find((row) => row.variantId === current.id)?.productMediaId ?? null,
          configuration: link ? configs.get(link.configurationId) ?? null : null,
        });
      }
      return rows;
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
  }

  private async readConfigurations(db: Database, storeId: string, ids: string[], currencyCode: string): Promise<Map<string, ComponentConfigurationRead>> {
    const [configs, groups, items, templates, dependencyRules] = await Promise.all([
      db.select().from(componentConfiguration).where(and(eq(componentConfiguration.storeId, storeId), inArray(componentConfiguration.id, ids))).orderBy(asc(componentConfiguration.id)),
      db.select().from(componentGroup).where(and(eq(componentGroup.storeId, storeId), inArray(componentGroup.configurationId, ids))).orderBy(asc(componentGroup.configurationId), asc(componentGroup.sortIndex), asc(componentGroup.id)),
      db.select().from(componentItem).where(and(eq(componentItem.storeId, storeId), inArray(componentItem.configurationId, ids))).orderBy(asc(componentItem.configurationId), asc(componentItem.groupId), asc(componentItem.sortIndex), asc(componentItem.id)),
      db.select().from(componentPricingTemplate).where(and(eq(componentPricingTemplate.storeId, storeId), inArray(componentPricingTemplate.configurationId, ids))).orderBy(asc(componentPricingTemplate.configurationId), asc(componentPricingTemplate.sortIndex), asc(componentPricingTemplate.id)),
      db.select().from(dependencyRule).where(and(eq(dependencyRule.storeId, storeId), inArray(dependencyRule.configurationId, ids), eq(dependencyRule.enabled, true))).orderBy(asc(dependencyRule.configurationId), asc(dependencyRule.priority), asc(dependencyRule.id)),
    ]);
    const dependencyRuleIds = dependencyRules.map((row) => row.id);
    const [conditionGroups, dependencyActions] = dependencyRuleIds.length ? await Promise.all([
      db.select().from(conditionGroup).where(and(eq(conditionGroup.storeId, storeId), inArray(conditionGroup.ruleId, dependencyRuleIds))).orderBy(asc(conditionGroup.ruleId), asc(conditionGroup.sortIndex), asc(conditionGroup.id)),
      db.select().from(dependencyAction).where(and(eq(dependencyAction.storeId, storeId), inArray(dependencyAction.ruleId, dependencyRuleIds))).orderBy(asc(dependencyAction.ruleId), asc(dependencyAction.sortIndex), asc(dependencyAction.id)),
    ]) : [[], []];
    const conditionGroupIds = conditionGroups.map((row) => row.id);
    const conditions = conditionGroupIds.length ? await db.select().from(condition).where(and(eq(condition.storeId, storeId), inArray(condition.groupId, conditionGroupIds))).orderBy(asc(condition.groupId), asc(condition.sortIndex), asc(condition.id)) : [];
    const ruleIds = [...new Set(items.flatMap((item) => {
      const templateRule = templates.find((row) => row.id === item.pricingTemplateId)?.priceRuleId;
      return item.priceRuleId ? [item.priceRuleId] : templateRule ? [templateRule] : [];
    }).concat(dependencyActions.flatMap((action) => action.priceRuleId ? [action.priceRuleId] : [])))];
    const [rules, amounts, percents] = ruleIds.length ? await Promise.all([
      db.select().from(componentPriceRule).where(and(eq(componentPriceRule.storeId, storeId), inArray(componentPriceRule.id, ruleIds))).orderBy(asc(componentPriceRule.configurationId), asc(componentPriceRule.id)),
      db.select().from(componentPriceRuleAmount).where(and(eq(componentPriceRuleAmount.storeId, storeId), inArray(componentPriceRuleAmount.priceRuleId, ruleIds), eq(componentPriceRuleAmount.currency, currencyCode as never))).orderBy(asc(componentPriceRuleAmount.priceRuleId), asc(componentPriceRuleAmount.currency)),
      db.select().from(componentPriceRulePercent).where(and(eq(componentPriceRulePercent.storeId, storeId), inArray(componentPriceRulePercent.priceRuleId, ruleIds))).orderBy(asc(componentPriceRulePercent.priceRuleId)),
    ]) : [[], [], []];
    const result = new Map<string, ComponentConfigurationRead>();
    for (const config of configs) result.set(config.id, {
      id: config.id, updatedAt: config.updatedAt,
      groups: groups.filter((row) => row.configurationId === config.id).map((row) => ({ id: row.id, minSelection: row.minSelection, maxSelection: row.maxSelection, sortIndex: row.sortIndex })),
      items: items.filter((row) => row.configurationId === config.id).map((item) => {
        const ruleId = item.priceRuleId ?? templates.find((row) => row.id === item.pricingTemplateId)?.priceRuleId ?? null;
        const rule = rules.find((row) => row.id === ruleId);
        return { id: item.id, groupId: item.groupId, itemType: item.itemType, refProductId: item.refProductId, refVariantId: item.refVariantId, minQty: item.minQty, maxQty: item.maxQty, visible: item.visible, sortIndex: item.sortIndex, updatedAt: item.updatedAt, rule: toRule(rule, amounts.find((row) => row.priceRuleId === ruleId)?.amountMinor, percents.find((row) => row.priceRuleId === ruleId)?.percentageBps, currencyCode) };
      }),
      dependencyRules: dependencyRules.filter((row) => row.configurationId === config.id).map((dependency) => ({ id: dependency.id, priority: dependency.priority, logicOperator: dependency.logicOperator, groups: conditionGroups.filter((group) => group.ruleId === dependency.id).map((group) => ({ id: group.id, logicOperator: group.logicOperator, conditions: conditions.filter((row) => row.groupId === group.id).map((row) => ({ subject: row.subject, operator: row.operator, targetType: row.targetType, targetId: row.targetId, value: row.value })) })), actions: dependencyActions.filter((action) => action.ruleId === dependency.id).map((action) => ({ id: action.id, actionType: action.actionType, targetType: action.targetType, targetId: action.targetId, requiredValue: action.requiredValue, stackable: action.stackable, rule: action.priceRuleId ? toRule(rules.find((row) => row.id === action.priceRuleId), amounts.find((row) => row.priceRuleId === action.priceRuleId)?.amountMinor, percents.find((row) => row.priceRuleId === action.priceRuleId)?.percentageBps, currencyCode) : null })) })),
    });
    return result;
  }
}

function toRule(rule: typeof componentPriceRule.$inferSelect | undefined, amount: number | undefined, bps: number | undefined, currencyCode: string): Catalog.CheckoutComponentPriceRuleSnapshot {
  if (!rule || rule.strategy === "BASE") return { strategy: "BASE" };
  if (rule.strategy === "FREE") return { strategy: "FREE" };
  if (rule.strategy === "OVERRIDE") return { strategy: "OVERRIDE", amount: { amountMinor: String(amount ?? 0), currencyCode } };
  return { strategy: "ADJUSTMENT", operation: rule.operation!, value: rule.valueType === "PERCENTAGE" ? { type: "PERCENTAGE", percentageBps: bps ?? 0 } : { type: "FIXED_AMOUNT", amount: { amountMinor: String(amount ?? 0), currencyCode } } };
}

function sorted(values: string[]): string[] { return [...new Set(values)].sort((a, b) => a.localeCompare(b)); }
