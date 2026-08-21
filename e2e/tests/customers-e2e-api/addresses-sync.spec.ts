/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  ADDRESS_FIELDS,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

type AddressPayload = {
  customerAddress: Record<string, unknown> | null;
  deletedAddressId?: string | null;
  customer: { revision: number } | null;
  userErrors: CustomerUserError[];
};
const address = { address1: '1 Cross API Street', city: 'Kyiv', countryCode: 'UA' };

test.describe('Customers E2E API — address synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const create = async (value = address, overrides: Record<string, unknown> = {}) =>
    kit.mutation<AddressPayload>(
      'customerAddressCreate',
      'CustomerAddressCreateInput',
      {
        address: value,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `customerAddress { ${ADDRESS_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const update = async (
    addressId: string,
    value: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<AddressPayload>(
      'customerAddressUpdate',
      'CustomerAddressUpdateInput',
      {
        addressId,
        address: value,
        
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

  test('admin-created addresses and defaults are visible through storefront', async () => {
    const payload = await kit.adminUpdate({
      addresses: {
        create: [
          { ...address, address1: 'Shipping', isDefaultShipping: true },
          { ...address, address1: 'Billing', isDefaultBilling: true },
        ],
      },
    });
    expect(payload.userErrors).toEqual([]);
    const customer = await kit.currentCustomer<any>(
      `defaultShippingAddress { id address1 } defaultBillingAddress { id address1 } addresses(first: 10) { nodes { ${ADDRESS_FIELDS} } totalCount }`,
    );
    expect(customer.addresses.totalCount).toBe(2);
    expect(customer.defaultShippingAddress.address1).toBe('Shipping');
    expect(customer.defaultBillingAddress.address1).toBe('Billing');
  });

  test('storefront-created address is visible through admin', async () => {
    const response = await create({ ...address, firstName: 'Ada', lastName: 'Lovelace' });
    expect(response.data?.payload.userErrors).toEqual([]);
    const created = response.data!.payload.customerAddress!;
    const admin = await kit.adminCustomer();
    expect(admin.addresses.edges[0].node).toEqual(
      expect.objectContaining({
        id: created.id,
        address1: address.address1,
        city: address.city,
        countryCode: 'UA',
      }),
    );
    expect(admin.revision).toBe(response.data?.payload.customer?.revision);
  });

  test('admin address update is reflected in storefront without leaking admin-only data', async () => {
    const created = await create();
    const id = created.data!.payload.customerAddress!.id as string;
    const admin = await kit.adminCustomer();
    const payload = await kit.adminUpdate(
      {
        addresses: {
          update: [{ addressId: id, operations: { city: 'Lviv', address2: 'Suite 4' } }],
        },
      },
      admin,
    );
    expect(payload.userErrors).toEqual([]);
    const storefront = await kit.currentCustomer<any>(
      'addresses(first: 10) { nodes { id city address2 formatted validationStatus } }',
    );
    expect(storefront.addresses.nodes).toEqual([
      expect.objectContaining({ id, city: 'Lviv', address2: 'Suite 4' }),
    ]);
    expect(JSON.stringify(storefront)).not.toMatch(/latitude|longitude|internal|assignedBy/iu);
  });

  test('storefront default change is reflected in admin aggregate', async () => {
    const first = await create({ ...address, address1: 'First' });
    const second = await create({ ...address, address1: 'Second' });
    const response = await kit.mutation<any>(
      'customerAddressDefaultSet',
      'CustomerAddressDefaultSetInput',
      {
        addressId: second.data!.payload.customerAddress!.id,
        defaults: ['SHIPPING', 'BILLING'],
        
        idempotencyKey: uniqueKey(),
      },
      `customer { revision defaultShippingAddress { id } defaultBillingAddress { id } } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    expect(response.data?.payload.userErrors).toEqual([]);
    const admin = await kit.adminCustomer();
    expect(admin.defaultShippingAddress.id).toBe(second.data!.payload.customerAddress!.id);
    expect(admin.defaultBillingAddress.id).toBe(second.data!.payload.customerAddress!.id);
    expect(
      admin.addresses.edges.find(
        ({ node }: any) => node.id === first.data!.payload.customerAddress!.id,
      ).node,
    ).toEqual(expect.objectContaining({ isDefaultShipping: false, isDefaultBilling: false }));
  });

  test('deleting an address through either API clears shared defaults consistently', async () => {
    const created = await create();
    const id = created.data!.payload.customerAddress!.id as string;
    const defaults = await kit.mutation<any>(
      'customerAddressDefaultSet',
      'CustomerAddressDefaultSetInput',
      {
        addressId: id,
        defaults: ['SHIPPING', 'BILLING'],
        
        idempotencyKey: uniqueKey(),
      },
      `customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );
    expect(defaults.data?.payload.userErrors).toEqual([]);
    const deleted = await remove(id);
    expect(deleted.data?.payload).toEqual(
      expect.objectContaining({ deletedAddressId: id, userErrors: [] }),
    );
    const admin = await kit.adminCustomer();
    expect(admin.addresses.totalCount).toBe(0);
    expect(admin.defaultShippingAddress).toBeNull();
    expect(admin.defaultBillingAddress).toBeNull();
  });

  test('admin and storefront cannot mutate each other with stale address revisions', async () => {
    const created = await create();
    const id = created.data!.payload.customerAddress!.id as string;
    const stale = await kit.revision();
    const admin = await kit.adminUpdate({
      addresses: { update: [{ addressId: id, operations: { city: 'Admin city' } }] },
    });
    expect(admin.userErrors).toEqual([]);
    const rejected = await update(
      id,
      { ...address, city: 'Stale city' },
      {  },
    );
    kit.expectUserError(rejected.data!.payload.userErrors, 'REVISION_CONFLICT', {
      retryable: true,
    });
    expect(
      (await kit.currentCustomer<any>('addresses(first: 10) { nodes { city } }')).addresses.nodes,
    ).toEqual([{ city: 'Admin city' }]);
  });
});
