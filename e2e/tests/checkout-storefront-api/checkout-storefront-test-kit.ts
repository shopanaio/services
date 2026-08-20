/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/array-type */
import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import { composeGlobalId, parseGlobalId } from '@utils/globalid';
import postgres from 'postgres';
import { installMailpitSmtp } from '@utils/mailpit';
import { HeadlessTestKit, requiredCredentials } from '../headless-admin-api/headless-test-kit';
import {
  CustomersStorefrontTestKit,
  type StorefrontCustomer,
  type StorefrontRealm,
} from '../customers-storefront-api/customers-storefront-test-kit';
import {
  LoyaltyStorefrontTestKit,
  type LoyaltyFixture,
} from '../loyality-storefront-api/loyalty-storefront-test-kit';

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

export type ActionOverride = {
  action: string;
  mode: 'PASS' | 'THROW' | 'RETURN' | 'THROW_AFTER';
  result?: unknown;
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

const ACTION_PROXY_URL =
  process.env.TEST_ACTION_PROXY_URL ??
  `http://127.0.0.1:${process.env.TEST_ACTION_PROXY_PORT ?? '15000'}`;

export class CheckoutStorefrontTestKit {
  readonly sql = postgres(DATABASE_URL, { max: 1 });
  readonly headless: HeadlessTestKit;
  token = '';
  visitorId = `visitor-${crypto.randomUUID()}`;
  customerAccessToken = '';
  customer: StorefrontCustomer | null = null;
  private customerKit: CustomersStorefrontTestKit | null = null;
  private loyaltyKit: LoyaltyStorefrontTestKit | null = null;

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
      'storefront.customer.read',
      'storefront.checkout.read',
      'storefront.checkout.write',
      'storefront.order.write',
    ]);
    expect(created.userErrors).toEqual([]);
    requiredCredentials(created.initialStorefrontCredentials);
    this.token = created.initialStorefrontCredentials.publicAccessToken;
  }

  async close(): Promise<void> {
    await Promise.all([
      this.sql.end(),
      this.headless.close(),
      this.customerKit?.close() ?? Promise.resolve(),
      this.loyaltyKit?.close() ?? Promise.resolve(),
    ]);
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
        ...(this.customerAccessToken
          ? { authorization: `Bearer ${this.customerAccessToken}` }
          : {}),
        ...options.headers,
      },
      data: { query, variables },
    });
    expect(response.status(), await response.text()).toBeLessThan(500);
    return response.json() as Promise<GraphQLResponse<T>>;
  }

  async setupCustomer(): Promise<StorefrontCustomer> {
    if (this.customer) return this.customer;
    await installMailpitSmtp(this.api);
    const customerKit = new CustomersStorefrontTestKit(this.api, this.request);
    let realm: StorefrontRealm | null = null;
    await expect
      .poll(async () => {
        const [row] = await this.sql<Omit<StorefrontRealm, 'storeGlobalId' | 'storeName'>[]>`
          select storefront.application_id as "applicationId",
                 client.client_id as "clientId",
                 storefront.organization_id as "organizationId",
                 configuration.resource,
                 storefront.store_id as "storeId",
                 client.redirect_uris[1] as "redirectUri",
                 origin.origin
          from customers.storefront_auth_configuration storefront
          join iam.application_auth_configuration configuration
            on configuration.application_id = storefront.application_id
          join iam.application_auth_origin origin
            on origin.application_id = storefront.application_id
          join iam.application_oauth_client client
            on client.application_id = storefront.application_id
           and client.disabled = false and client.deleted_at is null
          where storefront.store_id = ${this.storeId}
          limit 1
        `;
        realm = row
          ? {
              ...row,
              storeGlobalId: this.api.session.project.id,
              storeName: this.api.session.project.name,
            }
          : null;
        return realm;
      })
      .not.toBeNull();
    customerKit.realm = realm!;
    await customerKit.enablePasswordAuthentication();
    const email = `checkout-${crypto.randomUUID()}@playwright.dev`;
    const signup = await customerKit.signUpWithPassword(email);
    expect(signup.ok(), await signup.text()).toBe(true);
    await customerKit.verifyEmail(email);
    customerKit.accessToken = await customerKit.issueCustomerAccessToken(email);
    customerKit.customer = await customerKit.waitForCustomer(email);
    this.customerKit = customerKit;
    this.customerAccessToken = customerKit.accessToken;
    this.customer = customerKit.customer;
    return this.customer;
  }

  async fundLoyalty(
    points = '1000',
    versionOverrides: Record<string, unknown> = {},
  ): Promise<{
    fixture: LoyaltyFixture;
    balanceRevision: number;
  }> {
    const customer = await this.setupCustomer();
    const loyalty = new LoyaltyStorefrontTestKit(this.api, this.request);
    loyalty.realm = this.customerKit!.realm;
    loyalty.customer = customer;
    loyalty.accessToken = this.customerAccessToken;
    loyalty.channelToken = this.token;
    const fixture = await loyalty.createActiveAccount(versionOverrides);
    const adjusted = await loyalty.adjustPoints(fixture.account, 'CREDIT', points);
    this.loyaltyKit = loyalty;
    return { fixture, balanceRevision: adjusted.account.balance.revision };
  }

  async seedLoyaltyReward(
    fixture: LoyaltyFixture,
    rewardType: string,
    configuration: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
  ): Promise<{ id: string; rawId: string; definitionId: string }> {
    if (!this.loyaltyKit) throw new Error('fundLoyalty must be called before seedLoyaltyReward');
    return this.loyaltyKit.seedAvailableReward(fixture, rewardType, configuration, overrides);
  }

  async loyaltyBalance(accountId: string): Promise<{
    availablePoints: string;
    reservedPoints: string;
  }> {
    const [row] = await this.sql<{ availablePoints: string; reservedPoints: string }[]>`
      select available_points as "availablePoints", reserved_points as "reservedPoints"
      from loyalty.account_balance where account_id = ${this.rawId(accountId)}
    `;
    expect(row).toBeTruthy();
    return row!;
  }

  get storeId(): string {
    return this.rawId(this.api.session.project.id);
  }

  get organizationId(): string {
    const id = this.api.session.organizationId;
    if (!id) throw new Error('Checkout test session has no organization');
    return this.rawId(id);
  }

  async callAction<T>(action: string, params: Record<string, unknown>): Promise<T> {
    const response = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/call`, {
      data: { action, params },
    });
    expect(response.ok(), await response.text()).toBe(true);
    const body = (await response.json()) as
      { ok: true; result: T } | { ok: false; error: { code: string; message: string } };
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error(`${body.error.code}: ${body.error.message}`);
    return body.result;
  }

  async runWorkflow<T>(
    workflow: string,
    params: Record<string, unknown>,
    idempotencyKey = crypto.randomUUID(),
    workflowId?: string,
  ): Promise<T> {
    const response = await this.request.post(`${ACTION_PROXY_URL}/__test/workflows/run`, {
      data: { workflow, params, idempotencyKey, ...(workflowId ? { workflowId } : {}) },
    });
    expect(response.ok(), await response.text()).toBe(true);
    const body = (await response.json()) as
      | { ok: true; result: T }
      | { ok: false; error: { code: string; message: string } };
    expect(body.ok).toBe(true);
    if (!body.ok) throw new Error(`${body.error.code}: ${body.error.message}`);
    return body.result;
  }

  async withActionFault<T>(action: string, run: () => Promise<T>): Promise<T> {
    return this.withActionOverrides([{ action, mode: 'THROW' }], run);
  }

  async withActionOverrides<T>(overrides: ActionOverride[], run: () => Promise<T>): Promise<T> {
    for (const override of overrides) await this.enableActionOverride(override);
    try {
      return await run();
    } finally {
      for (const override of [...overrides].reverse()) {
        const restored = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/restore`, {
          data: { action: override.action, storeId: this.storeId },
        });
        expect(restored.ok(), await restored.text()).toBe(true);
      }
    }
  }

  async actionCalls(action: string): Promise<number> {
    const response = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/stats`, {
      data: { action, storeId: this.storeId },
    });
    expect(response.ok(), await response.text()).toBe(true);
    const body = (await response.json()) as { ok: true; calls: number };
    expect(body.ok).toBe(true);
    return body.calls;
  }

  private async enableActionOverride(override: ActionOverride): Promise<void> {
    const response = await this.request.post(`${ACTION_PROXY_URL}/__test/actions/fault`, {
      data: { ...override, storeId: this.storeId },
    });
    expect(response.ok(), await response.text()).toBe(true);
  }

  async installApp(appCode: 'test-stripe' | 'test-fedex'): Promise<string> {
    const { data } = await this.api.admin.mutation('apps-admin-api/AppInstall', {
      variables: {
        input: { appCode, clientMutationId: crypto.randomUUID() },
      },
    });
    const payload = data.appsMutation.appInstall;
    expect(payload.userErrors).toEqual([]);
    expect(payload.installation).not.toBeNull();
    const installationId = this.rawId(payload.installation!.id);
    await expect
      .poll(async () => {
        const [row] = await this.sql<{ status: string }[]>`
          select status from apps.app_installations where id = ${installationId}
        `;
        return row?.status;
      })
      .toBe('ACTIVE');
    return installationId;
  }

  async configurePaymentProvider(
    enabledMethodKeys: string[] = ['card', 'card-3ds', 'bank-transfer', 'declined-card'],
  ): Promise<{ installationId: string; providerAccountId: string }> {
    const installationId = await this.installApp('test-stripe');
    const configured = await this.callAction<{
      providerAccountId: string;
      workflowId: string;
    }>('payments.configurePaymentProviderAccount', {
      organizationId: this.organizationId,
      storeId: this.storeId,
      installationId,
      mode: 'TEST',
      captureMode: 'AUTOMATIC',
      enabledMethodKeys,
      idempotencyKey: crypto.randomUUID(),
      correlationId: crypto.randomUUID(),
    });
    await expect
      .poll(async () => {
        const [row] = await this.sql<{ status: string }[]>`
          select status from payments.provider_account
          where id = ${configured.providerAccountId}
        `;
        return row?.status;
      })
      .toBe('READY');
    await this.sql`
      update payments.provider_account set status = 'ACTIVE', updated_at = now()
      where id = ${configured.providerAccountId}
    `;
    return { installationId, providerAccountId: configured.providerAccountId };
  }

  async setPaymentProviderStatus(
    providerAccountId: string,
    status: 'ACTIVE' | 'INACTIVE',
  ): Promise<void> {
    const rows = await this.sql`
      update payments.provider_account set status = ${status}, updated_at = now()
      where store_id = ${this.storeId} and id = ${providerAccountId}
      returning id
    `;
    expect(rows).toHaveLength(1);
  }

  async createDiscount(
    options: {
      kind?: 'AMOUNT_OFF_PRODUCTS' | 'AMOUNT_OFF_ORDER';
      method?: 'AUTOMATIC' | 'CODE';
      amountMinor?: string;
      percentageBps?: number;
      code?: string;
      state?: 'ACTIVE' | 'DRAFT' | 'PAUSED';
      minimumSubtotalMinor?: string;
      usageLimit?: string;
      title?: string;
    } = {},
  ): Promise<string> {
    const kind = options.kind ?? 'AMOUNT_OFF_ORDER';
    const method = options.method ?? 'AUTOMATIC';
    const { data } = await this.api.admin.mutation('pricing-admin-api/DiscountCreate', {
      variables: {
        input: {
          method,
          kind,
          state: options.state ?? 'ACTIVE',
          title: options.title ?? `Checkout discount ${crypto.randomUUID().slice(0, 8)}`,
          currency: 'USD',
          schedule: { startsAt: new Date(Date.now() - 60_000).toISOString() },
          usage: { usageLimit: options.usageLimit ?? null, appliesOncePerCustomer: false },
          purchaseModes: { appliesOnOneTimePurchase: true, appliesOnSubscription: false },
          rule: {
            amountOff: {
              operation: 'DECREASE',
              allocationMethod: 'ACROSS',
              valueType: options.percentageBps === undefined ? 'FIXED_AMOUNT' : 'PERCENTAGE',
              amountMinor:
                options.percentageBps === undefined ? (options.amountMinor ?? '100') : null,
              percentageBps: options.percentageBps ?? null,
            },
          },
          minimumRequirement:
            options.minimumSubtotalMinor === undefined
              ? null
              : {
                  requirementType: 'SUBTOTAL',
                  subtotalMinor: options.minimumSubtotalMinor,
                },
          ...(kind === 'AMOUNT_OFF_PRODUCTS'
            ? {
                targetSelections: [{ role: 'BENEFIT', targetType: 'ALL_PRODUCTS', targetIds: [] }],
              }
            : {}),
          ...(method === 'CODE'
            ? {
                codes: [{ code: options.code ?? 'SAVE100', clientMutationId: crypto.randomUUID() }],
              }
            : {}),
        },
      },
    });
    const payload = data.pricingMutation.discountCreate;
    expect(payload.userErrors).toEqual([]);
    expect(payload.discount).not.toBeNull();
    return payload.discount!.id;
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
    code: string,
  ): CheckoutUserError {
    expect(payload.checkout).toBeNull();
    expect(payload.userErrors).toHaveLength(1);
    expect(payload.userErrors[0]).toMatchObject({
      code,
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

  async persistedSnapshot(id: string): Promise<Record<string, unknown>> {
    const [row] = await this.sql<{ snapshot: Record<string, unknown> }[]>`
      select snapshot from checkout.checkout_current_snapshots
      where checkout_id = ${this.rawId(id)}
    `;
    expect(row).toBeTruthy();
    return row!.snapshot;
  }

  async variant(
    options: {
      price?: number;
      title?: string;
      status?: 'DRAFT' | 'PUBLISHED';
      requiresShipping?: boolean;
      stock?: number;
    } = {},
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
    if (options.requiresShipping || options.stock !== undefined) {
      expect(variant!.inventoryItem?.id).toBeTruthy();
      let stock: { warehouseId: string; onHand: number } | undefined;
      if (options.stock !== undefined) {
        const { data: warehouseData } = await this.api.admin.mutation(
          'inventory-api/WarehouseCreate',
          {
            variables: {
              input: {
                code: `stock-${crypto.randomUUID().slice(0, 8)}`,
                name: 'Checkout stock location',
                isDefault: true,
              },
            },
          },
        );
        const warehouse = warehouseData.inventoryMutation.warehouseCreate;
        expect(warehouse.userErrors).toEqual([]);
        expect(warehouse.warehouse).not.toBeNull();
        stock = { warehouseId: warehouse.warehouse!.id, onHand: options.stock };
      }
      const { data } = await this.api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: variant!.inventoryItem!.id,
            requiresShipping: options.requiresShipping ?? false,
            trackInventory: options.stock !== undefined,
            ...(stock ? { stock } : {}),
          },
        },
      });
      expect(data.inventoryMutation.inventoryItemUpdate.userErrors).toEqual([]);
    }
    return variant!.id;
  }

  async configureDelivery(
    options: {
      carrier?: boolean;
      methodTypes?: Array<'SHIPPING' | 'PICK_UP' | 'PICKUP_POINT' | 'LOCAL' | 'RETAIL'>;
      failureMode?: 'OMIT_PROVIDER_RATES' | 'FAIL_GROUP';
    } = {},
  ): Promise<{ warehouseId: string; providerAccountId: string | null }> {
    const { data } = await this.api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: {
        input: {
          code: `checkout-${crypto.randomUUID().slice(0, 8)}`,
          name: 'Checkout fulfillment location',
          isDefault: true,
        },
      },
    });
    const warehouse = data.inventoryMutation.warehouseCreate.warehouse;
    expect(data.inventoryMutation.warehouseCreate.userErrors).toEqual([]);
    expect(warehouse).not.toBeNull();
    const warehouseId = this.rawId(warehouse!.id);
    await this.sql`
      update catalog.warehouses set country_code = 'UA', province_code = '30',
        province_name = 'Kyiv', city = 'Kyiv', postal_code = '01001',
        address_line_1 = '1 Test Street', updated_at = now()
      where id = ${warehouseId}
    `;

    let providerAccountId: string | null = null;
    if (options.carrier) {
      const installationId = await this.installApp('test-fedex');
      const configured = await this.callAction<{ providerAccountId: string }>(
        'delivery.configureDeliveryProviderAccount',
        {
          organizationId: this.organizationId,
          storeId: this.storeId,
          installationId,
          enabledCapabilities: ['delivery.carrier-service'],
          mode: 'TEST',
          idempotencyKey: crypto.randomUUID(),
          correlationId: crypto.randomUUID(),
        },
      );
      providerAccountId = configured.providerAccountId;
      await expect
        .poll(async () => {
          const [row] = await this.sql<{ snapshot: Record<string, unknown> }[]>`
            select snapshot from delivery.provider_accounts where id = ${providerAccountId}
          `;
          return row?.snapshot ?? null;
        })
        .not.toBeNull();
      await this.sql`
        update delivery.provider_accounts
        set account_revision = account_revision + 1,
            snapshot = jsonb_set(
              jsonb_set(snapshot, '{revision}', '2'::jsonb),
              '{capabilityStates,carrierService,status}', '"ACTIVE"'::jsonb
            ),
            updated_at = now()
        where id = ${providerAccountId}
      `;
    }

    const now = new Date().toISOString();
    const profileId = crypto.randomUUID();
    const methodTypes = options.methodTypes ?? ['SHIPPING'];
    const methods: Array<Record<string, unknown>> = methodTypes.map(
      (deliveryMethodType, index) => ({
        methodDefinitionId: crypto.randomUUID(),
        code: `manual-${deliveryMethodType.toLowerCase()}-${index}`,
        title: `Test ${deliveryMethodType.toLowerCase()}`,
        description: null,
        active: true,
        deliveryMethodType,
        rateSource: {
          type: 'MANUAL' as const,
          price: { amountMinor: String(500 + index * 100), currencyCode: 'USD' },
        },
        conditions: { match: 'ALL' as const, conditions: [] },
        metadata: null,
        revision: 1,
      }),
    );
    if (providerAccountId) {
      methods.push({
        methodDefinitionId: crypto.randomUUID(),
        code: 'test-fedex',
        title: 'FedEx Test',
        description: null,
        active: true,
        deliveryMethodType: 'SHIPPING',
        rateSource: {
          type: 'CARRIER_SERVICE',
          carrierServiceAccountIds: [providerAccountId],
          allowedServiceCodes: [],
          backupRate: null,
        },
        conditions: { match: 'ALL' as const, conditions: [] },
        metadata: null,
        revision: 1,
      });
    }
    const profileSet = {
      organizationId: this.organizationId,
      storeId: this.storeId,
      currencyCode: 'USD',
      assignmentResolution: 'SELLING_PLAN_THEN_VARIANT_THEN_DEFAULT',
      revision: `delivery-profile-${crypto.randomUUID()}`,
      profiles: [
        {
          profileId,
          organizationId: this.organizationId,
          storeId: this.storeId,
          name: 'Checkout default delivery profile',
          status: 'ACTIVE',
          isDefault: true,
          assignment: {
            scope: 'ALL_UNASSIGNED',
            assignmentSetId: null,
            assignmentRevision: null,
            variantCount: 0,
            sellingPlanGroupCount: 0,
          },
          locationGroups: [
            {
              locationGroupId: crypto.randomUUID(),
              name: 'Default locations',
              sender: {
                firstName: 'Shopana',
                middleName: null,
                lastName: 'Test',
                company: null,
                email: null,
                phone: '+380501234567',
              },
              fulfillmentLocationIds: [warehouseId],
              zones: [
                {
                  zone: {
                    zoneId: crypto.randomUUID(),
                    name: 'Ukraine',
                    priority: 0,
                    territories: [
                      {
                        scope: 'COUNTRY',
                        countryCode: 'UA',
                        provinceCodes: [],
                        postalCodeRuleSet: {
                          schemaVersion: 1,
                          normalization: 'UPPERCASE_REMOVE_ASCII_WHITESPACE',
                          rules: [],
                        },
                      },
                    ],
                    revision: 1,
                  },
                  methods,
                },
              ],
              revision: 1,
            },
          ],
          failurePolicy: { mode: options.failureMode ?? 'OMIT_PROVIDER_RATES' },
          revision: 1,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    const activated = await this.callAction<{ status: string }>(
      'delivery.activateDeliveryProfileSet',
      {
        profileSet,
        expectedProfileSetRevision: null,
        memberships: [],
      },
    );
    expect(activated.status).toBe('SAVED');
    return { warehouseId, providerAccountId };
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
