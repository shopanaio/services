/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createSegment,
  customerEmail,
  expectNoUserErrors,
  expectRelayConnection,
  getCustomer,
  getCustomerByEmail,
  listCustomers,
  rawId,
  setupStore,
  updateCustomer,
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - customer queries', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin gets a customer by global ID with the complete aggregate', async ({ api }) => {
    const created = await createCustomer(api, {
      email: customerEmail(),
      firstName: 'Complete',
      lastName: 'Aggregate',
    });
    const customer = await getCustomer(api, created.id);
    expect(customer).toMatchObject({
      id: created.id,
      revision: 1,
      lifecycleStatus: 'ACTIVE',
      accountStatus: 'GUEST',
    });
    for (const connection of [
      'addresses',
      'taxIdentifiers',
      'taxExemptions',
      'groupMemberships',
      'tagAssignments',
      'segmentMemberships',
      'monetaryStatistics',
    ]) {
      expectRelayConnection(customer[connection], 0);
    }
    expect(customer).toHaveProperty('statistics');
    expect(customer).toHaveProperty('comparison');
    expect(customer.externalReferences).toEqual([]);
  });

  test('admin gets a customer by normalized email', async ({ api }) => {
    const email = customerEmail();
    const customer = await createCustomer(api, { email });
    expect((await getCustomerByEmail(api, ` ${email.toUpperCase()} `))?.id).toBe(customer.id);
  });

  test('missing customer and email return null', async ({ api }) => {
    expect(await getCustomer(api, wrongTypeId('Customer'))).toBeNull();
    expect(await getCustomerByEmail(api, customerEmail())).toBeNull();
  });

  test('customerByEmail never returns a customer from another store', async ({ api }) => {
    const email = customerEmail();
    await api.session.setupProject();
    const foreign = await createCustomer(api, { email });
    await api.session.setupProject();
    expect(await getCustomerByEmail(api, email)).toBeNull();
    expect(await getCustomer(api, foreign.id)).toBeNull();
  });

  test('customers returns an empty Relay connection', async ({ api }) => {
    const connection = await listCustomers(api, { first: 20 });
    expect(connection).toEqual({
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      totalCount: 0,
    });
  });

  test('customers supports stable forward pagination', async ({ api }) => {
    await Promise.all(
      ['A', 'B', 'C', 'D', 'E'].map((firstName) => createCustomer(api, { firstName })),
    );
    const first = await listCustomers(api, {
      first: 2,
      orderBy: [{ field: 'firstName', direction: 'asc' }],
    });
    const second = await listCustomers(api, {
      first: 2,
      after: first.pageInfo.endCursor,
      orderBy: [{ field: 'firstName', direction: 'asc' }],
    });
    const third = await listCustomers(api, {
      first: 2,
      after: second.pageInfo.endCursor,
      orderBy: [{ field: 'firstName', direction: 'asc' }],
    });
    expect(
      [...first.edges, ...second.edges, ...third.edges].map(({ node }: any) => node.firstName),
    ).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(
      new Set([...first.edges, ...second.edges, ...third.edges].map(({ node }: any) => node.id))
        .size,
    ).toBe(5);
  });

  test('customers supports stable backward pagination', async ({ api }) => {
    for (const firstName of ['A', 'B', 'C', 'D', 'E']) await createCustomer(api, { firstName });
    const tail = await listCustomers(api, {
      last: 2,
      orderBy: [{ field: 'firstName', direction: 'asc' }],
    });
    const previous = await listCustomers(api, {
      last: 2,
      before: tail.pageInfo.startCursor,
      orderBy: [{ field: 'firstName', direction: 'asc' }],
    });
    expect(previous.edges.map(({ node }: any) => node.firstName)).toEqual(['B', 'C']);
    expect(tail.edges.map(({ node }: any) => node.firstName)).toEqual(['D', 'E']);
  });

  test('customers uses ID as a deterministic tie breaker', async ({ api }) => {
    const customers = await Promise.all(
      Array.from({ length: 4 }, () => createCustomer(api, { firstName: 'Tie' })),
    );
    const orderBy = [{ field: 'firstName', direction: 'asc' }];
    const left = await listCustomers(api, { first: 10, orderBy });
    const right = await listCustomers(api, { first: 10, orderBy });
    const expectedIds = customers
      .map(({ id }) => id)
      .sort((leftId, rightId) => rawId(leftId).localeCompare(rawId(rightId)));
    expect(left.edges.map(({ node }: any) => node.id)).toEqual(expectedIds);
    expect(right.edges.map(({ node }: any) => node.id)).toEqual(expectedIds);
    expect(new Set(left.edges.map(({ cursor }: any) => cursor)).size).toBe(customers.length);
  });

  test('customers totalCount reflects filters not page size', async ({ api }) => {
    await Promise.all(
      ['Ada', 'Ada', 'Ada', 'Grace'].map((firstName) => createCustomer(api, { firstName })),
    );
    const connection = await listCustomers(api, { first: 1, where: { firstName: { _eq: 'Ada' } } });
    expect(connection.edges).toHaveLength(1);
    expect(connection.totalCount).toBe(3);
  });

  test('customers supports compound AND OR and NOT filters', async ({ api }) => {
    await createCustomer(api, { firstName: 'Ada', lastName: 'Lovelace', companyName: 'Engine' });
    await createCustomer(api, { firstName: 'Grace', lastName: 'Hopper', companyName: 'Navy' });
    await createCustomer(api, { firstName: 'Alan', lastName: 'Turing', companyName: 'Lab' });
    const connection = await listCustomers(api, {
      first: 10,
      where: {
        _and: [
          { _or: [{ firstName: { _eq: 'Ada' } }, { firstName: { _eq: 'Grace' } }] },
          { _not: { companyName: { _eq: 'Navy' } } },
        ],
      },
    });
    expect(connection.edges.map(({ node }: any) => node.firstName)).toEqual(['Ada']);
  });

  test('customers filters by identity lifecycle account and verification fields', async ({
    api,
  }) => {
    const email = customerEmail();
    const active = await createCustomer(api, { email, phoneE164: '+12025550101' });
    const blockedPayload = await updateCustomer(api, active, {
      status: { status: 'BLOCKED', blockedReason: 'risk' },
    });
    expectNoUserErrors(blockedPayload);
    for (const where of [
      { id: { _eq: active.id } },
      { lifecycleStatus: { _eq: 'BLOCKED' } },
      { accountStatus: { _eq: 'GUEST' } },
      { email: { _eq: email } },
      { phoneE164: { _eq: '+12025550101' } },
      { emailVerified: { _eq: false } },
      { phoneVerified: { _eq: false } },
      { source: { _eq: 'admin' } },
    ]) {
      expect(
        (await listCustomers(api, { first: 10, where })).edges.map(({ node }: any) => node.id),
      ).toContain(active.id);
    }
  });

  test('customers filters by profile company locale and date fields', async ({ api }) => {
    const customer = await createCustomer(api, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      preferredLocale: 'en-GB',
      dateOfBirth: '1990-12-10',
      companyName: 'Engine',
    });
    for (const where of [
      { firstName: { _eq: 'Ada' } },
      { lastName: { _contains: 'Love' } },
      { displayName: { _containsi: 'ada' } },
      { companyName: { _eq: 'Engine' } },
      { preferredLocale: { _eq: 'en-GB' } },
      { dateOfBirth: { _eq: '1990-12-10' } },
      { createdAt: { _lte: new Date().toISOString() } },
      { updatedAt: { _isNot: true } },
    ]) {
      expect(
        (await listCustomers(api, { first: 10, where })).edges.map(({ node }: any) => node.id),
      ).toContain(customer.id);
    }
  });

  test('customers filters by default shipping geography and marketing state', async ({ api }) => {
    const customer = await createCustomer(api, { email: customerEmail() });
    const updated = await updateCustomer(api, customer, {
      addresses: {
        create: [
          {
            address1: '1 Test',
            city: 'Kyiv',
            regionCode: '30',
            countryCode: 'ua',
            isDefaultShipping: true,
          },
        ],
      },
      consents: { set: [{ channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: customer.email }] },
    });
    expectNoUserErrors(updated);
    const where = {
      defaultShippingCity: { _eq: 'Kyiv' },
      defaultShippingRegionCode: { _eq: '30' },
      defaultShippingCountryCode: { _eq: 'UA' },
      emailMarketingState: { _eq: 'SUBSCRIBED' },
    };
    const result = await listCustomers(api, { first: 10, where });
    expect(result.edges.map(({ node }: any) => node.id)).toEqual([customer.id]);
  });

  test('customers filters by statistics spend and segment membership', async ({ api }) => {
    const customer = await createCustomer(api, { firstName: 'Segmented' });
    const segment = await createSegment(api);
    const update = await updateCustomer(api, customer, { segments: { segmentIds: [segment.id] } });
    expectNoUserErrors(update);
    const bySegment = await listCustomers(api, {
      first: 10,
      where: { segmentId: { _eq: segment.id } },
    });
    expect(bySegment.edges.map(({ node }: any) => node.id)).toEqual([customer.id]);
    const zeroOrders = await listCustomers(api, {
      first: 10,
      where: {
        ordersCount: { _is: true },
        totalSpentMinor: { _is: true },
        lastOrderAt: { _is: true },
      },
    });
    expect(zeroOrders.edges.map(({ node }: any) => node.id)).toContain(customer.id);
  });

  test('customers supports every declared order field in both directions', async ({ api }) => {
    await createCustomer(api, {
      email: customerEmail(),
      firstName: 'A',
      lastName: 'Z',
      dateOfBirth: '1990-01-01',
      companyName: 'A',
    });
    await createCustomer(api, {
      email: customerEmail(),
      firstName: 'B',
      lastName: 'Y',
      dateOfBirth: '2000-01-01',
      companyName: 'B',
    });
    const fields = [
      'id',
      'lifecycleStatus',
      'accountStatus',
      'email',
      'phoneE164',
      'firstName',
      'lastName',
      'dateOfBirth',
      'companyName',
      'lastActivityAt',
      'createdAt',
      'updatedAt',
      'displayName',
      'ordersCount',
      'lastOrderAt',
      'totalSpentMinor',
    ];
    for (const field of fields) {
      const ascending = await listCustomers(api, {
        first: 10,
        orderBy: [{ field, direction: 'asc' }],
      });
      const descending = await listCustomers(api, {
        first: 10,
        orderBy: [{ field, direction: 'desc' }],
      });
      expectRelayConnection(ascending, 2);
      expectRelayConnection(descending, 2);
      expect(descending.edges.map(({ node }: any) => node.id)).toEqual(
        ascending.edges.map(({ node }: any) => node.id).reverse(),
      );
    }
  });

  test('invalid cursor pagination combinations are rejected', async ({ api }) => {
    for (const variables of [
      { first: 1, last: 1 },
      { first: -1 },
      { last: -1 },
      { first: 101 },
      { after: 'x', before: 'y', first: 1 },
    ]) {
      const { data, errors } = await api.admin.query<any>('customers-admin-api/Customers', {
        throwOnError: false,
        variables,
      });
      expect(errors?.length || data?.customersQuery?.customers == null).toBeTruthy();
    }
  });

  test('malformed foreign-type and filter-mismatched cursors are rejected safely', async ({
    api,
  }) => {
    await createCustomer(api, { firstName: 'Cursor' });
    const page = await listCustomers(api, { first: 1, where: { firstName: { _eq: 'Cursor' } } });
    for (const after of [
      'not-a-cursor',
      Buffer.from(JSON.stringify({ t: 'product', v: ['x'] })).toString('base64'),
      page.pageInfo.endCursor,
    ]) {
      const { errors } = await api.admin.query<any>('customers-admin-api/Customers', {
        throwOnError: false,
        variables: {
          first: 1,
          after,
          where: after === page.pageInfo.endCursor ? { firstName: { _eq: 'Other' } } : undefined,
        },
      });
      expect(errors?.length).toBeGreaterThan(0);
    }
  });

  test('customer aggregate returns created address and tax identifier connections', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const updated = await updateCustomer(api, customer, {
      addresses: {
        create: [
          { label: 'B', address1: '2', city: 'B', countryCode: 'US' },
          { label: 'A', address1: '1', city: 'A', countryCode: 'US' },
        ],
      },
      taxIdentifiers: {
        create: [
          { identifierType: 'VAT', value: 'B' },
          { identifierType: 'VAT', value: 'A' },
        ],
      },
    });
    expectNoUserErrors(updated);
    const loaded = await getCustomer(api, customer.id);
    expectRelayConnection(loaded.addresses, 2);
    expectRelayConnection(loaded.taxIdentifiers, 2);
    expect(loaded.addresses.edges.map(({ node }: any) => node.id).sort()).toEqual(
      updated.customer.addresses.edges.map(({ node }: any) => node.id).sort(),
    );
    expect(loaded.taxIdentifiers.edges.map(({ node }: any) => node.id).sort()).toEqual(
      updated.customer.taxIdentifiers.edges.map(({ node }: any) => node.id).sort(),
    );
  });

  test('batched nested relations do not leak or duplicate data across customers', async ({
    api,
  }) => {
    const left = await createCustomer(api);
    const right = await createCustomer(api);
    await updateCustomer(api, left, {
      addresses: { create: [{ address1: 'Left', city: 'Left', countryCode: 'US' }] },
    });
    await updateCustomer(api, right, {
      addresses: { create: [{ address1: 'Right', city: 'Right', countryCode: 'CA' }] },
    });
    const connection = await listCustomers(api, { first: 10 });
    const loaded = await Promise.all(
      connection.edges.map(({ node }: any) => getCustomer(api, node.id)),
    );
    expect(
      loaded
        .flatMap((customer: any) => customer.addresses.edges.map(({ node }: any) => node.address1))
        .sort(),
    ).toEqual(['Left', 'Right']);
  });
});
