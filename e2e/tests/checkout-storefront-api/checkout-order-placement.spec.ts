/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/array-type */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  type Checkout,
  CheckoutStorefrontTestKit,
  USER_ERROR_FIELDS,
} from './checkout-storefront-test-kit';

type Placement = {
  placementId: string | null;
  placementState:
    | 'CLAIMED'
    | 'RESOURCES_RESERVED'
    | 'ORDER_CREATED'
    | 'PAYMENT_CREATED'
    | 'PLACED'
    | 'FAILED'
    | null;
  checkoutId: string | null;
  resultRevision: string | null;
  orderId: string | null;
  status: string | null;
  paymentCollectionId: string | null;
  paymentSessionId: string | null;
  paymentOperationId: string | null;
  customerAction: null | {
    type: string;
    url: string | null;
    title: string | null;
    instructions: string | null;
    data: unknown;
  };
  paymentFailure: null | {
    category: string;
    code: string;
    message: string;
    retryable: boolean;
    providerCode: string | null;
  };
  userErrors: Array<{ field: string[] | null; code: string; message: string; retryable: boolean }>;
};

const PLACEMENT_FIELDS = `
  placementId placementState checkoutId resultRevision orderId status
  paymentCollectionId paymentSessionId paymentOperationId
  customerAction { type url title instructions expiresAt data }
  paymentFailure { category code message retryable providerCode }
  userErrors { ${USER_ERROR_FIELDS} }
`;

