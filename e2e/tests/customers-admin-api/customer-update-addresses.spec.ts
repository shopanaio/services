/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  expectNoUserErrors,
  expectUserError,
  getCustomer,
  missingId,
  setupStore,
  updateCustomer,
} from './helpers';

const completeAddress = {
  label: 'Home',
  prefix: 'Dr',
  firstName: 'Ada',
  middleName: 'M',
  lastName: 'Lovelace',
  suffix: 'III',
  companyName: 'Engine',
  phoneE164: '+12025550101',
  address1: '1 Main St',
  address2: 'Suite 2',
  city: 'New York',
  regionName: 'New York',
  regionCode: 'NY',
  postalCode: '10001',
  countryCode: 'us',
  latitude: 40.7128,
  longitude: -74.006,
};

test.describe('Customers Admin API - customer address updates', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('unified update creates one complete international address', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      addresses: { create: [completeAddress] },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.addresses.totalCount).toBe(1);
    expect(payload.customer.addresses.edges[0].node).toMatchObject({
      ...completeAddress,
      countryCode: 'US',
      validationStatus: 'UNVALIDATED',
    });
  });

  test('unified update creates multiple addresses and assigns independent defaults', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      addresses: {
        create: [
          { address1: 'Ship', city: 'Kyiv', countryCode: 'UA', isDefaultShipping: true },
          { address1: 'Bill', city: 'Lviv', countryCode: 'UA', isDefaultBilling: true },
        ],
      },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.defaultShippingAddress.id).not.toBe(
      payload.customer.defaultBillingAddress.id,
    );
  });

  test('one address can be both shipping and billing default', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      addresses: {
        create: [
          {
            address1: 'Both',
            city: 'Kyiv',
            countryCode: 'UA',
            isDefaultShipping: true,
            isDefaultBilling: true,
          },
        ],
      },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.defaultShippingAddress.id).toBe(
      payload.customer.defaultBillingAddress.id,
    );
  });

  test('unified update patches an existing address', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      addresses: { create: [completeAddress] },
    });
    const address = created.customer.addresses.edges[0].node;
    const patched = await updateCustomer(api, created.customer, {
      addresses: {
        update: [{ addressId: address.id, operations: { city: 'Boston', address2: null } }],
      },
    });
    expectNoUserErrors(patched);
    expect(patched.customer.addresses.edges[0].node).toMatchObject({
      address1: completeAddress.address1,
      city: 'Boston',
      address2: null,
    });
  });

  test('unified update deletes an address and clears affected defaults', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      addresses: {
        create: [
          {
            address1: 'Delete',
            city: 'Kyiv',
            countryCode: 'UA',
            isDefaultShipping: true,
            isDefaultBilling: true,
          },
        ],
      },
    });
    const addressId = created.customer.addresses.edges[0].node.id;
    const deleted = await updateCustomer(api, created.customer, {
      addresses: { deleteIds: [addressId] },
    });
    expectNoUserErrors(deleted);
    expect(deleted.customer.addresses.totalCount).toBe(0);
    expect(deleted.customer.defaultShippingAddress).toBeNull();
    expect(deleted.customer.defaultBillingAddress).toBeNull();
  });

  test('unified update changes and explicitly clears defaults', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      addresses: {
        create: [
          { address1: 'A', city: 'A', countryCode: 'US', isDefaultShipping: true },
          { address1: 'B', city: 'B', countryCode: 'US' },
        ],
      },
    });
    const secondId = created.customer.addresses.edges.find(({ node }: any) => node.address1 === 'B')
      .node.id;
    const changed = await updateCustomer(api, created.customer, {
      addresses: { defaultShippingAddressId: secondId, defaultBillingAddressId: secondId },
    });
    expect(changed.customer.defaultShippingAddress.id).toBe(secondId);
    const cleared = await updateCustomer(api, changed.customer, {
      addresses: { defaultShippingAddressId: null, defaultBillingAddressId: null },
    });
    expect(cleared.customer.defaultShippingAddress).toBeNull();
    expect(cleared.customer.defaultBillingAddress).toBeNull();
  });

  test('address create update delete and default changes can be combined atomically', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const initial = await updateCustomer(api, customer, {
      addresses: {
        create: [
          { address1: 'Update', city: 'Old', countryCode: 'US' },
          { address1: 'Delete', city: 'Old', countryCode: 'US' },
        ],
      },
    });
    const [toUpdate, toDelete] = initial.customer.addresses.edges.map(({ node }: any) => node);
    const payload = await updateCustomer(api, initial.customer, {
      addresses: {
        create: [{ address1: 'Create', city: 'New', countryCode: 'CA', isDefaultShipping: true }],
        update: [
          { addressId: toUpdate.id, operations: { city: 'Updated', isDefaultBilling: true } },
        ],
        deleteIds: [toDelete.id],
      },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.addresses.totalCount).toBe(2);
    expect(payload.customer.addresses.edges.map(({ node }: any) => node.address1).sort()).toEqual([
      'Create',
      'Update',
    ]);
  });

  test('empty required address values are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const create of [
      { address1: '', city: 'A', countryCode: 'US' },
      { address1: 'A', city: ' ', countryCode: 'US' },
      { address1: 'A', city: 'A', countryCode: '' },
    ]) {
      const payload = await updateCustomer(api, customer, { addresses: { create: [create] } });
      expectUserError(payload, 'INVALID_VALUE');
      expect((await getCustomer(api, customer.id)).addresses.totalCount).toBe(0);
    }
  });

  test('invalid phone country code and coordinate boundaries are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const create of [
      { address1: 'A', city: 'A', countryCode: 'US', phoneE164: '555' },
      { address1: 'A', city: 'A', countryCode: 'USA' },
      { address1: 'A', city: 'A', countryCode: 'US', latitude: 90.1 },
      { address1: 'A', city: 'A', countryCode: 'US', longitude: -180.1 },
    ]) {
      const payload = await updateCustomer(api, customer, { addresses: { create: [create] } });
      expect(payload.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('duplicate IDs and conflicting update delete operations are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    const initial = await updateCustomer(api, customer, {
      addresses: { create: [{ address1: 'A', city: 'A', countryCode: 'US' }] },
    });
    const id = initial.customer.addresses.edges[0].node.id;
    for (const addresses of [
      { deleteIds: [id, id] },
      { update: [{ addressId: id, operations: { city: 'B' } }], deleteIds: [id] },
    ]) {
      const payload = await updateCustomer(api, initial.customer, { addresses });
      expect(payload.userErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: expect.stringMatching(/DUPLICATE_ID|CONFLICTING_OPERATION/),
          }),
        ]),
      );
    }
  });

  test('foreign customer address IDs are returned as NOT_FOUND', async ({ api }) => {
    const left = await createCustomer(api);
    const right = await createCustomer(api);
    const withAddress = await updateCustomer(api, right, {
      addresses: { create: [{ address1: 'Foreign', city: 'X', countryCode: 'US' }] },
    });
    const foreignId = withAddress.customer.addresses.edges[0].node.id;
    for (const addresses of [
      { update: [{ addressId: foreignId, operations: { city: 'Stolen' } }] },
      { deleteIds: [foreignId] },
      { defaultShippingAddressId: missingId('CustomerAddress') },
    ]) {
      const payload = await updateCustomer(api, left, { addresses });
      expectUserError(payload, 'NOT_FOUND');
    }
  });

  test('customerAddress direct query and nested connection return the same normalized object', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      addresses: { create: [completeAddress] },
    });
    const nested = created.customer.addresses.edges[0].node;
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerAddress', {
      variables: { id: nested.id },
    });
    expect(data.customersQuery.customerAddress).toMatchObject(nested);
    expect((await getCustomer(api, customer.id)).addresses.edges[0].node).toMatchObject(nested);
  });
});
