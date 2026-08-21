/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  TAX_IDENTIFIER_FIELDS,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

type TaxPayload = {
  taxIdentifier?: Record<string, any> | null;
  customer: { revision: number } | null;
  userErrors: CustomerUserError[];
};

test.describe('Customers E2E API — tax synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const create = async (overrides: Record<string, unknown> = {}) =>
    kit.mutation<TaxPayload>(
      'customerTaxIdentifierCreate',
      'CustomerTaxIdentifierCreateInput',
      {
        identifierType: 'VAT',
        countryCode: 'UA',
        value: `VAT-${crypto.randomUUID()}`,
        isPrimary: false,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `taxIdentifier { ${TAX_IDENTIFIER_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  const update = async (taxIdentifierId: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<TaxPayload>(
      'customerTaxIdentifierUpdate',
      'CustomerTaxIdentifierUpdateInput',
      {
        taxIdentifierId,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `taxIdentifier { ${TAX_IDENTIFIER_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  test('admin-created tax identifier is visible through storefront', async () => {
    const payload = await kit.adminUpdate({
      taxIdentifiers: {
        create: [
          {
            identifierType: 'VAT',
            countryCode: 'ua',
            value: '  UA 123  ',
            isPrimary: true,
          },
        ],
      },
    });
    expect(payload.userErrors).toEqual([]);
    const customer = await kit.currentCustomer<any>(
      `taxIdentifiers(first: 10) { nodes { ${TAX_IDENTIFIER_FIELDS} } totalCount }`,
    );
    expect(customer.taxIdentifiers).toEqual(
      expect.objectContaining({
        totalCount: 1,
        nodes: [
          expect.objectContaining({
            countryCode: 'UA',
            value: 'UA 123',
            status: 'UNVERIFIED',
            isPrimary: true,
          }),
        ],
      }),
    );
  });

  test('storefront-created tax identifier is visible through admin', async () => {
    const response = await create({ value: 'UA-STORE-1' });
    expect(response.data?.payload.userErrors).toEqual([]);
    const identifier = response.data!.payload.taxIdentifier!;
    const admin = await kit.adminCustomer();
    expect(admin.taxIdentifiers.edges[0].node).toEqual(
      expect.objectContaining({
        id: identifier.id,
        value: 'UA-STORE-1',
        status: 'UNVERIFIED',
        verifiedAt: null,
      }),
    );
    expect(admin.revision).toBe(response.data?.payload.customer?.revision);
  });

  test('admin rejection of a tax identifier is reflected in storefront', async () => {
    const created = await create({ value: 'VERIFY-ME' });
    const id = created.data!.payload.taxIdentifier!.id;
    const payload = await kit.adminUpdate({
      taxIdentifiers: { update: [{ taxIdentifierId: id, operations: { status: 'REJECTED' } }] },
    });
    expect(payload.userErrors).toEqual([]);
    const customer = await kit.currentCustomer<any>(
      'taxIdentifiers(first: 10) { nodes { id status verifiedAt } }',
    );
    expect(customer.taxIdentifiers.nodes).toEqual([
      expect.objectContaining({ id, status: 'REJECTED', verifiedAt: null }),
    ]);
  });

  test('admin-created tax exemption and certificate are readable but immutable in storefront', async () => {
    const certificate = await kit.api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/customer-tax-certificate.pdf',
      originalName: 'tax-certificate.pdf',
    });
    const payload = await kit.adminUpdate({
      taxExemptions: {
        create: [
          {
            code: 'EXEMPT',
            countryCode: 'UA',
            reason: 'Merchant approved',
            certificateFileId: certificate.id,
          },
        ],
      },
    });
    expect(payload.userErrors).toEqual([]);
    const customer = await kit.currentCustomer<any>(
      'taxExemptions(first: 10) { nodes { id code status reason certificateFile { id } } totalCount }',
    );
    expect(customer.taxExemptions).toEqual(
      expect.objectContaining({
        totalCount: 1,
        nodes: [
          expect.objectContaining({
            code: 'EXEMPT',
            reason: 'Merchant approved',
            certificateFile: { id: certificate.id },
          }),
        ],
      }),
    );
    const schema = await kit.graphql<any>(
      'query TaxBoundary { __type(name: "Mutation") { fields { name } } }',
    );
    expect(
      schema
        .data!.__type.fields.map(({ name }: any) => name)
        .filter((name: string) => name.toLowerCase().includes('taxexemption')),
    ).toEqual([]);
  });

  test('primary tax identifier changes remain consistent across both APIs', async () => {
    const first = await create({ value: 'PRIMARY-A', isPrimary: true });
    const second = await create({ value: 'PRIMARY-B' });
    const selected = await update(second.data!.payload.taxIdentifier!.id, { isPrimary: true });
    expect(selected.data?.payload.userErrors).toEqual([]);
    const admin = await kit.adminCustomer();
    const identifiers = admin.taxIdentifiers.edges.map(({ node }: any) => node);
    expect(identifiers.filter(({ isPrimary }: any) => isPrimary)).toEqual([
      expect.objectContaining({ id: second.data!.payload.taxIdentifier!.id }),
    ]);
    expect(
      identifiers.find(({ id }: any) => id === first.data!.payload.taxIdentifier!.id).isPrimary,
    ).toBe(false);
  });

  test('admin and storefront tax writes reject stale shared revisions', async () => {
    const created = await create({ value: 'ATOMIC' });
    const id = created.data!.payload.taxIdentifier!.id;
    const stale = await kit.revision();
    const admin = await kit.adminUpdate({
      taxIdentifiers: { update: [{ taxIdentifierId: id, operations: { value: 'ADMIN' } }] },
    });
    expect(admin.userErrors).toEqual([]);
    const rejected = await update(id, { value: 'STOREFRONT' });
    kit.expectUserError(rejected.data!.payload.userErrors, 'REVISION_CONFLICT', {
      retryable: true,
    });
    expect(
      (await kit.currentCustomer<any>('taxIdentifiers(first: 10) { nodes { value } }'))
        .taxIdentifiers.nodes,
    ).toEqual([{ value: 'ADMIN' }]);
  });
});
