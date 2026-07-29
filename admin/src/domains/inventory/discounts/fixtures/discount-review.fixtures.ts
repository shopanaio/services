import type {
  ApiDiscount,
  ApiDiscountConnection,
  ApiPageInfo,
} from "@/graphql/types";
import {
  CurrencyCode,
  DiscountAllocationMethod,
  DiscountBuyerContextType,
  DiscountClass,
  DiscountCodeStatus,
  DiscountEffectiveStatus,
  DiscountExternalSyncDirection,
  DiscountExternalSyncStatus,
  DiscountKind,
  DiscountMethod,
  DiscountRedemptionStatus,
  DiscountReferenceStatus,
  DiscountRequirementType,
  DiscountState,
  DiscountTargetRole,
  DiscountTargetType,
  DiscountValueType,
} from "@/graphql/types";

/**
 * Temporary review mode. Keep list and details fixtures behind one switch so
 * restoring live API data only requires changing this value to false.
 */
export const DISCOUNT_REVIEW_FIXTURES_ENABLED = true;

const pageInfo: ApiPageInfo = {
  __typename: "PageInfo",
  endCursor: null,
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null,
};

const isoDaysFromNow = (days: number, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const createUsage = (
  usageLimit: string | null,
  committedCount: number,
  reservedCount: number,
  reversedCount: number,
) => {
  const netCommittedCount = Math.max(0, committedCount - reversedCount);
  const consumedCount = netCommittedCount + reservedCount;
  const remainingCount =
    usageLimit == null
      ? null
      : String(Math.max(0, Number(usageLimit) - consumedCount));

  return {
    __typename: "DiscountUsageSummary",
    committedCount: String(committedCount),
    consumedCount: String(consumedCount),
    netCommittedCount: String(netCommittedCount),
    remainingCount,
    reservedCount: String(reservedCount),
    reversedCount: String(reversedCount),
    updatedAt: isoDaysFromNow(0),
    usageLimit,
    version: "18",
  };
};

const createRedemptions = (
  prefix: string,
  count: number,
  amountMinor: number,
) => ({
  __typename: "DiscountRedemptionConnection",
  edges: Array.from({ length: Math.min(count, 12) }, (_, index) => {
    const reversed = index === 5;
    const committedAt = isoDaysFromNow(-(index % 11), 10 + (index % 8));
    return {
      __typename: "DiscountRedemptionEdge",
      cursor: `${prefix}-redemption-cursor-${index + 1}`,
      node: {
        __typename: "DiscountRedemption",
        id: `${prefix}-redemption-${index + 1}`,
        orderId: `${prefix}-order-${1000 + index}`,
        status: reversed
          ? DiscountRedemptionStatus.Reversed
          : DiscountRedemptionStatus.Committed,
        amountMinor: String(amountMinor),
        committedAt,
        reversedAt: reversed ? isoDaysFromNow(-(index % 10), 18) : null,
      },
    };
  }),
  pageInfo,
  totalCount: count,
});

interface ReviewCodeInput {
  code: string;
  status?: DiscountCodeStatus;
  usageLimit?: number | null;
  used: number;
  reserved?: number;
}

const createCodes = (prefix: string, inputs: ReviewCodeInput[]) => ({
  __typename: "DiscountCodeConnection",
  edges: inputs.map((input, index) => {
    const status = input.status ?? DiscountCodeStatus.Active;
    const reserved = input.reserved ?? 0;
    const usageLimit = input.usageLimit ?? null;
    return {
      __typename: "DiscountCodeEdge",
      cursor: `${prefix}-code-cursor-${index + 1}`,
      node: {
        __typename: "DiscountCode",
        id: `${prefix}-code-${index + 1}`,
        code: input.code,
        normalizedCode: input.code.toUpperCase(),
        status,
        usageLimit: usageLimit == null ? null : String(usageLimit),
        reservedCount: String(reserved),
        committedCount: String(input.used),
        reversedCount: index === 1 ? "2" : "0",
        usageCount: String(input.used),
        remainingCount:
          usageLimit == null
            ? null
            : String(Math.max(0, usageLimit - input.used - reserved)),
        createdAt: isoDaysFromNow(-45 - index),
        updatedAt: isoDaysFromNow(-index),
        disabledAt:
          status === DiscountCodeStatus.Disabled ? isoDaysFromNow(-2) : null,
      },
    };
  }),
  pageInfo,
  totalCount: inputs.length,
});

const createExternalReferences = (
  prefix: string,
  withFailure = false,
) => ({
  __typename: "DiscountExternalReferenceConnection",
  edges: [
    {
      __typename: "DiscountExternalReferenceEdge",
      cursor: `${prefix}-external-cursor-1`,
      node: {
        __typename: "DiscountExternalReference",
        id: `${prefix}-external-1`,
        externalSystem: "Shopify",
        externalType: "price_rule",
        externalId: `gid://shopify/PriceRule/${prefix}`,
        externalUrl: `https://admin.shopify.com/discounts/${prefix}`,
        direction: DiscountExternalSyncDirection.Bidirectional,
        syncStatus: DiscountExternalSyncStatus.Synced,
        lastSyncedAt: isoDaysFromNow(0, 9),
        lastError: null,
        createdAt: isoDaysFromNow(-60),
        updatedAt: isoDaysFromNow(0, 9),
      },
    },
    {
      __typename: "DiscountExternalReferenceEdge",
      cursor: `${prefix}-external-cursor-2`,
      node: {
        __typename: "DiscountExternalReference",
        id: `${prefix}-external-2`,
        externalSystem: "Klaviyo",
        externalType: "campaign",
        externalId: `campaign-${prefix}`,
        externalUrl: null,
        direction: DiscountExternalSyncDirection.Export,
        syncStatus: withFailure
          ? DiscountExternalSyncStatus.Failed
          : DiscountExternalSyncStatus.Pending,
        lastSyncedAt: withFailure ? isoDaysFromNow(-3) : null,
        lastError: withFailure
          ? "The campaign rejected the latest promotion update."
          : null,
        createdAt: isoDaysFromNow(-30),
        updatedAt: isoDaysFromNow(-1),
      },
    },
  ],
  pageInfo,
  totalCount: 2,
});

const channels = [
  {
    __typename: "DiscountChannel",
    code: "online-store",
    featured: true,
    createdAt: isoDaysFromNow(-90),
    updatedAt: isoDaysFromNow(-2),
  },
  {
    __typename: "DiscountChannel",
    code: "mobile-app",
    featured: false,
    createdAt: isoDaysFromNow(-72),
    updatedAt: isoDaysFromNow(-4),
  },
  {
    __typename: "DiscountChannel",
    code: "point-of-sale",
    featured: false,
    createdAt: isoDaysFromNow(-55),
    updatedAt: isoDaysFromNow(-6),
  },
];

const combinations = [
  {
    __typename: "DiscountCombination",
    discountClass: DiscountClass.Product,
    createdAt: isoDaysFromNow(-50),
  },
  {
    __typename: "DiscountCombination",
    discountClass: DiscountClass.Shipping,
    createdAt: isoDaysFromNow(-50),
  },
];

const allCustomers = {
  __typename: "DiscountBuyerContext",
  type: DiscountBuyerContextType.All,
  customers: [],
  segments: [],
  createdAt: isoDaysFromNow(-90),
  updatedAt: isoDaysFromNow(-3),
};

const selectedCustomers = {
  __typename: "DiscountBuyerContext",
  type: DiscountBuyerContextType.Customers,
  customers: [
    {
      __typename: "DiscountEligibleCustomer",
      customerId: "gid-review-customer-olivia",
      customer: {
        __typename: "Customer",
        id: "gid-review-customer-olivia",
        displayName: "Olivia Martin",
        email: "olivia.martin@example.com",
      },
      referenceStatus: DiscountReferenceStatus.Valid,
      referenceCheckedAt: isoDaysFromNow(-1),
      referenceStatusChangedAt: null,
      createdAt: isoDaysFromNow(-42),
    },
    {
      __typename: "DiscountEligibleCustomer",
      customerId: "gid-review-customer-jackson",
      customer: {
        __typename: "Customer",
        id: "gid-review-customer-jackson",
        displayName: "Jackson Lee",
        email: "jackson.lee@example.com",
      },
      referenceStatus: DiscountReferenceStatus.Valid,
      referenceCheckedAt: isoDaysFromNow(-1),
      referenceStatusChangedAt: null,
      createdAt: isoDaysFromNow(-38),
    },
    {
      __typename: "DiscountEligibleCustomer",
      customerId: "gid-review-customer-stale",
      customer: null,
      referenceStatus: DiscountReferenceStatus.Stale,
      referenceCheckedAt: isoDaysFromNow(-2),
      referenceStatusChangedAt: isoDaysFromNow(-2),
      createdAt: isoDaysFromNow(-35),
    },
  ],
  segments: [],
  createdAt: isoDaysFromNow(-45),
  updatedAt: isoDaysFromNow(-1),
};

const selectedSegments = {
  __typename: "DiscountBuyerContext",
  type: DiscountBuyerContextType.Segments,
  customers: [],
  segments: [
    {
      __typename: "DiscountEligibleSegment",
      segmentId: "gid-review-segment-vip",
      referenceStatus: DiscountReferenceStatus.Valid,
      referenceCheckedAt: isoDaysFromNow(-1),
      referenceStatusChangedAt: null,
      createdAt: isoDaysFromNow(-80),
    },
    {
      __typename: "DiscountEligibleSegment",
      segmentId: "gid-review-segment-repeat-buyers",
      referenceStatus: DiscountReferenceStatus.Valid,
      referenceCheckedAt: isoDaysFromNow(-1),
      referenceStatusChangedAt: null,
      createdAt: isoDaysFromNow(-70),
    },
  ],
  createdAt: isoDaysFromNow(-82),
  updatedAt: isoDaysFromNow(-1),
};

interface BaseFixtureInput {
  id: string;
  title: string;
  method: DiscountMethod;
  kind: DiscountKind;
  discountClass: DiscountClass;
  effectiveStatus: DiscountEffectiveStatus;
  state: DiscountState;
  primaryCode?: string | null;
  usageLimit?: string | null;
  committedCount: number;
  reservedCount: number;
  reversedCount: number;
  redemptionCount: number;
  amountMinor: number;
  overrides: Record<string, unknown>;
}

const createDiscountFixture = ({
  id,
  title,
  method,
  kind,
  discountClass,
  effectiveStatus,
  state,
  primaryCode = null,
  usageLimit = null,
  committedCount,
  reservedCount,
  reversedCount,
  redemptionCount,
  amountMinor,
  overrides,
}: BaseFixtureInput): ApiDiscount => {
  const usage = createUsage(
    usageLimit,
    committedCount,
    reservedCount,
    reversedCount,
  );

  return {
    __typename: "Discount",
    id,
    revision: 18,
    title,
    primaryCode,
    codesCount: 0,
    method,
    kind,
    discountClass,
    currency: CurrencyCode.Usd,
    state,
    effectiveStatus,
    priority: 10,
    usageLimit,
    reservedUsageCount: usage.reservedCount,
    usageCount: usage.netCommittedCount,
    appliesOncePerCustomer: method === DiscountMethod.Code,
    appliesOnOneTimePurchase: true,
    appliesOnSubscription: true,
    startsAt: isoDaysFromNow(-30),
    endsAt: isoDaysFromNow(30),
    tags: ["review", "campaign", "high-priority"],
    channelCodes: channels.map((channel) => channel.code),
    featuredChannelCodes: channels
      .filter((channel) => channel.featured)
      .map((channel) => channel.code),
    combinesWithProductDiscounts: true,
    combinesWithOrderDiscounts: false,
    combinesWithShippingDiscounts: true,
    createdById: "gid-review-user-merchandising",
    metadata: {
      reviewFixture: true,
      owner: "Merchandising",
      campaign: "Summer 2026",
    },
    createdAt: isoDaysFromNow(-90),
    updatedAt: isoDaysFromNow(-1),
    archivedAt: null,
    rule: null,
    minimumRequirement: null,
    targetSelections: [],
    buyerContext: allCustomers,
    channels,
    combinations,
    usage,
    codes: createCodes(id, []),
    usageReservations: {
      __typename: "DiscountUsageReservationConnection",
      edges: [],
      pageInfo,
      totalCount: reservedCount,
    },
    redemptions: createRedemptions(
      id,
      redemptionCount,
      amountMinor,
    ),
    externalReferences: createExternalReferences(id),
    ...overrides,
  } as unknown as ApiDiscount;
};

const amountOffProducts = createDiscountFixture({
  id: "review-discount-products-20-percent",
  title: "Summer Essentials — 20% off",
  method: DiscountMethod.Automatic,
  kind: DiscountKind.AmountOffProducts,
  discountClass: DiscountClass.Product,
  effectiveStatus: DiscountEffectiveStatus.Active,
  state: DiscountState.Active,
  committedCount: 184,
  reservedCount: 12,
  reversedCount: 7,
  redemptionCount: 177,
  amountMinor: 2800,
  overrides: {
    appliesOncePerCustomer: false,
    appliesOnSubscription: false,
    priority: 50,
    tags: ["summer-2026", "essentials", "automatic", "featured"],
    rule: {
      __typename: "DiscountAmountOffRule",
      valueType: DiscountValueType.Percentage,
      percentageBps: 2000,
      amountMinor: null,
      allocationMethod: DiscountAllocationMethod.Across,
      maximumDiscountMinor: "15000",
    },
    minimumRequirement: {
      __typename: "DiscountMinimumRequirement",
      requirementType: DiscountRequirementType.Subtotal,
      subtotalMinor: "5000",
      quantity: null,
    },
    targetSelections: [
      {
        __typename: "DiscountTargetSelection",
        role: DiscountTargetRole.Benefit,
        targetType: DiscountTargetType.Products,
        targets: [
          ["linen-shirt", "Linen Shirt", "linen-shirt"],
          ["canvas-tote", "Everyday Canvas Tote", "canvas-tote"],
          ["summer-hat", "Wide-brim Summer Hat", "summer-hat"],
          ["leather-sandal", "Leather Sandals", "leather-sandals"],
          ["travel-bottle", "Insulated Travel Bottle", "travel-bottle"],
        ].map(([targetId, productTitle, handle], index) => ({
          __typename: "DiscountTarget",
          targetId: `gid-review-product-${targetId}`,
          targetType: DiscountTargetType.Products,
          target: {
            __typename: "Product",
            id: `gid-review-product-${targetId}`,
            title: productTitle,
            handle,
          },
          referenceStatus:
            index === 4
              ? DiscountReferenceStatus.Stale
              : DiscountReferenceStatus.Valid,
          referenceStatusChangedAt:
            index === 4 ? isoDaysFromNow(-4) : null,
          referenceCheckedAt: isoDaysFromNow(-1),
          createdAt: isoDaysFromNow(-75),
        })),
      },
    ],
  },
});

const amountOffOrderCodes = createCodes(
  "review-discount-welcome-25",
  [
    { code: "WELCOME25", usageLimit: 300, used: 126, reserved: 8 },
    { code: "HELLO25", usageLimit: 150, used: 74, reserved: 3 },
    {
      code: "OLDWELCOME",
      status: DiscountCodeStatus.Disabled,
      usageLimit: 50,
      used: 38,
    },
  ],
);

const amountOffOrder = createDiscountFixture({
  id: "review-discount-welcome-25",
  title: "Welcome offer — $25 off",
  method: DiscountMethod.Code,
  kind: DiscountKind.AmountOffOrder,
  discountClass: DiscountClass.Order,
  effectiveStatus: DiscountEffectiveStatus.Active,
  state: DiscountState.Active,
  primaryCode: "WELCOME25",
  usageLimit: "500",
  committedCount: 238,
  reservedCount: 11,
  reversedCount: 9,
  redemptionCount: 229,
  amountMinor: 2500,
  overrides: {
    codesCount: amountOffOrderCodes.totalCount,
    codes: amountOffOrderCodes,
    buyerContext: selectedCustomers,
    tags: ["acquisition", "welcome", "code", "crm"],
    rule: {
      __typename: "DiscountAmountOffRule",
      valueType: DiscountValueType.FixedAmount,
      percentageBps: null,
      amountMinor: "2500",
      allocationMethod: DiscountAllocationMethod.Across,
      maximumDiscountMinor: null,
    },
    minimumRequirement: {
      __typename: "DiscountMinimumRequirement",
      requirementType: DiscountRequirementType.Subtotal,
      subtotalMinor: "10000",
      quantity: null,
    },
    combinations: [
      {
        __typename: "DiscountCombination",
        discountClass: DiscountClass.Product,
        createdAt: isoDaysFromNow(-40),
      },
      {
        __typename: "DiscountCombination",
        discountClass: DiscountClass.Shipping,
        createdAt: isoDaysFromNow(-40),
      },
    ],
    externalReferences: createExternalReferences(
      "review-discount-welcome-25",
      true,
    ),
  },
});

const buyXGetYCodes = createCodes("review-discount-buy-two-get-one", [
  { code: "3FOR2TEES", usageLimit: 250, used: 61, reserved: 5 },
  { code: "TEAM3FOR2", usageLimit: 100, used: 24, reserved: 2 },
]);

const buyXGetY = createDiscountFixture({
  id: "review-discount-buy-two-get-one",
  title: "Buy 2 tees, get 1 free",
  method: DiscountMethod.Code,
  kind: DiscountKind.BuyXGetY,
  discountClass: DiscountClass.Product,
  effectiveStatus: DiscountEffectiveStatus.Scheduled,
  state: DiscountState.Active,
  primaryCode: "3FOR2TEES",
  usageLimit: "350",
  committedCount: 85,
  reservedCount: 7,
  reversedCount: 3,
  redemptionCount: 82,
  amountMinor: 3200,
  overrides: {
    startsAt: isoDaysFromNow(2),
    endsAt: isoDaysFromNow(16),
    codesCount: buyXGetYCodes.totalCount,
    codes: buyXGetYCodes,
    buyerContext: selectedSegments,
    tags: ["bundles", "t-shirts", "vip", "scheduled"],
    rule: {
      __typename: "DiscountBuyXGetYRule",
      requirementType: DiscountRequirementType.Quantity,
      requiredQuantity: 2,
      requiredSubtotalMinor: null,
      benefitQuantity: 1,
      benefitValueType: DiscountValueType.Free,
      benefitPercentageBps: null,
      benefitAmountMinor: null,
      usesPerOrderLimit: 2,
    },
    targetSelections: [
      {
        __typename: "DiscountTargetSelection",
        role: DiscountTargetRole.Qualifier,
        targetType: DiscountTargetType.Variants,
        targets: [
          ["black-m", "classic-tee-black-m", "Classic Tee", "TEE-BLK-M"],
          ["white-l", "classic-tee-white-l", "Classic Tee", "TEE-WHT-L"],
        ].map(([targetId, handle, productTitle, sku]) => ({
          __typename: "DiscountTarget",
          targetId: `gid-review-variant-${targetId}`,
          targetType: DiscountTargetType.Variants,
          target: {
            __typename: "Variant",
            id: `gid-review-variant-${targetId}`,
            handle,
            product: {
              __typename: "Product",
              id: "gid-review-product-classic-tee",
              title: productTitle,
            },
            inventoryItem: { __typename: "InventoryItem", sku },
          },
          referenceStatus: DiscountReferenceStatus.Valid,
          referenceStatusChangedAt: null,
          referenceCheckedAt: isoDaysFromNow(-1),
          createdAt: isoDaysFromNow(-20),
        })),
      },
      {
        __typename: "DiscountTargetSelection",
        role: DiscountTargetRole.Benefit,
        targetType: DiscountTargetType.Products,
        targets: [
          {
            __typename: "DiscountTarget",
            targetId: "gid-review-product-classic-tee",
            targetType: DiscountTargetType.Products,
            target: {
              __typename: "Product",
              id: "gid-review-product-classic-tee",
              title: "Classic Cotton Tee",
              handle: "classic-cotton-tee",
            },
            referenceStatus: DiscountReferenceStatus.Valid,
            referenceStatusChangedAt: null,
            referenceCheckedAt: isoDaysFromNow(-1),
            createdAt: isoDaysFromNow(-20),
          },
        ],
      },
    ],
  },
});

const freeShipping = createDiscountFixture({
  id: "review-discount-free-shipping-75",
  title: "Free shipping over $75",
  method: DiscountMethod.Automatic,
  kind: DiscountKind.FreeShipping,
  discountClass: DiscountClass.Shipping,
  effectiveStatus: DiscountEffectiveStatus.Paused,
  state: DiscountState.Paused,
  committedCount: 412,
  reservedCount: 0,
  reversedCount: 14,
  redemptionCount: 398,
  amountMinor: 1299,
  overrides: {
    endsAt: null,
    appliesOnSubscription: false,
    tags: ["shipping", "always-on", "domestic", "paused"],
    rule: {
      __typename: "DiscountFreeShippingRule",
      maximumShippingPriceMinor: "2500",
    },
    minimumRequirement: {
      __typename: "DiscountMinimumRequirement",
      requirementType: DiscountRequirementType.Subtotal,
      subtotalMinor: "7500",
      quantity: null,
    },
    buyerContext: allCustomers,
    combinations: [
      {
        __typename: "DiscountCombination",
        discountClass: DiscountClass.Product,
        createdAt: isoDaysFromNow(-90),
      },
      {
        __typename: "DiscountCombination",
        discountClass: DiscountClass.Order,
        createdAt: isoDaysFromNow(-90),
      },
    ],
  },
});

export const discountReviewFixtures: ApiDiscount[] = [
  amountOffProducts,
  amountOffOrder,
  buyXGetY,
  freeShipping,
];

export const discountReviewConnection = {
  __typename: "DiscountConnection",
  edges: discountReviewFixtures.map((discount, index) => ({
    __typename: "DiscountEdge",
    cursor: `review-discount-cursor-${index + 1}`,
    node: discount,
  })),
  pageInfo,
  totalCount: discountReviewFixtures.length,
} as ApiDiscountConnection;

export function getDiscountReviewFixture(id?: string | null) {
  if (!id) return null;
  return discountReviewFixtures.find((discount) => discount.id === id) ?? null;
}
