/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect, type APIRequestContext } from '@playwright/test';
import {
  createCustomer,
  eventually,
  expectRelayConnection,
  getCustomer,
  openCustomersSql,
  rawId,
  required,
  setupStore,
} from './helpers';

const ACTION_PROXY_URL =
  process.env.TEST_ACTION_PROXY_URL ??
  `http://127.0.0.1:${process.env.TEST_ACTION_PROXY_PORT ?? '15000'}`;

async function dispatchDomainEvent(
  api: Parameters<typeof setupStore>[0],
  request: APIRequestContext,
  eventType: string,
  payload: Record<string, unknown>,
  options: { source?: string; subjectType?: string; subjectId: string },
) {
  const sql = openCustomersSql();
  const eventId = crypto.randomUUID();
  const organizationId = rawId(required(api.session.organizationId, 'organization ID'));
  const subjectType = options.subjectType ?? 'order';
  try {
    await sql`
      insert into domain_events (
        event_id, event_type, event_sequence, source, timestamp, organization_id,
        correlation_id, emit_key, payload, payload_hash, dispatch_mode, status,
        subject_type, subject_id, actor_type
      ) values (
        ${eventId}, ${eventType},
        (
          select coalesce(max(event_sequence), 0) + 1
          from domain_events
          where organization_id = ${organizationId}
            and subject_type = ${subjectType}
            and subject_id = ${options.subjectId}
        ),
        ${options.source ?? 'orders'}, now(), ${organizationId}, ${crypto.randomUUID()},
        ${`e2e:${eventId}`}, ${sql.json(payload)}, ${eventId}, 'immediate', 'pending',
        ${subjectType}, ${options.subjectId}, 'service'
      )
    `;
  } finally {
    await sql.end();
  }

  const response = await request.post(`${ACTION_PROXY_URL}/__test/actions/call`, {
    data: {
      action: 'events.dispatch',
      params: { kind: 'event', organizationId, eventId, waitForResult: true },
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    result: {
      status: 'completed',
      result: { claimed: 1, dispatched: 1, failed: 0 },
    },
  });
}

async function seedStatistics(customer: any, storeId: string, values: any = {}) {
  const sql = openCustomersSql();
  try {
    await sql`insert into customers.customer_statistics (customer_id, store_id, orders_count, completed_orders_count, cancelled_orders_count, returns_count, first_order_id, first_order_at, last_order_id, last_order_at, last_checkout_at) values (${rawId(customer.id)}::uuid, ${storeId}::uuid, ${values.ordersCount ?? 1}, ${values.completedOrdersCount ?? 1}, ${values.cancelledOrdersCount ?? 0}, ${values.returnsCount ?? 0}, ${values.firstOrderId ?? crypto.randomUUID()}::uuid, ${values.firstOrderAt ?? new Date(Date.now() - 86_400_000).toISOString()}, ${values.lastOrderId ?? crypto.randomUUID()}::uuid, ${values.lastOrderAt ?? new Date().toISOString()}, ${values.lastCheckoutAt ?? new Date().toISOString()}) on conflict (customer_id) do update set orders_count = excluded.orders_count, completed_orders_count = excluded.completed_orders_count, cancelled_orders_count = excluded.cancelled_orders_count, returns_count = excluded.returns_count, last_order_at = excluded.last_order_at`;
  } finally {
    await sql.end();
  }
}
async function seedMoney(
  customer: any,
  storeId: string,
  currencyCode: string,
  spent: bigint,
  refunded: bigint,
  orders = 1,
) {
  const sql = openCustomersSql();
  try {
    await sql`insert into customers.customer_monetary_statistics (store_id, customer_id, currency_code, orders_count, total_spent_minor, total_refunded_minor, net_spent_minor, average_order_value_minor) values (${storeId}::uuid, ${rawId(customer.id)}::uuid, ${currencyCode}, ${orders}, ${spent.toString()}::bigint, ${refunded.toString()}::bigint, ${(spent - refunded).toString()}::bigint, ${(spent / BigInt(orders)).toString()}::bigint)`;
  } finally {
    await sql.end();
  }
}

test.describe('Customers Admin API - statistics and comparison', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('customer without events has null or zero statistics according to contract', async ({
    api,
  }) => {
    const customer = await getCustomer(api, (await createCustomer(api)).id);
    expect(customer.statistics).toBeNull();
    expectRelayConnection(customer.monetaryStatistics, 0);
  });

  test('order checkout and refund events update the customer statistics projection', async ({
    api,
    request,
  }) => {
    const customer = await createCustomer(api);
    const storeId = rawId(api.session.project.id);
    const customerId = rawId(customer.id);
    const orderId = crypto.randomUUID();
    const checkoutId = crypto.randomUUID();
    const refundId = crypto.randomUUID();
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    const completedAt = new Date(Date.now() - 30_000).toISOString();
    const baseOrder = {
      schemaVersion: 1,
      orderId,
      storeId,
      customerId,
      currencyCode: 'USD',
      totalAmountMinor: '1000',
      createdAt,
    };

    await dispatchDomainEvent(
      api,
      request,
      'orderCreated',
      {
        ...baseOrder,
        orderRevision: 1,
        occurredAt: createdAt,
        notification: { storeId, data: {} },
      },
      { subjectId: orderId },
    );
    await dispatchDomainEvent(
      api,
      request,
      'orderCompleted',
      { ...baseOrder, orderRevision: 2, occurredAt: completedAt, completedAt },
      { subjectId: orderId },
    );
    await dispatchDomainEvent(
      api,
      request,
      'checkoutCustomerActivityRecorded',
      {
        schemaVersion: 1,
        checkoutId,
        checkoutVersion: 1,
        storeId,
        customerId,
        occurredAt: completedAt,
      },
      { source: 'checkout', subjectType: 'checkout', subjectId: checkoutId },
    );
    await dispatchDomainEvent(
      api,
      request,
      'orderRefunded',
      {
        schemaVersion: 1,
        refundId,
        refundRevision: 1,
        orderId,
        orderRevision: 2,
        storeId,
        customerId,
        currencyCode: 'USD',
        refundedAmountMinor: '250',
        refundedAt: new Date().toISOString(),
        notification: { storeId, data: {} },
      },
      { subjectType: 'refund', subjectId: refundId },
    );

    const loaded = await eventually(
      () => getCustomer(api, customer.id),
      (value) => value?.statistics?.completedOrdersCount === 1,
    );
    expect(loaded.statistics).toMatchObject({
      ordersCount: 1,
      completedOrdersCount: 1,
      cancelledOrdersCount: 0,
      returnsCount: 1,
      firstOrderAt: completedAt,
      lastOrderAt: completedAt,
      lastCheckoutAt: completedAt,
    });
    expect(loaded.monetaryStatistics.edges[0].node).toMatchObject({
      currencyCode: 'USD',
      totalSpentMinor: '1000',
      totalRefundedMinor: '250',
      netSpentMinor: '750',
      averageOrderValueMinor: '1000',
    });
  });

  test('duplicate and older order revisions do not regress projected statistics', async ({
    api,
    request,
  }) => {
    const customer = await createCustomer(api);
    const storeId = rawId(api.session.project.id);
    const customerId = rawId(customer.id);
    const orderId = crypto.randomUUID();
    const createdAt = new Date(Date.now() - 60_000).toISOString();
    const completedAt = new Date(Date.now() - 30_000).toISOString();
    const baseOrder = {
      schemaVersion: 1,
      orderId,
      storeId,
      customerId,
      currencyCode: 'USD',
      totalAmountMinor: '1200',
      createdAt,
    };
    await dispatchDomainEvent(
      api,
      request,
      'orderCompleted',
      { ...baseOrder, orderRevision: 2, completedAt, occurredAt: completedAt },
      { subjectId: orderId },
    );
    for (const occurredAt of [createdAt, new Date().toISOString()]) {
      await dispatchDomainEvent(
        api,
        request,
        'orderCreated',
        {
          ...baseOrder,
          orderRevision: 1,
          occurredAt,
          notification: { storeId, data: {} },
        },
        { subjectId: orderId },
      );
    }
    const loaded = await eventually(
      () => getCustomer(api, customer.id),
      (value) => value?.statistics?.completedOrdersCount === 1,
    );
    expect(loaded.statistics).toMatchObject({
      ordersCount: 1,
      completedOrdersCount: 1,
      cancelledOrdersCount: 0,
      lastOrderAt: completedAt,
    });
    expect(loaded.monetaryStatistics.edges[0].node.totalSpentMinor).toBe('1200');
  });

  test('monetary statistics remain isolated per currency and preserve minor-unit arithmetic', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const storeId = rawId(api.session.project.id);
    await seedMoney(customer, storeId, 'USD', 1000n, 250n, 2);
    await seedMoney(customer, storeId, 'EUR', 999n, 99n);
    const nodes = (await getCustomer(api, customer.id)).monetaryStatistics.edges.map(
      ({ node }: any) => node,
    );
    expect(nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currencyCode: 'USD',
          totalSpentMinor: '1000',
          totalRefundedMinor: '250',
          netSpentMinor: '750',
          averageOrderValueMinor: '500',
        }),
        expect.objectContaining({ currencyCode: 'EUR', netSpentMinor: '900' }),
      ]),
    );
  });

  test('monetary statistics totalCount and BigInt serialization are exact', async ({ api }) => {
    const customer = await createCustomer(api);
    const storeId = rawId(api.session.project.id);
    await seedMoney(customer, storeId, 'USD', 9_007_199_254_740_993n, 1n);
    await seedMoney(customer, storeId, 'EUR', 100n, 0n);
    const connection = (await getCustomer(api, customer.id)).monetaryStatistics;
    expectRelayConnection(connection, 2);
    expect(
      connection.edges.find(({ node }: any) => node.currencyCode === 'USD').node.totalSpentMinor,
    ).toBe('9007199254740993');
  });

  test('a customer aggregate is inaccessible from another store', async ({ api }) => {
    const customer = await createCustomer(api);
    const firstStore = rawId(api.session.project.id);
    await seedStatistics(customer, firstStore);
    await api.session.setupProject();
    expect(await getCustomer(api, customer.id)).toBeNull();
  });

  test('admin reads an empty customer comparison', async ({ api }) => {
    expect((await getCustomer(api, (await createCustomer(api)).id)).comparison).toBeNull();
  });

  test('admin reads comparison items in position order with persisted reference IDs', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const sql = openCustomersSql();
    const comparisonId = crypto.randomUUID();
    const storeId = rawId(api.session.project.id);
    try {
      await sql`insert into customers.customer_comparison (id, store_id, customer_id, revision) values (${comparisonId}::uuid, ${storeId}::uuid, ${rawId(customer.id)}::uuid, 2)`;
      for (const position of [0, 1])
        await sql`insert into customers.customer_comparison_item (store_id, comparison_id, product_id, variant_id, position) values (${storeId}::uuid, ${comparisonId}::uuid, ${crypto.randomUUID()}::uuid, ${crypto.randomUUID()}::uuid, ${position})`;
    } finally {
      await sql.end();
    }
    const comparison = (await getCustomer(api, customer.id)).comparison;
    expect(comparison.revision).toBe(2);
    expect(comparison.items.map(({ position }: any) => position)).toEqual([0, 1]);
    expect(comparison.items.every(({ productId, variantId }: any) => productId && variantId)).toBe(
      true,
    );
  });

  test('unavailable Catalog entities leave safe nullable references without dropping persisted items', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const sql = openCustomersSql();
    const comparisonId = crypto.randomUUID();
    const storeId = rawId(api.session.project.id);
    try {
      await sql`insert into customers.customer_comparison (id, store_id, customer_id) values (${comparisonId}::uuid, ${storeId}::uuid, ${rawId(customer.id)}::uuid)`;
      await sql`insert into customers.customer_comparison_item (store_id, comparison_id, product_id, variant_id, position) values (${storeId}::uuid, ${comparisonId}::uuid, ${crypto.randomUUID()}::uuid, ${crypto.randomUUID()}::uuid, 0)`;
    } finally {
      await sql.end();
    }
    const item = (await getCustomer(api, customer.id)).comparison.items[0];
    expect(item.product).toBeNull();
    expect(item.variant).toBeNull();
    expect(item.id).toEqual(expect.any(String));
  });

  test('comparison and items cannot be mutated through Customers Admin API', async ({ api }) => {
    const customer = await createCustomer(api);
    const { data, errors } = await api.admin.mutation<any>('customers-admin-api/CustomerUpdate', {
      throwOnError: false,
      variables: {
        customerId: customer.id,
        expectedRevision: customer.revision,
        operations: { comparison: { items: [] } },
      },
    });
    expect(
      errors?.length || data?.customersMutation?.customerUpdate?.userErrors?.length,
    ).toBeTruthy();
    expect((await getCustomer(api, customer.id)).comparison).toBeNull();
  });
});
