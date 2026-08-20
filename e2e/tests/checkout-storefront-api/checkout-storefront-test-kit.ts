import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, parseGlobalId } from '@utils/globalid';
import postgres from 'postgres';
import { HeadlessTestKit, requiredCredentials } from '../headless-admin-api/headless-test-kit';

export type Api = ApiFixtures['api'];
export type GraphQLResponse<T> = {
  data?: T | null;
  errors?: Array<{
    message: string;
    path?: Array<string | number>;
    extensions?: { code?: string; [key: string]: unknown };
  }>;
};

export type CheckoutUserError = {
  field: string[] | null;
  message: string;
  code: string;
  retryable: boolean;
};

export type Money = { amount: number; currencyCode: string };

export type Checkout = {
  id: string;
  channelCode: string;
  localeCode: string;
  currencyCode: string;
  resultRevision: string;
  valid: boolean;
  status: 'OPEN' | 'READY' | 'PLACED' | 'EXPIRED' | 'ABANDONED';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  totalQuantity: number;
  customerNote: string | null;
  cost: {
    subtotalAmount: Money;
    totalDiscountAmount: Money;
    totalTaxAmount: Money;
    totalShippingAmount: Money;
    totalAmount: Money;
  };
  customerIdentity: {
    customer: { id: string } | null;
    email: string | null;
    phone: string | null;
    countryCode: string | null;
    firstName: string | null;
    middleName: string | null;
    lastName: string | null;
  };
  billingAddress: Address | null;
  issues: Array<{
    code: string;
    message: string;
    severity: 'WARNING' | 'ERROR';
    effect: 'CONTINUE' | 'STOP';
    field: string[];
    lineId: string | null;
    retryable: boolean;
  }>;
  notifications: Array<{
    id: string;
    code: string;
    severity: 'INFO' | 'WARNING';
    isDismissed: boolean;
  }>;
  lines: CheckoutLine[];
  tags: Array<{ id: string; slug: string; unique: boolean; createdAt: string; updatedAt: string }>;
  appliedPromoCodes: Array<{
    code: string;
    appliedAt: string;
    discountType: string;
    value: number;
    provider: string;
    conditions: unknown;
  }>;
  deliveryGroups: Array<{
    id: string;
    checkoutLines: Array<{ id: string }>;
    deliveryAddress: Address | null;
    recipient: Recipient | null;
    options: DeliveryOption[];
    selection: {
      status: 'NONE' | 'SELECTED' | 'RESET';
      option: DeliveryOption | null;
      previousOptionHandle: string | null;
      resetReason: { code: string; message: string } | null;
    };
  }>;
  payment: {
    payableAmount: Money;
    methods: Array<{
      handle: string;
      code: string;
      title: string;
      providerCode: string;
      flow: 'ONLINE' | 'OFFLINE' | 'ON_DELIVERY';
    }>;
    selection: {
      status: 'NONE' | 'SELECTED' | 'RESET';
      method: Checkout['payment']['methods'][number] | null;
      previousMethodHandle: string | null;
      resetReason: { code: string; message: string } | null;
    };
  };
  loyaltyRedemption: null | {
    quoteId: string;
    revision: string;
    redeemablePoints: string;
    availablePoints: string;
    discount: Money;
    payableAfterLoyalty: Money;
    expiresAt: string;
  };
  loyaltyRewardEntitlementId: string | null;
};

export type CheckoutLine = {
  id: string;
  title: string;
  sku: string | null;
  quantity: number;
  purchasableId: string;
  purchase: { type: string };
  attributes: unknown;
  componentItemId: string | null;
  tag: { id: string; slug: string; unique: boolean } | null;
  children: CheckoutLine[];
  cost: {
    compareAtUnitPrice: Money;
    unitPrice: Money;
    discountAmount: Money;
    subtotalAmount: Money;
    taxAmount: Money;
    totalAmount: Money;
  };
  originalPrice: Money;
  priceConfig: null | { type: string; amount: number | null; percent: number | null };
};

type Address = {
  id?: string | null;
  firstName: string | null;
  lastName: string | null;
  name: string;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  countryCode: string | null;
  provinceCode: string | null;
  zip: string | null;
  phone: string | null;
  data: unknown;
  formatted: string[];
  formattedArea: string | null;
};

type Recipient = {
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string | null;
  phone: string | null;
};

type DeliveryOption = {
  handle: string;
  code: string;
  title: string;
  description: string | null;
  deliveryMethodType: string;
  cost: Money;
  phoneRequired: boolean;
  customerInputContract: unknown;
  publicData: unknown;
  carrierCode: string | null;
};

