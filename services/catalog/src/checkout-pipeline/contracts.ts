import type { Catalog } from "@shopana/broker-types";

export interface CheckoutCatalogRow {
  variant: {
    id: string;
    productId: string;
    sku: string | null;
  };
  product: { publishedAt: string | null } | null;
  prices: Array<{
    id: string;
    variantId: string;
    amountMinor: number;
    compareAtMinor: number | null;
    effectiveFrom: string;
    effectiveTo: string | null;
  }>;
  supportsCurrency: boolean;
  inventory: {
    sku: string | null;
    trackInventory: boolean;
    continueSellingWhenOutOfStock: boolean;
    requiresShipping: boolean;
  } | null;
  stocks: Array<{
    quantityOnHand: number;
    reservedQty: number;
    unavailableQty: number;
  }>;
  titles: {
    requestedVariant: string | null;
    defaultVariant: string | null;
    requestedProduct: string | null;
    defaultProduct: string | null;
  };
  targeting: {
    categoryIds: string[];
    tagIds: string[];
    featureIds: string[];
    optionValueIds: string[];
  };
  firstMediaId: string | null;
  configuration: ComponentConfigurationRead | null;
}

export interface ComponentConfigurationRead {
  id: string;
  updatedAt: string;
  groups: Array<{
    id: string;
    minSelection: number | null;
    maxSelection: number | null;
    sortIndex: number;
  }>;
  items: Array<{
    id: string;
    groupId: string;
    itemType: string;
    refProductId: string | null;
    refVariantId: string | null;
    minQty: number | null;
    maxQty: number | null;
    visible: boolean;
    sortIndex: number;
    updatedAt: string;
    rule: Catalog.CheckoutComponentPriceRuleSnapshot;
  }>;
  dependencyRules: Array<{
    id: string;
    priority: number;
    logicOperator: string;
    groups: Array<{
      id: string;
      logicOperator: string;
      conditions: Array<{
        subject: string;
        operator: string;
        targetType: string;
        targetId: string;
        value: number | null;
      }>;
    }>;
    actions: Array<{
      id: string;
      actionType: string;
      targetType: string;
      targetId: string;
      requiredValue: boolean | null;
      stackable: boolean;
      rule: Catalog.CheckoutComponentPriceRuleSnapshot | null;
    }>;
  }>;
}

export interface FlatCheckoutMerchandiseLine {
  input: Catalog.ResolveCheckoutMerchandiseLineInput;
  parentLineId: string | null;
  absoluteQuantity: number;
}

export interface CheckoutMerchandiseReadInput {
  storeId: string;
  variantIds: string[];
  currencyCode: string;
  requestedLocale: string;
  defaultLocale: string;
  effectiveAt: string;
}

export interface CheckoutMerchandiseSourceReader {
  read(input: CheckoutMerchandiseReadInput): Promise<Map<string, CheckoutCatalogRow>>;
}

export interface ResolvedCheckoutMerchandiseEntry {
  source: FlatCheckoutMerchandiseLine;
  row: CheckoutCatalogRow;
}
