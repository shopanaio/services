/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  ADDRESS_FIELDS,
  PAGE_INFO_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  expectConnectionIntegrity,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface AddressPayload {
  customerAddress?: Record<string, unknown> | null;
  deletedAddressId?: string | null;
  customer: ({ revision: number } & Record<string, unknown>) | null;
  userErrors: CustomerUserError[];
}

const minimalAddress = { address1: '1 Khreshchatyk Street', city: 'Kyiv', countryCode: 'UA' };

test.describe('Customers Storefront API — addresses', () => {
  let kit: CustomersStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });

  test.afterEach(async () => kit.close());

  const create = async (
    address: Record<string, unknown> = minimalAddress,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<AddressPayload>(
      'customerAddressCreate',
      'CustomerAddressCreateInput',
      {
        address,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `customerAddress { ${ADDRESS_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  const update = async (
    addressId: string,
    address: Record<string, unknown> = minimalAddress,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<AddressPayload>(
      'customerAddressUpdate',
      'CustomerAddressUpdateInput',
      {
        addressId,
        address,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `customerAddress { ${ADDRESS_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  const remove = async (addressId: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<AddressPayload>(
      'customerAddressDelete',
      'CustomerAddressDeleteInput',
      {
        addressId,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `deletedAddressId customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  const defaults = async (
    addressId: string | null,
    selected: string[],
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<AddressPayload>(
      'customerAddressDefaultSet',
      'CustomerAddressDefaultSetInput',
      {
        addressId,
        defaults: selected,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `customer { revision defaultShippingAddress { id } defaultBillingAddress { id } } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  test('customer creates a complete international address', async () => {
    const revision = await kit.revision();
    const address = {
      label: 'Office',
      prefix: 'Dr',
      firstName: 'Ada',
      middleName: 'Augusta',
      lastName: 'Lovelace',
      suffix: 'Countess',
      company: 'Analytical Engines',
      address1: '  10 Downing Street  ',
      address2: 'Floor 2',
      city: 'London',
      countryCode: 'GB',
      provinceCode: 'ENG',
      zip: 'SW1A 2AA',
      phone: '+442079250918',
    };
    const response = await create(address);
    expect(response.errors).toBeUndefined();
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual({ revision: revision + 1 });
    expect(response.data?.payload.customerAddress).toEqual(
      expect.objectContaining({
        ...address,
        address1: '10 Downing Street',
        validationStatus: 'UNVALIDATED',
      }),
    );
  });

  test('customer creates a minimal valid address', async () => {
    const response = await create();
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customerAddress).toEqual(
      expect.objectContaining({
        ...minimalAddress,
        address2: null,
        phone: null,
        isDefaultShipping: false,
        isDefaultBilling: false,
      }),
    );
  });

  test('first address can become both shipping and billing default', async () => {
    const response = await create(minimalAddress, { defaultShipping: true, defaultBilling: true });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customerAddress).toEqual(
      expect.objectContaining({
        isDefaultShipping: true,
        isDefaultBilling: true,
      }),
    );
  });

  test('customer creates separate shipping and billing default addresses', async () => {
    const shipping = await create(minimalAddress, { defaultShipping: true });
    const billing = await create(
      { ...minimalAddress, address1: '2 Billing Street' },
      { defaultBilling: true },
    );
    const customer = await kit.currentCustomer<{
      defaultShippingAddress: { id: string };
      defaultBillingAddress: { id: string };
    }>('defaultShippingAddress { id } defaultBillingAddress { id }');
    expect(customer).toEqual({
      defaultShippingAddress: { id: shipping.data!.payload.customerAddress!.id },
      defaultBillingAddress: { id: billing.data!.payload.customerAddress!.id },
    });
  });

  test('assigning a new default atomically clears the previous default', async () => {
    const oldAddress = await create(minimalAddress, { defaultShipping: true });
    const nextAddress = await create(
      { ...minimalAddress, address1: '2 New Street' },
      { defaultShipping: true },
    );
    expect(nextAddress.data?.payload.userErrors).toEqual([]);
    const customer = await kit.currentCustomer<{
      addresses: { nodes: { id: string; isDefaultShipping: boolean }[] };
    }>('addresses(first: 10) { nodes { id isDefaultShipping } }');
    expect(customer.addresses.nodes).toEqual(
      expect.arrayContaining([
        { id: oldAddress.data!.payload.customerAddress!.id, isDefaultShipping: false },
        { id: nextAddress.data!.payload.customerAddress!.id, isDefaultShipping: true },
      ]),
    );
  });

  test('customer updates every address field', async () => {
    const created = await create();
    const replacement = {
      label: 'Home',
      prefix: 'Ms',
      firstName: 'Grace',
      middleName: 'B',
      lastName: 'Hopper',
      suffix: 'Rear Admiral',
      company: 'US Navy',
      address1: '1 Arlington Blvd',
      address2: 'Unit 7',
      city: 'Arlington',
      countryCode: 'US',
      provinceCode: 'VA',
      zip: '22201',
      phone: '+12025550123',
    };
    const response = await update(created.data!.payload.customerAddress!.id as string, replacement);
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customerAddress).toEqual(expect.objectContaining(replacement));
  });

  test('address update can independently set or preserve default flags', async () => {
    const created = await create(minimalAddress, { defaultShipping: true });
    const id = created.data!.payload.customerAddress!.id as string;
    const preserved = await update(id, { ...minimalAddress, city: 'Lviv' });
    expect(preserved.data?.payload.customerAddress).toEqual(
      expect.objectContaining({
        isDefaultShipping: true,
        isDefaultBilling: false,
      }),
    );
    const changed = await update(
      id,
      { ...minimalAddress, city: 'Odesa' },
      { defaultBilling: true },
    );
    expect(changed.data?.payload.customerAddress).toEqual(
      expect.objectContaining({
        isDefaultShipping: true,
        isDefaultBilling: true,
      }),
    );
  });

  test('customer deletes a non-default address', async () => {
    const created = await create();
    const id = created.data!.payload.customerAddress!.id as string;
    const response = await remove(id);
    expect(response.data?.payload).toEqual(
      expect.objectContaining({ deletedAddressId: id, userErrors: [] }),
    );
    expect(
      (await kit.currentCustomer<{ addresses: { totalCount: number } }>('addresses { totalCount }'))
        .addresses.totalCount,
    ).toBe(0);
  });

  test('deleting a default address clears the matching defaults consistently', async () => {
    const shipping = await create(minimalAddress, { defaultShipping: true });
    const billing = await create(
      { ...minimalAddress, address1: 'Billing' },
      { defaultBilling: true },
    );
    await remove(shipping.data!.payload.customerAddress!.id as string);
    expect(
      await kit.currentCustomer('defaultShippingAddress { id } defaultBillingAddress { id }'),
    ).toEqual({
      defaultShippingAddress: null,
      defaultBillingAddress: { id: billing.data!.payload.customerAddress!.id },
    });
  });

  test('customer sets both defaults to one existing address atomically', async () => {
    const created = await create();
    const id = created.data!.payload.customerAddress!.id as string;
    const response = await defaults(id, ['SHIPPING', 'BILLING']);
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual(
      expect.objectContaining({
        defaultShippingAddress: { id },
        defaultBillingAddress: { id },
      }),
    );
  });

  test('customer clears shipping billing and both defaults with null addressId', async () => {
    const created = await create(minimalAddress, { defaultShipping: true, defaultBilling: true });
    for (const selected of [['SHIPPING'], ['BILLING'], ['SHIPPING', 'BILLING']]) {
      await defaults(created.data!.payload.customerAddress!.id as string, selected);
      const response = await defaults(null, selected);
      expect(response.data?.payload.userErrors).toEqual([]);
      for (const value of selected) {
        expect(
          response.data?.payload.customer?.[
            value === 'SHIPPING' ? 'defaultShippingAddress' : 'defaultBillingAddress'
          ],
        ).toBeNull();
      }
    }
  });

  test('empty defaults list and duplicate defaults are rejected', async () => {
    const created = await create();
    for (const [selected, code] of [
      [[], 'INVALID_DEFAULTS'],
      [['SHIPPING', 'SHIPPING'], 'DUPLICATE_DEFAULT'],
    ] as const) {
      const response = await defaults(created.data!.payload.customerAddress!.id as string, [
        ...selected,
      ]);
      kit.expectUserError(response.data!.payload.userErrors, code);
    }
  });

  test('missing required address1 city or country code is rejected', async () => {
    for (const field of ['address1', 'city', 'countryCode']) {
      const input = Object.fromEntries(
        Object.entries(minimalAddress).filter(([key]) => key !== field),
      );
      const response = await create(input);
      expect(response.data ?? null).toBeNull();
      expect(response.errors?.[0]?.message).toContain(field);
    }
  });

  test('whitespace-only and oversized address values are rejected', async () => {
    for (const [field, value] of [
      ['address1', '   '],
      ['city', 'x'.repeat(129)],
      ['label', 'x'.repeat(65)],
    ]) {
      const response = await create({ ...minimalAddress, [field]: value });
      kit.expectUserError(response.data!.payload.userErrors, 'INVALID_VALUE');
      expect(response.data!.payload.userErrors[0]!.field).toContain(field);
    }
  });

  test('unsupported country code is rejected', async () => {
    const response = await create({ ...minimalAddress, countryCode: 'AQ' });
    if (response.errors) kit.expectBadUserInput(response);
    else kit.expectUserError(response.data!.payload.userErrors, 'INVALID_COUNTRY_CODE');
  });

  test('invalid phone is rejected', async () => {
    const before = await kit.rowCount('customer_address');
    const response = await create({ ...minimalAddress, phone: '050 123' });
    kit.expectUserError(response.data!.payload.userErrors, 'INVALID_PHONE');
    expect(await kit.rowCount('customer_address')).toBe(before);
  });

  test('formatted address output is deterministic across optional fields', async () => {
    const created = await create({
      ...minimalAddress,
      provinceCode: '30',
      zip: '01001',
      company: 'Shopana',
    });
    const id = created.data!.payload.customerAddress!.id as string;
    const first = await kit.currentCustomer<{ address: unknown }>(
      'address(id: "' + id + '") { formatted formattedArea country province }',
    );
    const second = await kit.currentCustomer<{ address: unknown }>(
      'address(id: "' + id + '") { formatted formattedArea country province }',
    );
    expect(first).toEqual(second);
    expect(first.address).toEqual(expect.objectContaining({ formatted: expect.any(Array) }));
  });

  test('address and defaults update reset or preserve validation metadata according to contract', async () => {
    const seeded = await kit.seedAddress();
    await kit.sql`update customers.customer_address set validation_status = 'VALID', validated_at = now() where id = ${seeded.id}`;
    const defaultOnly = await defaults(seeded.globalId, ['SHIPPING']);
    expect(defaultOnly.data?.payload.userErrors).toEqual([]);
    expect(
      (
        await kit.sql`select validation_status from customers.customer_address where id = ${seeded.id}`
      )[0]!.validation_status,
    ).toBe('VALID');
    const edited = await update(seeded.globalId, { ...minimalAddress, city: 'Lviv' });
    expect(edited.data?.payload.customerAddress).toEqual(
      expect.objectContaining({ validationStatus: 'UNVALIDATED', validatedAt: null }),
    );
  });

  test('missing cross-customer cross-store malformed and wrong-type address IDs are safe', async () => {
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedAddress({ customerId: foreignCustomer.id });
    const foreignStore = await kit.createForeignStore();
    const foreignStoreId = kit.headless.rawId(foreignStore.id);
    const crossStoreCustomer = await kit.createGuestCustomer({ storeId: foreignStoreId });
    const crossStore = await kit.seedAddress({
      customerId: crossStoreCustomer.id,
      storeId: foreignStoreId,
    });
    for (const id of [
      kit.id('CustomerAddress'),
      foreign.globalId,
      crossStore.globalId,
      'malformed',
      kit.id('CustomerTaxIdentifier'),
    ]) {
      const response = await update(id);
      const code = response.data?.payload.userErrors[0]?.code;
      expect(['NOT_FOUND', 'INVALID_ID']).toContain(code);
      expect(JSON.stringify(response)).not.toMatch(/stack|postgres|node_modules/iu);
    }
  });

  test('stale customer revision rejects create update delete and default set', async () => {
    const address = await kit.seedAddress();
    const advanced = await create({ ...minimalAddress, address1: 'Advance revision' });
    expect(advanced.data?.payload.userErrors).toEqual([]);
    const stale = (await kit.revision()) - 1;
    const responses = await Promise.all([
      create(minimalAddress, {  }),
      update(address.globalId, minimalAddress, {  }),
      remove(address.globalId, {  }),
      defaults(address.globalId, ['SHIPPING'], {  }),
    ]);
    for (const response of responses) {
      kit.expectUserError(response.data!.payload.userErrors, 'REVISION_CONFLICT', {
        retryable: true,
      });
    }
  });

  test('retrying each address mutation with the same idempotency key is side-effect free', async () => {
    const revision = await kit.revision();
    const key = uniqueKey();
    const input = { address: minimalAddress,  idempotencyKey: key };
    const first = await create(minimalAddress, input);
    const second = await create(minimalAddress, input);
    expect(second.data?.payload).toEqual(first.data?.payload);
    expect(await kit.rowCount('customer_address')).toBe(1);
    expect(await kit.revision()).toBe(revision + 1);
  });

  test('concurrent default changes preserve the single-default invariants', async () => {
    const a = await create();
    const b = await create({ ...minimalAddress, address1: 'Second' });
    expect(a.data?.payload.userErrors).toEqual([]);
    expect(b.data?.payload.userErrors).toEqual([]);
    const revision = await kit.revision();
    const results = await Promise.all([
      defaults(a.data!.payload.customerAddress!.id as string, ['SHIPPING'], {
        
      }),
      defaults(b.data!.payload.customerAddress!.id as string, ['SHIPPING'], {
        
      }),
    ]);
    expect(results.filter((result) => result.data!.payload.userErrors.length === 0)).toHaveLength(
      1,
    );
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_address where customer_id = ${kit.customer.rawId} and is_default_shipping`;
    expect(row!.count).toBe(1);
  });

  test('customer reads one owned address and inaccessible IDs return null', async () => {
    const owned = await kit.seedAddress();
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedAddress({ customerId: foreignCustomer.id });
    const ownedResponse = await kit.customerQuery<{ address: { id: string } | null }>(
      'address(id: $id) { id }',
      { id: owned.globalId },
      '$id: ID!',
    );
    const foreignResponse = await kit.customerQuery<{ address: { id: string } | null }>(
      'address(id: $id) { id }',
      { id: foreign.globalId },
      '$id: ID!',
    );
    expect(ownedResponse.data?.customer?.address).toEqual({ id: owned.globalId });
    expect(foreignResponse.data?.customer?.address).toBeNull();
  });

  test('addresses supports default stable forward and backward pagination', async () => {
    for (let index = 0; index < 5; index += 1)
      await kit.seedAddress({
        address1: `Address ${index}`,
        createdAt: new Date(Date.now() + index),
      });
    const first = await kit.currentCustomer<any>(
      `addresses(first: 2) { edges { cursor node { id } } nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} } }`,
    );
    expectConnectionIntegrity(first.addresses);
    const after = first.addresses.pageInfo.endCursor;
    const second = await kit.customerQuery<any>(
      `addresses(first: 2, after: $after) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
      { after },
      '$after: Cursor!',
    );
    expect(second.data!.customer!.addresses.nodes).not.toEqual(
      expect.arrayContaining(first.addresses.nodes),
    );
    const before = second.data!.customer!.addresses.pageInfo.startCursor;
    const backward = await kit.customerQuery<any>(
      `addresses(last: 2, before: $before) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
      { before },
      '$before: Cursor!',
    );
    expect(backward.data!.customer!.addresses.nodes).toEqual(first.addresses.nodes);
  });

  test('addresses rejects invalid sizes cursors and pagination combinations', async () => {
    for (const args of [
      'first: 0',
      'last: -1',
      'first: 2, last: 2',
      'first: 101',
      'first: 2, after: "bad"',
    ]) {
      const response = await kit.customerQuery(`addresses(${args}) { nodes { id } }`);
      expect(response.errors).not.toHaveLength(0);
      expect(JSON.stringify(response)).not.toMatch(/stack|postgres|node_modules/iu);
    }
  });
});