export const USER_ERROR_FIELDS = 'field message code retryable';
export const MONEY_FIELDS = 'amount currencyCode';
export const CHECKOUT_FIELDS = `
  id channelCode localeCode currencyCode resultRevision valid status expiresAt createdAt updatedAt
  totalQuantity customerNote
  cost {
    subtotalAmount { ${MONEY_FIELDS} }
    totalDiscountAmount { ${MONEY_FIELDS} }
    totalTaxAmount { ${MONEY_FIELDS} }
    totalShippingAmount { ${MONEY_FIELDS} }
    totalAmount { ${MONEY_FIELDS} }
  }
  customerIdentity {
    customer { id } email phone countryCode firstName middleName lastName
  }
  billingAddress {
    firstName lastName name company address1 address2 city province provinceCode country
    countryCode zip phone data formatted formattedArea
  }
  issues { code message severity effect field lineId retryable }
  notifications { id code severity isDismissed }
  lines {
    id title sku quantity purchasableId componentItemId attributes
    purchase { type }
    tag { id slug unique }
    originalPrice { ${MONEY_FIELDS} }
    priceConfig { type amount percent }
    cost {
      compareAtUnitPrice { ${MONEY_FIELDS} }
      unitPrice { ${MONEY_FIELDS} }
      discountAmount { ${MONEY_FIELDS} }
      subtotalAmount { ${MONEY_FIELDS} }
      taxAmount { ${MONEY_FIELDS} }
      totalAmount { ${MONEY_FIELDS} }
    }
    children {
      id title sku quantity purchasableId componentItemId attributes
      purchase { type }
      tag { id slug unique }
      originalPrice { ${MONEY_FIELDS} }
      priceConfig { type amount percent }
      cost {
        compareAtUnitPrice { ${MONEY_FIELDS} }
        unitPrice { ${MONEY_FIELDS} }
        discountAmount { ${MONEY_FIELDS} }
        subtotalAmount { ${MONEY_FIELDS} }
        taxAmount { ${MONEY_FIELDS} }
        totalAmount { ${MONEY_FIELDS} }
      }
      children { id }
    }
  }
  tags { id slug unique createdAt updatedAt }
  appliedPromoCodes { code appliedAt discountType value provider conditions }
  deliveryGroups {
    id checkoutLines { id }
    deliveryAddress {
      id firstName lastName name company address1 address2 city province provinceCode country
      countryCode zip phone data formatted formattedArea
    }
    recipient { firstName lastName middleName email phone }
    options {
      handle code title description deliveryMethodType cost { ${MONEY_FIELDS} }
      phoneRequired customerInputContract publicData carrierCode
    }
    selection {
      status previousOptionHandle resetReason { code message }
      option {
        handle code title description deliveryMethodType cost { ${MONEY_FIELDS} }
        phoneRequired customerInputContract publicData carrierCode
      }
    }
  }
  payment {
    payableAmount { ${MONEY_FIELDS} }
    methods { handle code title providerCode flow }
    selection {
      status previousMethodHandle resetReason { code message }
      method { handle code title providerCode flow }
    }
  }
  loyaltyRedemption {
    quoteId revision redeemablePoints availablePoints
    discount { ${MONEY_FIELDS} } payableAfterLoyalty { ${MONEY_FIELDS} } expiresAt
  }
  loyaltyRewardEntitlementId
`;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:15432/portal';

export class CheckoutStorefrontTestKit {
  readonly sql = postgres(DATABASE_URL, { max: 1 });
  readonly headless: HeadlessTestKit;
  token = '';
  visitorId = `visitor-${crypto.randomUUID()}`;

  constructor(
    readonly api: Api,
    readonly request: APIRequestContext,
  ) {
    this.headless = new HeadlessTestKit(api, request);
  }

  async setup(): Promise<void> {
    await this.api.session.setupUserAndStore({
      locales: ['en', 'uk'],
      currencyCode: 'USD',
    });
    await this.headless.install();
    const created = await this.headless.create('Checkout storefront e2e', crypto.randomUUID(), [
      'storefront.catalog.read',
      'storefront.checkout.read',
      'storefront.checkout.write',
      'storefront.order.write',
    ]);
    expect(created.userErrors).toEqual([]);
    requiredCredentials(created.initialStorefrontCredentials);
    this.token = created.initialStorefrontCredentials.publicAccessToken;
  }

  async close(): Promise<void> {
    await Promise.all([this.sql.end(), this.headless.close()]);
  }