test.describe('Storefront checkout order placement and payment', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('places a ready checkout and creates an order from its immutable snapshot', async () => {
    const checkout = await readyWithoutPayment(kit);
    const result = await place(kit, checkout);
    expect(result).toMatchObject({
      placementState: 'PLACED',
      checkoutId: checkout.id,
      resultRevision: checkout.resultRevision,
      orderId: expect.any(String),
      status: 'PAYMENT_NOT_REQUIRED',
      userErrors: [],
    });
    const placed = await kit.read(checkout.id);
    expect(placed).toMatchObject({
      status: 'PLACED',
      lines: checkout.lines,
      customerIdentity: checkout.customerIdentity,
    });
    const [order] = await kit.sql<
      { checkoutId: string; currencyCode: string; checkoutSnapshot: Record<string, unknown> }[]
    >`
      select checkout_id as "checkoutId", currency_code as "currencyCode",
             checkout_snapshot as "checkoutSnapshot"
      from orders.orders where id = ${kit.rawId(result.orderId!)}
    `;
    expect(order).toMatchObject({
      checkoutId: kit.rawId(checkout.id),
      currencyCode: checkout.currencyCode,
      checkoutSnapshot: {
        checkoutId: kit.rawId(checkout.id),
        storeId: kit.storeId,
        currencyCode: checkout.currencyCode,
        lines: checkout.lines.map((line) =>
          expect.objectContaining({ quantity: line.quantity, unit: { title: line.title } }),
        ),
      },
    });
  });

  test('rejects placement for an invalid or incomplete checkout', async () => {
    const checkout = await kit.created();
    const result = await place(kit, checkout);
    expect(result.orderId).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_OPEN', retryable: true }),
    );
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('rejects placement with a stale expected result revision', async () => {
    const checkout = await readyWithoutPayment(kit);
    const result = await place(kit, checkout, { expectedResultRevision: crypto.randomUUID() });
    expect(result.orderId).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_PLACEMENT_SNAPSHOT_STALE', retryable: true }),
    );
    expect((await kit.read(checkout.id))?.status).toBe('READY');
  });

  test('replays placement with the same idempotency key and input', async () => {
    const checkout = await readyWithoutPayment(kit);
    const idempotencyKey = crypto.randomUUID();
    const first = await place(kit, checkout, { idempotencyKey });
    const replay = await place(kit, checkout, { idempotencyKey });
    expect(replay).toEqual(first);
  });

  test('rejects reuse of a placement idempotency key with different parameters', async () => {
    const checkout = await readyWithoutPayment(kit);
    const idempotencyKey = crypto.randomUUID();
    await place(kit, checkout, { idempotencyKey });
    const conflict = await place(kit, checkout, {
      idempotencyKey,
      returnUrl: 'https://other.example.test/return',
    });
    expect(conflict.userErrors).toContainEqual(
      expect.objectContaining({ code: 'IDEMPOTENCY_KEY_PARAMETER_MISMATCH' }),
    );
  });

  test('returns durable placement status through checkoutPlacement after provider redirect', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-card-3ds');
    const placed = await place(kit, checkout, { returnUrl: 'https://shop.example.test/return' });
    expect(placed).toMatchObject({
      status: 'REQUIRES_ACTION',
      customerAction: { type: 'REDIRECT', url: expect.any(String) },
    });
    expect(await placement(kit, placed.placementId!)).toEqual(placed);
  });

  test('creates a provider payment that requires explicit confirmation', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-card');
    const result = await place(kit, checkout, { returnUrl: 'https://shop.example.test/return' });
    expect(result).toMatchObject({
      status: 'REQUIRES_CONFIRMATION',
      paymentCollectionId: expect.any(String),
      paymentSessionId: expect.any(String),
      paymentOperationId: expect.any(String),
      userErrors: [],
    });
  });

  test('persists the exact payment identifiers returned for a confirmation flow', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-card');
    const result = await place(kit, checkout, { returnUrl: 'https://shop.example.test/return' });
    expect(result.paymentCollectionId).toEqual(expect.any(String));
    expect(result.paymentSessionId).toEqual(expect.any(String));
    expect(result).toMatchObject({
      status: 'REQUIRES_CONFIRMATION',
      placementState: 'PAYMENT_CREATED',
      paymentOperationId: expect.any(String),
    });
    const [row] = await kit.sql<
      { paymentCollectionId: string; paymentSessionId: string; paymentOperationId: string }[]
    >`
      select payment_collection_id as "paymentCollectionId",
             payment_session_id as "paymentSessionId",
             payment_operation_id as "paymentOperationId"
      from checkout.checkout_placements where id = ${kit.rawId(result.placementId!)}
    `;
    expect(row).toEqual({
      paymentCollectionId: kit.rawId(result.paymentCollectionId!),
      paymentSessionId: kit.rawId(result.paymentSessionId!),
      paymentOperationId: kit.rawId(result.paymentOperationId!),
    });
  });

  test('returns pending placement state for asynchronous payment confirmation', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-bank-transfer');
    const result = await place(kit, checkout);
    expect(result).toMatchObject({ status: 'PAYMENT_PENDING', placementState: 'PAYMENT_CREATED' });
    expect(await placement(kit, result.placementId!)).toEqual(result);
  });

  test('surfaces a failed provider payment as a durable storefront-safe placement failure', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-declined-card');
    const result = await place(kit, checkout, { returnUrl: 'https://shop.example.test/return' });
    expect(result).toMatchObject({
      placementState: 'FAILED',
      status: 'PAYMENT_FAILED',
      paymentFailure: { category: 'DECLINED', retryable: false, message: expect.any(String) },
    });
    kit.expectSafe(result.paymentFailure);
    expect(await placement(kit, result.placementId!)).toEqual(result);
  });

  test('coalesces concurrent placement requests with the same idempotency key', async () => {
    const checkout = await readyWithoutPayment(kit);
    const idempotencyKey = crypto.randomUUID();
    const [first, second] = await Promise.all([
      place(kit, checkout, { idempotencyKey }),
      place(kit, checkout, { idempotencyKey }),
    ]);
    expect(second).toEqual(first);
    const [row] = await kit.sql<{ placements: number; orders: number }[]>`
      select
        (select count(*)::int from checkout.checkout_placements
          where checkout_id = ${kit.rawId(checkout.id)}) as placements,
        (select count(*)::int from orders.orders
          where checkout_snapshot ->> 'checkoutId' = ${kit.rawId(checkout.id)}) as orders
    `;
    expect(row).toEqual({ placements: 1, orders: 1 });
  });

  test('leaves the checkout READY when inventory reservation fails', async () => {
    const checkout = await readyWithoutPayment(kit);
    const failed = await kit.withActionFault('catalog.reserveCheckoutInventory', () =>
      place(kit, checkout),
    );
    expect(failed.placementState).toBe('FAILED');
    expect((await kit.read(checkout.id))?.status).toBe('READY');
  });

  test('releases inventory acquired before order creation fails', async () => {
    const checkout = await readyWithoutPayment(kit);
    const failed = await kit.withActionOverrides(
      [
        { action: 'order.createOrderFromCheckoutPlacement', mode: 'THROW' },
        { action: 'catalog.releaseCheckoutInventory', mode: 'PASS' },
      ],
      async () => {
        const result = await place(kit, checkout);
        expect(await kit.actionCalls('catalog.releaseCheckoutInventory')).toBe(1);
        return result;
      },
    );
    expect(failed.placementState).toBe('FAILED');
    const [row] = await kit.sql<{ status: string; compensationFailures: unknown }[]>`
      select status, compensation_failures as "compensationFailures"
      from checkout.checkout_placements where checkout_id = ${kit.rawId(checkout.id)}
    `;
    expect(row).toMatchObject({ status: 'FAILED', compensationFailures: [] });
  });

  test('records failed compensations durably for maintenance recovery', async () => {
    const checkout = await readyWithoutPayment(kit);
    await kit.withActionOverrides(
      [
        { action: 'order.createOrderFromCheckoutPlacement', mode: 'THROW' },
        { action: 'catalog.releaseCheckoutInventory', mode: 'THROW' },
      ],
      () => place(kit, checkout),
    );
    const [row] = await kit.sql<
      { failure: unknown; status: string; compensationFailures: Array<{ operation: string }> }[]
    >`
      select failure, status, compensation_failures as "compensationFailures"
      from checkout.checkout_placements where checkout_id = ${kit.rawId(checkout.id)}
    `;
    expect(row).toMatchObject({
      status: 'FAILED',
      failure: expect.anything(),
      compensationFailures: [expect.objectContaining({ operation: 'releaseInventory' })],
    });
  });

  test('places a zero-payable checkout without creating payment records', async () => {
    const checkout = await readyWithoutPayment(kit);
    const result = await place(kit, checkout);
    expect(result).toMatchObject({ status: 'PAYMENT_NOT_REQUIRED', placementState: 'PLACED' });
    expect(result.paymentCollectionId).toBeNull();
    expect(result.paymentSessionId).toBeNull();
    expect((await kit.read(checkout.id))?.status).toBe('PLACED');
  });

  test('rejects placement when a selected delivery group has no complete recipient', async () => {
    await kit.configureDelivery({ methodTypes: ['SHIPPING'] });
    await kit.createDiscount({ amountMinor: '100000' });
    const checkout = await kit.created({
      items: [{ purchasableId: await kit.variant({ requiresShipping: true }), quantity: 1 }],
    });
    const addressed = kit.expectSuccess(
      await deliveryMutation(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
        addresses: [
          {
            checkoutLineIds: [checkout.lines[0]!.id],
            address: deliveryAddress({ firstName: null, lastName: null }),
          },
        ],
      }),
    );
    const selected = await selectDeliveryGroup(kit, addressed, 0);
    const result = await place(kit, selected);
    expect(result.orderId).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_DELIVERY_RECIPIENT_REQUIRED' }),
    );
  });

  test('rejects an invalid payment return URL before creating a placement', async () => {
    const checkout = await readyWithoutPayment(kit);
    for (const returnUrl of [
      'http://insecure.example.test',
      'javascript:alert(1)',
      'https://user:pass@example.test',
    ]) {
      const result = await place(kit, checkout, { returnUrl });
      expect(result.userErrors).toContainEqual(
        expect.objectContaining({ code: 'PLACE_ORDER_RETURN_URL_INVALID', retryable: false }),
      );
    }
    const [row] = await kit.sql<{ count: number }[]>`
      select count(*)::int as count from checkout.checkout_placements where checkout_id = ${kit.rawId(checkout.id)}
    `;
    expect(row!.count).toBe(0);
  });

  test('rejects placement after the checkout expiry deadline', async () => {
    const checkout = await readyWithoutPayment(kit);
    await kit.sql.begin(async (sql) => {
      await sql`update checkout.checkouts set expires_at = now() - interval '1 second' where id = ${kit.rawId(checkout.id)}`;
      await sql`update checkout.checkout_current_snapshots set snapshot = jsonb_set(snapshot, '{lifecycle,expiresAt}', to_jsonb(${new Date(Date.now() - 1_000).toISOString()}::text)) where checkout_id = ${kit.rawId(checkout.id)}`;
    });
    const result = await place(kit, checkout);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_EXPIRED', retryable: true }),
    );
    expect(result.orderId).toBeNull();
  });

  test('rejects a storefront connection that does not own the checkout before claiming placement', async () => {
    const checkout = await readyWithoutPayment(kit);
    const second = await kit.headless.create('Foreign placement connection');
    const result = await place(kit, checkout, {
      token: second.initialStorefrontCredentials!.publicAccessToken,
    });
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_NOT_FOUND', retryable: false }),
    );
    expect(result.placementId).toBeNull();
  });

  test('marks a successfully placed checkout as PLACED and prevents a second placement', async () => {
    const checkout = await readyWithoutPayment(kit);
    const first = await place(kit, checkout);
    expect((await kit.read(checkout.id))?.status).toBe('PLACED');
    const second = await place(kit, checkout, { idempotencyKey: crypto.randomUUID() });
    expect(second.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_ALREADY_PLACED', retryable: false }),
    );
    expect(second.orderId).toBeNull();
    expect(first.orderId).not.toBeNull();
  });

  test('does not allow another visitor or storefront connection to place or inspect a checkout placement', async () => {
    const checkout = await readyWithoutPayment(kit);
    const placed = await place(kit, checkout);
    const visitorId = `visitor-${crypto.randomUUID()}`;
    const unauthorized = await place(kit, checkout, {
      visitorId,
      idempotencyKey: crypto.randomUUID(),
    });
    expect(unauthorized.userErrors).toContainEqual(
      expect.objectContaining({ code: 'CHECKOUT_NOT_FOUND', retryable: false }),
    );
    expect(await placement(kit, placed.placementId!, { visitorId })).toBeNull();
  });

  test('blocks checkout mutations once placement is claimed', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-bank-transfer');
    const placed = await place(kit, checkout);
    expect(placed.placementState).toBe('PAYMENT_CREATED');
    const mutation = await kit.mutation(
      'checkoutCustomerNoteUpdate',
      'CheckoutCustomerNoteUpdateInput',
      {
        checkoutId: checkout.id,
        note: 'too late',
      },
    );
    kit.expectUserError(mutation, 'CHECKOUT_VERSION_CONFLICT');
  });

  test('commits every selected multi-shipping delivery group into the created order', async () => {
    await kit.configureDelivery({ methodTypes: ['SHIPPING'] });
    await kit.createDiscount({ amountMinor: '100000' });
    const checkout = await kit.created({
      items: await Promise.all(
        ['Ada', 'Grace'].map(async () => ({
          purchasableId: await kit.variant({ requiresShipping: true }),
          quantity: 1,
        })),
      ),
    });
    const addressed = kit.expectSuccess(
      await deliveryMutation(kit, 'checkoutDeliveryAddressesAdd', checkout.id, {
        addresses: checkout.lines.map((line, index) => ({
          checkoutLineIds: [line.id],
          address: deliveryAddress({
            firstName: index === 0 ? 'Ada' : 'Grace',
            address1: `${index + 1} Test Street`,
          }),
        })),
      }),
    );
    let selected = addressed;
    for (let index = 0; index < addressed.deliveryGroups.length; index += 1) {
      selected = await selectDeliveryGroup(kit, selected, index);
    }
    expect(selected.deliveryGroups).toHaveLength(2);
    const result = await place(kit, selected);
    expect(result).toMatchObject({
      orderId: expect.any(String),
      placementState: 'PLACED',
      status: 'PAYMENT_NOT_REQUIRED',
    });
    const recipients = await kit.sql<{ firstName: string; lineCount: number }[]>`
      select recipient.first_name as "firstName", cardinality(group_row.line_item_ids)::int as "lineCount"
      from orders.order_delivery_groups as group_row
      join orders.order_recipients as recipient on recipient.id = group_row.recipient_id
      where group_row.order_id = ${kit.rawId(result.orderId!)}
      order by recipient.first_name
    `;
    expect(recipients).toEqual([
      { firstName: 'Ada', lineCount: 1 },
      { firstName: 'Grace', lineCount: 1 },
    ]);
  });

  test('does not duplicate payment records when a pending placement is replayed', async () => {
    const checkout = await readyWithMethod(kit, 'test-stripe-bank-transfer');
    const idempotencyKey = crypto.randomUUID();
    const first = await place(kit, checkout, { idempotencyKey });
    const replay = await place(kit, checkout, { idempotencyKey });
    expect(replay.paymentCollectionId).toBe(first.paymentCollectionId);
    expect(replay.paymentSessionId).toBe(first.paymentSessionId);
    expect(replay.paymentOperationId).toBe(first.paymentOperationId);
  });
});

