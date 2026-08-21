/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  PAGE_INFO_FIELDS,
  TAX_IDENTIFIER_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  expectConnectionIntegrity,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface TaxPayload {
  taxIdentifier?: Record<string, unknown> | null;
  deletedTaxIdentifierId?: string | null;
  customer: { revision: number } | null;
  userErrors: CustomerUserError[];
}

test.describe('Customers Storefront API — tax identifiers', () => {
  let kit: CustomersStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
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

  const remove = async (taxIdentifierId: string, overrides: Record<string, unknown> = {}) =>
    kit.mutation<TaxPayload>(
      'customerTaxIdentifierDelete',
      'CustomerTaxIdentifierDeleteInput',
      {
        taxIdentifierId,
        
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `deletedTaxIdentifierId customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  test('customer creates an unverified tax identifier', async () => {
    const revision = await kit.revision();
    const response = await create({ value: '  UA 123 456  ' });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.taxIdentifier).toEqual(
      expect.objectContaining({
        identifierType: 'VAT',
        countryCode: 'UA',
        value: 'UA 123 456',
        status: 'UNVERIFIED',
        isPrimary: false,
        verifiedAt: null,
      }),
    );
    expect(response.data?.payload.customer?.revision).toBe(revision + 1);
    expect(JSON.stringify(response)).not.toContain('normalizedValue');
  });

  test('customer creates a primary tax identifier', async () => {
    const response = await create({ isPrimary: true });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.taxIdentifier?.isPrimary).toBe(true);
  });

  test('creating or updating a new primary identifier clears the old primary', async () => {
    const first = await create({ value: 'FIRST', isPrimary: true });
    const second = await create({ value: 'SECOND', isPrimary: true });
    await update(first.data!.payload.taxIdentifier!.id as string, { isPrimary: true });
    const connection = await kit.currentCustomer<any>(
      'taxIdentifiers(first: 10) { nodes { id isPrimary } }',
    );
    expect(connection.taxIdentifiers.nodes.filter((item: any) => item.isPrimary)).toEqual([
      expect.objectContaining({ id: first.data!.payload.taxIdentifier!.id }),
    ]);
    expect(second.data?.payload.userErrors).toEqual([]);
  });

  test('customer updates identifier type country and value', async () => {
    const created = await create();
    const response = await update(created.data!.payload.taxIdentifier!.id as string, {
      identifierType: 'EIN',
      countryCode: 'US',
      value: '12-3456789',
    });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.taxIdentifier).toEqual(
      expect.objectContaining({
        identifierType: 'EIN',
        countryCode: 'US',
        value: '12-3456789',
      }),
    );
  });

  test('changing identifier identity resets VERIFIED REJECTED or EXPIRED status to UNVERIFIED', async () => {
    for (const status of ['VERIFIED', 'REJECTED', 'EXPIRED'] as const) {
      const seeded = await kit.seedTaxIdentifier({
        status,
        value: `${status}-${crypto.randomUUID()}`,
      });
      const response = await update(seeded.globalId, {
        value: `${status}-changed-${crypto.randomUUID()}`,
      });
      expect(response.data?.payload.taxIdentifier).toEqual(
        expect.objectContaining({
          status: 'UNVERIFIED',
          verifiedAt: null,
        }),
      );
    }
  });

  test('changing only isPrimary does not forge or unexpectedly reset verification', async () => {
    const seeded = await kit.seedTaxIdentifier({ status: 'VERIFIED' });
    const response = await update(seeded.globalId, { isPrimary: true });
    expect(response.data?.payload.taxIdentifier).toEqual(
      expect.objectContaining({
        status: 'VERIFIED',
        isPrimary: true,
        verifiedAt: expect.any(String),
      }),
    );
  });

  test('customer deletes an owned tax identifier', async () => {
    const created = await create();
    const id = created.data!.payload.taxIdentifier!.id as string;
    const response = await remove(id);
    expect(response.data?.payload).toEqual(
      expect.objectContaining({ deletedTaxIdentifierId: id, userErrors: [] }),
    );
    expect(
      (await kit.currentCustomer<any>('taxIdentifiers { totalCount }')).taxIdentifiers.totalCount,
    ).toBe(0);
  });

  test('blank invalid and oversized identifier type or value are rejected', async () => {
    for (const overrides of [
      { identifierType: ' ' },
      { identifierType: 'x'.repeat(65) },
      { value: ' ' },
      { value: 'x'.repeat(256) },
    ]) {
      const response = await create(overrides);
      expect(['INVALID_IDENTIFIER_TYPE', 'INVALID_VALUE']).toContain(
        response.data!.payload.userErrors[0]!.code,
      );
    }
  });

  test('invalid country code is rejected', async () => {
    const response = await create({ countryCode: 'AQ' });
    if (response.errors) kit.expectBadUserInput(response);
    else kit.expectUserError(response.data!.payload.userErrors, 'INVALID_COUNTRY_CODE');
  });

  test('duplicate normalized tax identifier is rejected', async () => {
    await create({ value: ' UA-123 ' });
    const duplicate = await create({ value: 'ua-123' });
    kit.expectUserError(duplicate.data!.payload.userErrors, 'TAX_IDENTIFIER_ALREADY_EXISTS');
    expect(await kit.rowCount('customer_tax_identifier')).toBe(1);
  });

  test('customer cannot set status verification timestamps or exemption fields', async () => {
    for (const field of ['status', 'verifiedAt', 'validFrom', 'validTo', 'exemptionCode']) {
      const response = await kit.graphql(
        `mutation InvalidTax($input: CustomerTaxIdentifierCreateInput!) {
        customerTaxIdentifierCreate(input: $input) { userErrors { code } }
      }`,
        {
          input: {
            identifierType: 'VAT',
            value: '1',
            
            idempotencyKey: uniqueKey(),
            [field]: field === 'status' ? 'VERIFIED' : '2026-01-01',
          },
        },
      );
      expect(response.data ?? null).toBeNull();
      expect(response.errors?.[0]?.message).toContain(`Field "${field}" is not defined`);
    }
  });

  test('missing cross-customer cross-store malformed and wrong-type tax IDs are safe', async () => {
    const foreignCustomer = await kit.createGuestCustomer();
    const foreign = await kit.seedTaxIdentifier({ customerId: foreignCustomer.id });
    const foreignStore = await kit.createForeignStore();
    const foreignStoreId = kit.headless.rawId(foreignStore.id);
    const crossStoreCustomer = await kit.createGuestCustomer({ storeId: foreignStoreId });
    const crossStore = await kit.seedTaxIdentifier({
      customerId: crossStoreCustomer.id,
      storeId: foreignStoreId,
    });
    for (const id of [
      kit.id('CustomerTaxIdentifier'),
      foreign.globalId,
      crossStore.globalId,
      'bad',
      kit.id('CustomerAddress'),
    ]) {
      const response = await update(id, { value: 'NOPE' });
      expect(['NOT_FOUND', 'INVALID_ID']).toContain(response.data!.payload.userErrors[0]!.code);
      expect(JSON.stringify(response)).not.toMatch(/stack|postgres|node_modules/iu);
    }
  });

  test('stale or invalid revision rejects create update and delete', async () => {
    const seeded = await kit.seedTaxIdentifier();
    for (const response of await Promise.all([
      create({  }),
      update(seeded.globalId, {  }),
      remove(seeded.globalId, {  }),
    ])) {
      kit.expectUserError(response.data!.payload.userErrors, 'INVALID_REVISION');
    }
  });

  test('retrying each tax mutation with the same idempotency key is side-effect free', async () => {
    const revision = await kit.revision();
    const input = { value: 'IDEMPOTENT', idempotencyKey: uniqueKey() };
    const first = await create(input);
    const replay = await create(input);
    expect(replay.data?.payload).toEqual(first.data?.payload);
    expect(await kit.rowCount('customer_tax_identifier')).toBe(1);
    expect(await kit.revision()).toBe(revision + 1);
  });

  test('concurrent primary updates preserve one-primary invariant', async () => {
    const a = await create({ value: 'A' });
    const b = await create({ value: 'B' });
    expect(a.data?.payload.userErrors).toEqual([]);
    expect(b.data?.payload.userErrors).toEqual([]);
    const revision = await kit.revision();
    const results = await Promise.all([
      update(a.data!.payload.taxIdentifier!.id as string, {
        isPrimary: true,
        
      }),
      update(b.data!.payload.taxIdentifier!.id as string, {
        isPrimary: true,
        
      }),
    ]);
    expect(results.filter((item) => item.data!.payload.userErrors.length === 0)).toHaveLength(1);
    const [row] =
      await kit.sql`select count(*)::int as count from customers.customer_tax_identifier where customer_id = ${kit.customer.rawId} and is_primary and deleted_at is null`;
    expect(row!.count).toBe(1);
  });

  test('tax identifiers support stable forward and backward pagination', async () => {
    for (let index = 0; index < 5; index += 1)
      await kit.seedTaxIdentifier({
        value: `PAGE-${index}`,
        createdAt: new Date(Date.now() + index),
      });
    const first = await kit.currentCustomer<any>(
      `taxIdentifiers(first: 2) { edges { cursor node { id } } nodes { id } totalCount pageInfo { ${PAGE_INFO_FIELDS} } }`,
    );
    expectConnectionIntegrity(first.taxIdentifiers);
    const after = first.taxIdentifiers.pageInfo.endCursor;
    const next = await kit.customerQuery<any>(
      `taxIdentifiers(first: 2, after: $after) { nodes { id } pageInfo { ${PAGE_INFO_FIELDS} } }`,
      { after },
      '$after: Cursor!',
    );
    const before = next.data!.customer!.taxIdentifiers.pageInfo.startCursor;
    const back = await kit.customerQuery<any>(
      `taxIdentifiers(last: 2, before: $before) { nodes { id } }`,
      { before },
      '$before: Cursor!',
    );
    expect(back.data!.customer!.taxIdentifiers.nodes).toEqual(first.taxIdentifiers.nodes);
  });

  test('customer sees merchant-approved tax exemptions but cannot mutate them', async () => {
    for (const status of ['ACTIVE', 'EXPIRED', 'REVOKED']) {
      await kit.sql`insert into customers.customer_tax_exemption
        (store_id, customer_id, code, country_code, reason, status)
        values (${kit.realm.storeId}, ${kit.customer.rawId}, ${`EX-${status}`}, 'UA', 'Approved', ${status})`;
    }
    const customer = await kit.currentCustomer<any>(
      'taxExemptions(first: 10) { nodes { id code status reason } totalCount }',
    );
    expect(customer.taxExemptions.totalCount).toBe(3);
    expect(customer.taxExemptions.nodes.map((item: any) => item.status).sort()).toEqual([
      'ACTIVE',
      'EXPIRED',
      'REVOKED',
    ]);
    const schema = await kit.graphql<any>(
      'query TaxMutationBoundary { __type(name: "Mutation") { fields { name } } }',
    );
    expect(
      schema
        .data!.__type.fields.map((field: any) => field.name)
        .filter((name: string) => name.toLowerCase().includes('taxexemption')),
    ).toEqual([]);
  });

  test('tax exemptions and certificate files are isolated by customer and store', async () => {
    const foreign = await kit.createGuestCustomer();
    await kit.sql`insert into customers.customer_tax_exemption
      (store_id, customer_id, code, status, certificate_file_id)
      values (${kit.realm.storeId}, ${foreign.id}, 'FOREIGN', 'ACTIVE', ${crypto.randomUUID()})`;
    const customer = await kit.currentCustomer<any>(
      'taxExemptions { nodes { code certificateFile { id } } totalCount }',
    );
    expect(customer.taxExemptions).toEqual(expect.objectContaining({ nodes: [], totalCount: 0 }));
  });

  test('unavailable certificate file resolves as null without failing the exemption connection', async () => {
    await kit.sql`insert into customers.customer_tax_exemption
      (store_id, customer_id, code, status, certificate_file_id)
      values (${kit.realm.storeId}, ${kit.customer.rawId}, 'MISSING-FILE', 'ACTIVE', ${crypto.randomUUID()})`;
    const response = await kit.customerQuery<any>(
      'taxExemptions { nodes { code certificateFile { id } } totalCount }',
    );
    expect(response.data?.customer?.taxExemptions).toEqual({
      nodes: [{ code: 'MISSING-FILE', certificateFile: null }],
      totalCount: 1,
    });
  });
});
