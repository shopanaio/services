import type {
  ApiProduct,
  ApiProductComponent,
  ApiProductComponentAdjustmentPriceRule,
  ApiProductComponentBasePriceRule,
  ApiProductComponentConfiguration,
  ApiProductComponentCondition,
  ApiProductComponentConditionGroup,
  ApiProductComponentDependencyAction,
  ApiProductComponentDependencyRule,
  ApiProductComponentGroup,
  ApiProductComponentItem,
  ApiProductComponentFreePriceRule,
  ApiProductComponentOverridePriceRule,
  ApiProductComponentPriceRule,
  ApiProductComponentPricingTemplate,
} from "@/graphql/types";
import {
  CurrencyCode,
  PriceAdjustmentOperation,
  PriceAdjustmentValueType,
  ProductComponentConditionCategory,
  ProductComponentConditionOperator,
  ProductComponentConditionSubject,
  ProductComponentDependencyActionType,
  ProductComponentDependencyTargetType,
  ProductComponentDisplayStyle,
  ProductComponentItemType,
  ProductComponentLogicOperator,
  ProductComponentPriceStrategy,
} from "@/graphql/types";

const MOCK_DATE = "2026-01-15T12:00:00.000Z";

const basePriceRule = (id: string): ApiProductComponentBasePriceRule => ({
  __typename: "ProductComponentBasePriceRule",
  id,
  strategy: ProductComponentPriceStrategy.Base,
});

const freePriceRule = (id: string): ApiProductComponentFreePriceRule => ({
  __typename: "ProductComponentFreePriceRule",
  id,
  strategy: ProductComponentPriceStrategy.Free,
});

const percentageDiscountRule = (
  id: string,
  percentageBps: number,
): ApiProductComponentAdjustmentPriceRule => ({
  __typename: "ProductComponentAdjustmentPriceRule",
  id,
  strategy: ProductComponentPriceStrategy.Adjustment,
  operation: PriceAdjustmentOperation.Decrease,
  valueType: PriceAdjustmentValueType.Percentage,
  percentageBps,
  amounts: [],
});

const fixedDiscountRule = (
  id: string,
  amountMinor: number,
): ApiProductComponentAdjustmentPriceRule => ({
  __typename: "ProductComponentAdjustmentPriceRule",
  id,
  strategy: ProductComponentPriceStrategy.Adjustment,
  operation: PriceAdjustmentOperation.Decrease,
  valueType: PriceAdjustmentValueType.FixedAmount,
  percentageBps: null,
  amounts: [
    {
      __typename: "ProductComponentPriceRuleAmount",
      currency: CurrencyCode.Usd,
      amountMinor,
    },
  ],
});

const overridePriceRule = (
  id: string,
  amountMinor: number,
): ApiProductComponentOverridePriceRule => ({
  __typename: "ProductComponentOverridePriceRule",
  id,
  strategy: ProductComponentPriceStrategy.Override,
  amounts: [
    {
      __typename: "ProductComponentPriceRuleAmount",
      currency: CurrencyCode.Usd,
      amountMinor,
    },
  ],
});

const createReferencedProduct = (product: ApiProduct, id: string, title: string): ApiProduct => ({
  ...product,
  id,
  title,
  productComponent: null,
});

const createItem = (
  group: ApiProductComponentGroup,
  product: ApiProduct,
  input: {
    id: string;
    title: string;
    sortIndex: number;
    minQty?: number | null;
    maxQty?: number | null;
    priceRule: ApiProductComponentPriceRule;
  },
): ApiProductComponentItem => ({
  __typename: "ProductComponentItem",
  id: input.id,
  group,
  itemType: ProductComponentItemType.Product,
  sortIndex: input.sortIndex,
  title: input.title,
  visible: true,
  selected: false,
  minQty: input.minQty ?? null,
  maxQty: input.maxQty ?? null,
  defaultQty: 1,
  featuredImage: null,
  refProduct: createReferencedProduct(product, `product-${input.id}`, input.title),
  refVariant: null,
  optionSelections: [],
  priceRule: input.priceRule,
  pricingTemplate: null,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
});