async function readyWithoutPayment(kit: CheckoutStorefrontTestKit): Promise<Checkout> {
  await kit.createDiscount({ amountMinor: '100000' });
  const checkout = await kit.created({
    items: [{ purchasableId: await kit.variant({ price: 1_000 }), quantity: 1 }],
  });
  expect(checkout).toMatchObject({ valid: true, status: 'READY' });
  expect(checkout.payment.payableAmount.amount).toBe(0);
  return checkout;
}

async function readyWithMethod(kit: CheckoutStorefrontTestKit, code: string): Promise<Checkout> {
  await kit.configurePaymentProvider();
  const checkout = await kit.created({
    items: [{ purchasableId: await kit.variant({ price: 1_000 }), quantity: 1 }],
  });
  const method = checkout.payment.methods.find((candidate) => candidate.code === code);
  expect(method).toBeTruthy();
  const selected = kit.expectSuccess(
    await kit.mutation('checkoutPaymentMethodUpdate', 'CheckoutPaymentMethodUpdateInput', {
      checkoutId: checkout.id,
      methodHandle: method!.handle,
    }),
  );
  expect(selected).toMatchObject({ valid: true, status: 'READY' });
  return selected;
}

function deliveryAddress(
  overrides: Partial<{
    firstName: string | null;
    lastName: string | null;
    address1: string;
  }> = {},
) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    address1: '1 Test Street',
    city: 'Kyiv',
    countryCode: 'UA',
    provinceCode: '30',
    zip: '01001',
    phone: '+380501234567',
    ...overrides,
  };
}