  async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
    options: { token?: string; visitorId?: string; headers?: Record<string, string> } = {},
  ): Promise<GraphQLResponse<T>> {
    const response = await this.request.post(requiredEnvironment('CLIENT_GRAPHQL_URL'), {
      headers: {
        'content-type': 'application/json',
        'x-shopana-storefront-access-token': options.token ?? this.token,
        'x-shopana-storefront-visitor-id': options.visitorId ?? this.visitorId,
        ...options.headers,
      },
      data: { query, variables },
    });
    expect(response.status(), await response.text()).toBeLessThan(500);
    return response.json() as Promise<GraphQLResponse<T>>;
  }

  async create(
    overrides: Record<string, unknown> = {},
    options: Parameters<CheckoutStorefrontTestKit['graphql']>[2] = {},
  ): Promise<{ checkout: Checkout | null; userErrors: CheckoutUserError[] }> {
    const response = await this.graphql<{
      checkoutCreate: { checkout: Checkout | null; userErrors: CheckoutUserError[] };
    }>(
      `mutation CheckoutCreate($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) { checkout { ${CHECKOUT_FIELDS} } userErrors { ${USER_ERROR_FIELDS} } }
      }`,
      {
        input: {
          channelCode: 'online-store',
          localeCode: 'en',
          currencyCode: 'USD',
          items: [],
          ...overrides,
        },
      },
      options,
    );
    expect(response.errors).toBeUndefined();
    return response.data!.checkoutCreate;
  }

  async read(
    id: string,
    options: Parameters<CheckoutStorefrontTestKit['graphql']>[2] = {},
  ): Promise<Checkout | null> {
    const response = await this.graphql<{ checkout: Checkout | null }>(
      `query Checkout($id: ID!) { checkout(id: $id) { ${CHECKOUT_FIELDS} } }`,
      { id },
      options,
    );
    expect(response.errors).toBeUndefined();
    return response.data?.checkout ?? null;
  }

  async mutation(
    field: string,
    inputType: string,
    input: Record<string, unknown>,
    options: Parameters<CheckoutStorefrontTestKit['graphql']>[2] = {},
  ): Promise<{ checkout: Checkout | null; userErrors: CheckoutUserError[] }> {
    const response = await this.graphql<{
      payload: { checkout: Checkout | null; userErrors: CheckoutUserError[] };
    }>(
      `mutation CheckoutMutation($input: ${inputType}!) {
        payload: ${field}(input: $input) {
          checkout { ${CHECKOUT_FIELDS} }
          userErrors { ${USER_ERROR_FIELDS} }
        }
      }`,
      { input },
      options,
    );
    expect(response.errors).toBeUndefined();
    return response.data!.payload;
  }

  async created(overrides: Record<string, unknown> = {}): Promise<Checkout> {
    const payload = await this.create(overrides);
    expect(payload.userErrors).toEqual([]);
    expect(payload.checkout).not.toBeNull();
    return payload.checkout!;
  }

  expectSuccess(payload: { checkout: Checkout | null; userErrors: CheckoutUserError[] }): Checkout {
    expect(payload.userErrors).toEqual([]);
    expect(payload.checkout).not.toBeNull();
    return payload.checkout!;
  }

  expectUserError(
    payload: { checkout: Checkout | null; userErrors: CheckoutUserError[] },
    code: string | RegExp,
  ): CheckoutUserError {
    expect(payload.checkout).toBeNull();
    expect(payload.userErrors).toHaveLength(1);
    expect(payload.userErrors[0]).toMatchObject({
      code: typeof code === 'string' ? code : expect.stringMatching(code),
      message: expect.any(String),
      retryable: expect.any(Boolean),
    });
    return payload.userErrors[0]!;
  }

  expectCanonicalMoney(checkout: Checkout, currencyCode = checkout.currencyCode): void {
    const values = [
      ...Object.values(checkout.cost),
      checkout.payment.payableAmount,
      ...checkout.lines.flatMap((line) => [
        line.originalPrice,
        ...Object.values(line.cost),
        ...line.children.flatMap((child) => [child.originalPrice, ...Object.values(child.cost)]),
      ]),
      ...checkout.deliveryGroups.flatMap((group) => group.options.map((option) => option.cost)),
    ];
    for (const money of values) {
      expect(money.currencyCode).toBe(currencyCode);
      expect(Number(money.amount)).toBeGreaterThanOrEqual(0);
    }
  }

  expectSafe(value: unknown): void {
    const serialized = JSON.stringify(value);
    expect(serialized).not.toMatch(
      /installationId|providerAccountId|credential|secret|password|authorization|stack|trace/iu,
    );
  }

  rawId(globalId: string): string {
    return parseGlobalId(globalId).id;
  }

  id(type: string, rawId = crypto.randomUUID()): string {
    return composeGlobalId(type, rawId);
  }

  async persisted(id: string): Promise<Record<string, unknown>> {
    const [row] = await this.sql`
      select * from checkout.checkouts where id = ${this.rawId(id)}
    `;
    expect(row).toBeTruthy();
    return row as Record<string, unknown>;
  }

  async variant(
    options: { price?: number; title?: string; status?: 'DRAFT' | 'PUBLISHED' } = {},
  ): Promise<string> {
    const product = await this.api.admin.product.createWithOptions({
      title: options.title ?? `Checkout product ${crypto.randomUUID().slice(0, 8)}`,
      handle: `checkout-product-${crypto.randomUUID().slice(0, 12)}`,
      status: options.status ?? 'PUBLISHED',
      price: options.price ?? 1_000,
      options: [{ name: 'Option', values: ['Default'] }],
    });
    const variant = product.variants.edges[0]?.node;
    expect(variant).toBeTruthy();
    return variant!.id;
  }
}

export function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is required`);
  return value;
}

export function expectRevisionAdvanced(before: Checkout, after: Checkout): void {
  expect(after.resultRevision).not.toBe(before.resultRevision);
  expect(new Date(after.updatedAt).getTime()).toBeGreaterThanOrEqual(
    new Date(before.updatedAt).getTime(),
  );
}

export function expectSameSnapshot(before: Checkout, after: Checkout): void {
  expect(after).toEqual(before);
}