const createGroups = (product: ApiProduct): ApiProductComponentGroup[] => {
  const accessories: ApiProductComponentGroup = {
    __typename: "ProductComponentGroup",
    id: "grp-1",
    title: "Accessories",
    sortIndex: 0,
    minSelection: 1,
    maxSelection: 5,
    items: [],
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
  };
  const warranty: ApiProductComponentGroup = {
    __typename: "ProductComponentGroup",
    id: "grp-2",
    title: "Warranty",
    sortIndex: 1,
    minSelection: null,
    maxSelection: 1,
    items: [],
    createdAt: MOCK_DATE,
    updatedAt: MOCK_DATE,
  };

  accessories.items = [
    createItem(accessories, product, {
      id: "item-1",
      title: "Premium Case",
      sortIndex: 0,
      minQty: 1,
      maxQty: 3,
      priceRule: basePriceRule("price-rule-item-1"),
    }),
    createItem(accessories, product, {
      id: "item-2",
      title: "Pro Charger 65W",
      sortIndex: 1,
      maxQty: 2,
      priceRule: percentageDiscountRule("price-rule-item-2", 1_000),
    }),
    createItem(accessories, product, {
      id: "item-3",
      title: "Screen Protector",
      sortIndex: 2,
      priceRule: freePriceRule("price-rule-item-3"),
    }),
  ];
  warranty.items = [
    createItem(warranty, product, {
      id: "item-4",
      title: "1 Year Standard Warranty (included)",
      sortIndex: 0,
      maxQty: 1,
      priceRule: freePriceRule("price-rule-item-4"),
    }),
    createItem(warranty, product, {
      id: "item-5",
      title: "2 Year Extended Warranty",
      sortIndex: 1,
      maxQty: 1,
      priceRule: overridePriceRule("price-rule-item-5", 12_990),
    }),
  ];

  return [accessories, warranty];
};

const createPricingTemplates = (): ApiProductComponentPricingTemplate[] => [
  {
    __typename: "ProductComponentPricingTemplate",
    id: "tpl-1",
    name: "Bundle Discount",
    sortIndex: 0,
    priceRule: percentageDiscountRule("template-price-rule-1", 1_500),
  },
  {
    __typename: "ProductComponentPricingTemplate",
    id: "tpl-2",
    name: "Premium Fixed",
    sortIndex: 1,
    priceRule: overridePriceRule("template-price-rule-2", 2_999),
  },
  {
    __typename: "ProductComponentPricingTemplate",
    id: "tpl-3",
    name: "Free Accessory",
    sortIndex: 2,
    priceRule: freePriceRule("template-price-rule-3"),
  },
];

type ConditionInput = Pick<
  ApiProductComponentCondition,
  "category" | "subject" | "operator" | "targetType" | "targetId"
> & { value?: number };

const createCondition = (
  id: string,
  sortIndex: number,
  input: ConditionInput,
): ApiProductComponentCondition => ({
  __typename: "ProductComponentCondition",
  id,
  sortIndex,
  ...input,
  value: input.value ?? null,
});

const createConditionGroup = (
  id: string,
  logicOperator: ProductComponentLogicOperator,
  conditions: ApiProductComponentCondition[],
): ApiProductComponentConditionGroup => ({
  __typename: "ProductComponentConditionGroup",
  id,
  logicOperator,
  sortIndex: 0,
  conditions,
});

type ActionInput = Pick<
  ApiProductComponentDependencyAction,
  "actionType" | "targetType" | "targetId"
> & {
  requiredValue?: boolean;
  priceRule?: ApiProductComponentPriceRule;
};

const createAction = (
  id: string,
  sortIndex: number,
  input: ActionInput,
): ApiProductComponentDependencyAction => ({
  __typename: "ProductComponentDependencyAction",
  id,
  sortIndex,
  actionType: input.actionType,
  targetType: input.targetType,
  targetId: input.targetId,
  requiredValue: input.requiredValue ?? null,
  priceRule: input.priceRule ?? null,
  stackable: false,
});

