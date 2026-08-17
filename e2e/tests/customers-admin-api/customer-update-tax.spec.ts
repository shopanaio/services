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
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - customer tax updates', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('unified update creates tax identifiers with defaults and normalization', async ({
    api,
  }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      taxIdentifiers: {
        create: [
          {
            identifierType: 'VAT',
            countryCode: 'ua',
            value: '  ua 123-45 ',
            validFrom: '2020-01-01',
            validTo: '2030-01-01',
          },
        ],
      },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.taxIdentifiers.edges[0].node).toMatchObject({
      identifierType: 'VAT',
      countryCode: 'UA',
      value: 'UA12345',
      normalizedValue: 'UA12345',
      status: 'UNVERIFIED',
      isPrimary: false,
    });
  });

  test('unified update creates and switches the primary tax identifier', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      taxIdentifiers: {
        create: [
          { identifierType: 'VAT', value: 'A', isPrimary: true },
          { identifierType: 'EIN', value: 'B' },
        ],
      },
    });
    const second = created.customer.taxIdentifiers.edges.find(
      ({ node }: any) => node.value === 'B',
    ).node;
    const switched = await updateCustomer(api, created.customer, {
      taxIdentifiers: { update: [{ taxIdentifierId: second.id, operations: { isPrimary: true } }] },
    });
    expect(
      switched.customer.taxIdentifiers.edges.filter(({ node }: any) => node.isPrimary),
    ).toHaveLength(1);
    expect(
      switched.customer.taxIdentifiers.edges.find(({ node }: any) => node.isPrimary).node.id,
    ).toBe(second.id);
  });

  test('unified update patches and deletes tax identifiers', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      taxIdentifiers: {
        create: [
          { identifierType: 'VAT', value: 'A' },
          { identifierType: 'EIN', value: 'B' },
        ],
      },
    });
    const [update, remove] = created.customer.taxIdentifiers.edges.map(({ node }: any) => node);
    const payload = await updateCustomer(api, created.customer, {
      taxIdentifiers: {
        update: [{ taxIdentifierId: update.id, operations: { value: 'C', countryCode: 'CA' } }],
        deleteIds: [remove.id],
      },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.taxIdentifiers.totalCount).toBe(1);
    expect(payload.customer.taxIdentifiers.edges[0].node).toMatchObject({
      id: update.id,
      value: 'C',
      countryCode: 'CA',
    });
  });

  test('duplicate normalized tax identifier is rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      taxIdentifiers: {
        create: [
          { identifierType: 'VAT', countryCode: 'UA', value: 'UA-123' },
          { identifierType: 'VAT', countryCode: 'ua', value: ' ua 123 ' },
        ],
      },
    });
    expectUserError(payload, 'DUPLICATE_TAX_IDENTIFIER');
    expect((await getCustomer(api, customer.id)).taxIdentifiers.totalCount).toBe(0);
  });

  test('invalid identifier type value country and date range are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const create of [
      { identifierType: '', value: 'A' },
      { identifierType: 'VAT', value: '' },
      { identifierType: 'VAT', value: 'A', countryCode: 'USA' },
      { identifierType: 'VAT', value: 'A', validFrom: '2030-01-01', validTo: '2020-01-01' },
    ]) {
      const payload = await updateCustomer(api, customer, { taxIdentifiers: { create: [create] } });
      expect(payload.userErrors.length).toBeGreaterThan(0);
      expect((await getCustomer(api, customer.id)).taxIdentifiers.totalCount).toBe(0);
    }
  });

  test('verified identifier requires verification metadata invariants', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'A', status: 'VERIFIED' }] },
    });
    expect(payload.userErrors.length).toBeGreaterThan(0);
    expect(payload.customer).toBeNull();
  });

  test('unified update creates updates and deletes tax exemptions', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      taxExemptions: {
        create: [
          {
            code: 'RESALE',
            countryCode: 'US',
            regionCode: 'NY',
            reason: 'Certificate',
            validFrom: '2020-01-01',
            validTo: '2030-01-01',
          },
          { code: 'CHARITY' },
        ],
      },
    });
    const [update, remove] = created.customer.taxExemptions.edges.map(({ node }: any) => node);
    const payload = await updateCustomer(api, created.customer, {
      taxExemptions: {
        update: [
          { taxExemptionId: update.id, operations: { reason: 'Updated', status: 'REVOKED' } },
        ],
        deleteIds: [remove.id],
      },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.taxExemptions.edges[0].node).toMatchObject({
      id: update.id,
      reason: 'Updated',
      status: 'REVOKED',
    });
  });

  test('invalid exemption code status and validity range are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    const invalid = [
      { code: '' },
      { code: 'A', status: 'UNKNOWN' },
      { code: 'A', validFrom: '2030-01-01', validTo: '2020-01-01' },
    ];
    for (const create of invalid) {
      const { data, errors } = await api.admin.mutation<any>('customers-admin-api/CustomerUpdate', {
        throwOnError: false,
        variables: {
          customerId: customer.id,
          expectedRevision: customer.revision,
          operations: { taxExemptions: { create: [create] } },
        },
      });
      expect(
        errors?.length || data?.customersMutation?.customerUpdate?.userErrors?.length,
      ).toBeTruthy();
    }
  });

  test('missing or cross-store certificate file is rejected safely', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const certificateFileId of [missingId('File'), wrongTypeId('Product')]) {
      const payload = await updateCustomer(api, customer, {
        taxExemptions: { create: [{ code: 'CERT', certificateFileId }] },
      });
      expect(payload.userErrors.length).toBeGreaterThan(0);
      expect(JSON.stringify(payload)).not.toContain('postgres');
    }
  });

  test('duplicate IDs and conflicting tax operations are rejected', async ({ api }) => {
    const customer = await createCustomer(api);
    const created = await updateCustomer(api, customer, {
      taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'A' }] },
      taxExemptions: { create: [{ code: 'A' }] },
    });
    const identifierId = created.customer.taxIdentifiers.edges[0].node.id;
    const exemptionId = created.customer.taxExemptions.edges[0].node.id;
    for (const operations of [
      { taxIdentifiers: { deleteIds: [identifierId, identifierId] } },
      {
        taxIdentifiers: {
          update: [{ taxIdentifierId: identifierId, operations: { value: 'B' } }],
          deleteIds: [identifierId],
        },
      },
      { taxExemptions: { deleteIds: [exemptionId, exemptionId] } },
      {
        taxExemptions: {
          update: [{ taxExemptionId: exemptionId, operations: { code: 'B' } }],
          deleteIds: [exemptionId],
        },
      },
    ])
      expect(
        (await updateCustomer(api, created.customer, operations)).userErrors.length,
      ).toBeGreaterThan(0);
  });

  test('tax child IDs must belong to the updated customer and current store', async ({ api }) => {
    const left = await createCustomer(api);
    const right = await createCustomer(api);
    const rightTax = await updateCustomer(api, right, {
      taxIdentifiers: { create: [{ identifierType: 'VAT', value: 'FOREIGN' }] },
      taxExemptions: { create: [{ code: 'FOREIGN' }] },
    });
    const identifierId = rightTax.customer.taxIdentifiers.edges[0].node.id;
    const exemptionId = rightTax.customer.taxExemptions.edges[0].node.id;
    for (const operations of [
      { taxIdentifiers: { deleteIds: [identifierId] } },
      { taxExemptions: { deleteIds: [exemptionId] } },
    ])
      expectUserError(await updateCustomer(api, left, operations), 'NOT_FOUND');
  });

  test('direct tax queries and nested filtered connections are consistent', async ({ api }) => {
    const customer = await createCustomer(api);
    const updated = await updateCustomer(api, customer, {
      taxIdentifiers: { create: [{ identifierType: 'VAT', countryCode: 'US', value: 'A' }] },
      taxExemptions: { create: [{ code: 'RESALE', countryCode: 'US' }] },
    });
    const identifier = updated.customer.taxIdentifiers.edges[0].node;
    const exemption = updated.customer.taxExemptions.edges[0].node;
    const [identifierResult, exemptionResult] = await Promise.all([
      api.admin.query<any>('customers-admin-api/CustomerTaxIdentifier', {
        variables: { id: identifier.id },
      }),
      api.admin.query<any>('customers-admin-api/CustomerTaxExemption', {
        variables: { id: exemption.id },
      }),
    ]);
    expect(identifierResult.data.customersQuery.customerTaxIdentifier).toMatchObject(identifier);
    expect(exemptionResult.data.customersQuery.customerTaxExemption).toMatchObject(exemption);
  });
});