function deliveryMutation(
  kit: CheckoutStorefrontTestKit,
  field: string,
  checkoutId: string,
  input: Record<string, unknown>,
) {
  const inputType = `${field[0]!.toUpperCase()}${field.slice(1)}Input`;
  return kit.mutation(field, inputType, { checkoutId, ...input });
}

async function selectDeliveryGroup(
  kit: CheckoutStorefrontTestKit,
  checkout: Checkout,
  index: number,
): Promise<Checkout> {
  const group = checkout.deliveryGroups[index]!;
  return kit.expectSuccess(
    await kit.mutation('checkoutDeliveryMethodUpdate', 'CheckoutDeliveryMethodUpdateInput', {
      checkoutId: checkout.id,
      deliveryGroupId: group.id,
      optionHandle: group.options[0]!.handle,
    }),
  );
}

async function place(
  kit: CheckoutStorefrontTestKit,
  checkout: Checkout,
  overrides: Record<string, unknown> = {},
): Promise<Placement> {
  const { token, visitorId, ...inputOverrides } = overrides as {
    token?: string;
    visitorId?: string;
    [key: string]: unknown;
  };
  const response = await kit.graphql<{ placeOrder: Placement }>(
    `mutation PlaceOrder($input: PlaceOrderInput!) { placeOrder(input: $input) { ${PLACEMENT_FIELDS} } }`,
    {
      input: {
        checkoutId: checkout.id,
        expectedResultRevision: checkout.resultRevision,
        idempotencyKey: crypto.randomUUID(),
        ...inputOverrides,
      },
    },
    { token, visitorId },
  );
  expect(response.errors).toBeUndefined();
  return response.data!.placeOrder;
}

async function placement(
  kit: CheckoutStorefrontTestKit,
  placementId: string,
  options: Parameters<CheckoutStorefrontTestKit['graphql']>[2] = {},
): Promise<Placement | null> {
  const response = await kit.graphql<{ checkoutPlacement: Placement | null }>(
    `query Placement($id: ID!) { checkoutPlacement(id: $id) { ${PLACEMENT_FIELDS} } }`,
    { id: placementId },
    options,
  );
  expect(response.errors).toBeUndefined();
  return response.data?.checkoutPlacement ?? null;
}