const createRule = (input: {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  logicOperator: ProductComponentLogicOperator;
  conditions: ApiProductComponentCondition[];
  conditionLogicOperator?: ProductComponentLogicOperator;
  actions: ApiProductComponentDependencyAction[];
}): ApiProductComponentDependencyRule => ({
  __typename: "ProductComponentDependencyRule",
  id: input.id,
  name: input.name,
  enabled: input.enabled,
  priority: input.priority,
  logicOperator: input.logicOperator,
  conditionGroups: [
    createConditionGroup(
      `${input.id.replace("rule-", "grp-")}-1`,
      input.conditionLogicOperator ?? ProductComponentLogicOperator.And,
      input.conditions,
    ),
  ],
  actions: input.actions,
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
});

const createDependencyRules = (configurationId: string): ApiProductComponentDependencyRule[] => [
  createRule({
    id: "rule-1",
    name: "Premium case hides screen protector",
    enabled: true,
    priority: 1_000,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-1-1", 0, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-1",
      }),
    ],
    actions: [
      createAction("act-1-1", 0, {
        actionType: ProductComponentDependencyActionType.Hide,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-3",
      }),
    ],
  }),
  createRule({
    id: "rule-2",
    name: "Charger + Accessories group shows warranty",
    enabled: true,
    priority: 900,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-2-1", 0, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-2",
      }),
      createCondition("cond-2-2", 1, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.GroupTotalQty,
        operator: ProductComponentConditionOperator.Gte,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-1",
        value: 2,
      }),
    ],
    actions: [
      createAction("act-2-1", 0, {
        actionType: ProductComponentDependencyActionType.Show,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-5",
      }),
    ],
  }),
  createRule({
    id: "rule-3",
    name: "Bulk case order gives discount + shows warranty",
    enabled: true,
    priority: 800,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-3-1", 0, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.ItemQty,
        operator: ProductComponentConditionOperator.Gte,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-1",
        value: 2,
      }),
    ],
    actions: [
      createAction("act-3-1", 0, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-3",
        priceRule: percentageDiscountRule("act-3-1-price", 2_000),
      }),
      createAction("act-3-2", 1, {
        actionType: ProductComponentDependencyActionType.Show,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-2",
      }),
    ],
  }),
  createRule({
    id: "rule-4",
    name: "Full bundle discount",
    enabled: true,
    priority: 700,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-4-1", 0, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-1",
      }),
      createCondition("cond-4-2", 1, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-2",
      }),
      createCondition("cond-4-3", 2, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-4",
      }),
    ],
    actions: [
      createAction("act-4-1", 0, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Configuration,
        targetId: configurationId,
        priceRule: percentageDiscountRule("act-4-1-price", 1_500),
      }),
    ],
  }),
  createRule({
    id: "rule-5",
    name: "Group selection unlocks extras",
    enabled: true,
    priority: 600,
    logicOperator: ProductComponentLogicOperator.Or,
    conditionLogicOperator: ProductComponentLogicOperator.Or,
    conditions: [
      createCondition("cond-5-1", 0, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.GroupTotalQty,
        operator: ProductComponentConditionOperator.Gte,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-1",
        value: 3,
      }),
      createCondition("cond-5-2", 1, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.GroupTotalQty,
        operator: ProductComponentConditionOperator.Gte,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-2",
        value: 1,
      }),
    ],
    actions: [
      createAction("act-5-1", 0, {
        actionType: ProductComponentDependencyActionType.Show,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-3",
      }),
      createAction("act-5-2", 1, {
        actionType: ProductComponentDependencyActionType.Show,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-4",
      }),
      createAction("act-5-3", 2, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-5",
        priceRule: freePriceRule("act-5-3-price"),
      }),
    ],
  }),
  createRule({
    id: "rule-6",
    name: "No case requires warranty selection",
    enabled: false,
    priority: 500,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-6-1", 0, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsNotSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-1",
      }),
    ],
    actions: [
      createAction("act-6-1", 0, {
        actionType: ProductComponentDependencyActionType.SetRequired,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-2",
        requiredValue: true,
      }),
    ],
  }),
  createRule({
    id: "rule-7",
    name: "Exact quantity bonus",
    enabled: true,
    priority: 400,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-7-1", 0, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.ItemQty,
        operator: ProductComponentConditionOperator.Eq,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-2",
        value: 2,
      }),
      createCondition("cond-7-2", 1, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-3",
      }),
    ],
    actions: [
      createAction("act-7-1", 0, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-3",
        priceRule: freePriceRule("act-7-1-price"),
      }),
      createAction("act-7-2", 1, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Configuration,
        targetId: configurationId,
        priceRule: fixedDiscountRule("act-7-2-price", 5_000),
      }),
    ],
  }),
  createRule({
    id: "rule-8",
    name: "Hide standard warranty with premium setup",
    enabled: true,
    priority: 300,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-8-1", 0, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-1",
      }),
      createCondition("cond-8-2", 1, {
        category: ProductComponentConditionCategory.StateCheck,
        subject: ProductComponentConditionSubject.ItemSelected,
        operator: ProductComponentConditionOperator.IsSelected,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-5",
      }),
      createCondition("cond-8-3", 2, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.GroupTotalQty,
        operator: ProductComponentConditionOperator.Gte,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-1",
        value: 2,
      }),
    ],
    actions: [
      createAction("act-8-1", 0, {
        actionType: ProductComponentDependencyActionType.Hide,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-4",
      }),
    ],
  }),
  createRule({
    id: "rule-9",
    name: "Accessories combo deal",
    enabled: true,
    priority: 200,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-9-1", 0, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.GroupTotalQty,
        operator: ProductComponentConditionOperator.Gte,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-1",
        value: 4,
      }),
    ],
    actions: [
      createAction("act-9-1", 0, {
        actionType: ProductComponentDependencyActionType.Show,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-5",
      }),
      createAction("act-9-2", 1, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-5",
        priceRule: percentageDiscountRule("act-9-2-price", 5_000),
      }),
      createAction("act-9-3", 2, {
        actionType: ProductComponentDependencyActionType.SetRequired,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-2",
        requiredValue: false,
      }),
    ],
  }),
  createRule({
    id: "rule-10",
    name: "Minimal bundle config",
    enabled: false,
    priority: 100,
    logicOperator: ProductComponentLogicOperator.And,
    conditions: [
      createCondition("cond-10-1", 0, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.ItemQty,
        operator: ProductComponentConditionOperator.Lte,
        targetType: ProductComponentDependencyTargetType.Item,
        targetId: "item-1",
        value: 1,
      }),
      createCondition("cond-10-2", 1, {
        category: ProductComponentConditionCategory.Numeric,
        subject: ProductComponentConditionSubject.GroupTotalQty,
        operator: ProductComponentConditionOperator.Lte,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-1",
        value: 2,
      }),
    ],
    actions: [
      createAction("act-10-1", 0, {
        actionType: ProductComponentDependencyActionType.AdjustPrice,
        targetType: ProductComponentDependencyTargetType.Configuration,
        targetId: configurationId,
        priceRule: overridePriceRule("act-10-1-price", 9_999),
      }),
      createAction("act-10-2", 1, {
        actionType: ProductComponentDependencyActionType.Hide,
        targetType: ProductComponentDependencyTargetType.Group,
        targetId: "grp-2",
      }),
    ],
  }),
];

const createConfiguration = (
  product: ApiProduct,
  id: string,
  name: string,
): ApiProductComponentConfiguration => ({
  __typename: "ProductComponentConfiguration",
  id,
  name,
  product,
  variants: [],
  groups: createGroups(product),
  pricingTemplates: createPricingTemplates(),
  dependencyRules: createDependencyRules(id),
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
});

/** API-shaped ProductComponent mock rendered by the product details card. */
export const createProductComponentMockData = (product: ApiProduct): ApiProductComponent => ({
  __typename: "ProductComponent",
  id: "product-component-mock",
  product,
  displayStyle: ProductComponentDisplayStyle.Accordion,
  configurations: [
    createConfiguration(product, "bundle-config-1", "Configuration 1"),
    createConfiguration(product, "bundle-config-2", "Configuration 2"),
    createConfiguration(product, "bundle-config-3", "Configuration 3"),
  ],
  createdAt: MOCK_DATE,
  updatedAt: MOCK_DATE,
});
