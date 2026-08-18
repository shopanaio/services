/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ApiCustomer,
  ApiCustomerSegmentAttributeDescriptor,
  ApiCustomerSegmentFunctionParameterDescriptor,
  ApiCustomerSegmentQueryValidationResult,
} from '@codegen/admin-gql';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createGroup,
  createTag,
  expectNoUserErrors,
  openCustomersSql,
  rawId,
  selectStore,
  setupStore,
  updateCustomer,
  wrongTypeId,
} from './helpers';

type CustomerKey = 'alpha' | 'beta' | 'gamma';
const FIXTURE_CUSTOMER_COUNT = 53;

interface QueryCase {
  name: string;
  query: string;
  expected: CustomerKey[];
  generated?: 'all' | ((customer: GeneratedCustomer) => boolean);
  attributes: string[];
  operators: string[];
}

interface QueryFixtures {
  customers: Record<CustomerKey, ApiCustomer>;
  allCustomers: ApiCustomer[];
  generatedCustomers: GeneratedCustomer[];
  tagId: string;
  groupId: string;
}

interface GeneratedCustomer {
  customer: ApiCustomer;
  dateOfBirth: string;
  locale: string;
}

interface DefinitionCoverage {
  attributes: Set<string>;
  operators: Set<string>;
  parameters: Set<string>;
}

interface CatalogIds {
  customer_tags: string;
  customer_groups: string;
}

async function createNoiseCustomers(
  api: Parameters<typeof setupStore>[0],
): Promise<GeneratedCustomer[]> {
  const locales = ['en-GB', 'de-DE', 'fr-FR', 'pl-PL', 'es-ES'];
  const inputs = Array.from({ length: FIXTURE_CUSTOMER_COUNT - 3 }, (_, index) => {
    const locale = locales[index % locales.length];
    const dateOfBirth = `${1980 + (index % 25)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 27) + 1).padStart(2, '0')}`;
    return {
      dateOfBirth,
      locale,
      input: {
        email: `query-user-${String(index + 1).padStart(3, '0')}-${crypto.randomUUID()}@noise.test`,
        firstName: `Query${index + 1}`,
        lastName: `Customer${FIXTURE_CUSTOMER_COUNT - index}`,
        preferredLocale: locale,
        dateOfBirth,
        companyName: `Noise Company ${String(index + 1).padStart(3, '0')}`,
      },
    };
  });

  const customers: GeneratedCustomer[] = [];
  for (const { dateOfBirth, input, locale } of inputs) {
    customers.push({
      customer: await createCustomer(api, input),
      dateOfBirth,
      locale,
    });
  }
  return customers;
}

async function preview(
  api: Parameters<typeof setupStore>[0],
  query: string,
  pagination: { first?: number; after?: string | null } = {},
) {
  const { data, errors } = await api.admin.query<any>(
    'customers-admin-api/CustomerSegmentPreview',
    {
      throwOnError: false,
      variables: { query, first: pagination.first ?? 50, after: pagination.after ?? null },
    },
  );
  expect(errors ?? []).toHaveLength(0);
  return data.customersQuery.customerSegmentPreview;
}

async function previewAllCustomers(api: Parameters<typeof setupStore>[0], query: string) {
  const customers: ApiCustomer[] = [];
  let after: string | null = null;
  let totalCount: number | null = null;
  let validation: ApiCustomerSegmentQueryValidationResult | null = null;

  do {
    const result = await preview(api, query, { first: 25, after });
    expect(result.validation, query).toMatchObject({ valid: true, diagnostics: [] });
    expect(result.timedOut, query).toBe(false);
    validation ??= result.validation;
    expect(result.validation.canonicalQuery, query).toBe(validation.canonicalQuery);
    expect(result.validation.definition, query).toEqual(validation.definition);
    totalCount ??= result.totalCount;
    expect(result.totalCount, query).toBe(totalCount);
    customers.push(...result.customers.edges.map(({ node }: { node: ApiCustomer }) => node));
    after = result.customers.pageInfo.hasNextPage ? result.customers.pageInfo.endCursor : null;
  } while (after);

  expect(customers, query).toHaveLength(totalCount ?? 0);
  expect(validation, query).not.toBeNull();
  if (!validation) throw new Error(`Preview returned no validation for ${query}`);
  return { customers, validation };
}

async function validateQuery(api: Parameters<typeof setupStore>[0], query: string) {
  const { data, errors } = await api.admin.query<any>(
    'customers-admin-api/CustomerSegmentQueryValidate',
    {
      throwOnError: false,
      variables: { query },
    },
  );
  expect(errors ?? [], query).toHaveLength(0);
  return data.customersQuery
    .customerSegmentQueryValidate as ApiCustomerSegmentQueryValidationResult;
}

async function attributeCatalog(api: Parameters<typeof setupStore>[0]) {
  const { data, errors } = await api.admin.query<any>(
    'customers-admin-api/CustomerSegmentAttributeCatalog',
    { throwOnError: false, variables: {} },
  );
  expect(errors ?? []).toHaveLength(0);
  return data.customersQuery
    .customerSegmentAttributeCatalog as ApiCustomerSegmentAttributeDescriptor[];
}

function collectDefinitionCoverage(definition: unknown): DefinitionCoverage {
  const coverage: DefinitionCoverage = {
    attributes: new Set(),
    operators: new Set(),
    parameters: new Set(),
  };
  const root = (definition as { root?: unknown } | null)?.root;

  const visit = (expression: unknown): void => {
    if (!expression || typeof expression !== 'object') return;
    const node = expression as Record<string, unknown>;
    if (node.kind === 'logical' && Array.isArray(node.children)) {
      node.children.forEach(visit);
      return;
    }
    if (node.kind === 'not') {
      visit(node.child);
      return;
    }
    if (node.kind === 'predicate') {
      coverage.attributes.add(String(node.attribute));
      coverage.operators.add(String(node.operator));
      return;
    }
    if (node.kind === 'function') {
      coverage.attributes.add(String(node.name));
      coverage.operators.add(String(node.operator));
      if (Array.isArray(node.parameters)) {
        for (const parameter of node.parameters as Record<string, unknown>[]) {
          coverage.parameters.add(`${String(node.name)}.${String(parameter.name)}`);
          coverage.operators.add(String(parameter.operator));
        }
      }
    }
  };

  visit(root);
  return coverage;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort();
}

function valueLiteral(
  descriptor: Pick<ApiCustomerSegmentAttributeDescriptor, 'name' | 'valueType' | 'enumValues'>,
  ids: CatalogIds,
  alternate = false,
): string {
  const specialStrings: Record<string, [string, string]> = {
    customer_language: ['en-US', 'uk-UA'],
    customer_source: ['import', 'api'],
    customer_email_domain: ['example.com', 'sample.org'],
    customer_countries: ['US', 'UA'],
    tax_exemption_countries: ['US', 'UA'],
    customer_regions: ['US-NY', 'UA-30'],
    customer_cities: ['US-NY::NEW YORK', 'UA-30::KYIV'],
    customer_postal_codes: ['10001', '01001'],
  };
  const index = alternate ? 1 : 0;
  switch (descriptor.valueType) {
    case 'String':
      return `'${specialStrings[descriptor.name]?.[index] ?? (alternate ? 'beta' : 'alpha')}'`;
    case 'Enum': {
      const value = descriptor.enumValues[index] ?? descriptor.enumValues[0];
      if (!value) throw new Error(`No enum fixture for ${descriptor.name}`);
      return `'${value}'`;
    }
    case 'Boolean':
      return alternate ? 'false' : 'true';
    case 'Integer':
    case 'Decimal':
      return alternate ? '2' : '1';
    case 'Money':
      return alternate ? '2.00' : '1.00';
    case 'Date':
      return alternate ? '2025-01-02' : '2025-01-01';
    case 'DateTime':
      return alternate ? '2025-01-02T00:00:00Z' : '2025-01-01T00:00:00Z';
    case 'ID': {
      const id = ids[descriptor.name as keyof CatalogIds];
      if (!id) throw new Error(`No valid ID fixture for ${descriptor.name}`);
      return `'${id}'`;
    }
    default:
      throw new Error(`No literal fixture for ${descriptor.name}:${descriptor.valueType}`);
  }
}

function comparisonClause(name: string, operator: string, first: string, second: string) {
  const symbols: Record<string, string> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
  };
  if (symbols[operator]) return `${name} ${symbols[operator]} ${first}`;
  if (operator === 'between') return `${name} BETWEEN ${first} AND ${second}`;
  if (operator === 'in') return `${name} IN (${first}, ${second})`;
  if (operator === 'not_in') return `${name} NOT IN (${first}, ${second})`;
  if (operator === 'contains') return `${name} CONTAINS ${first}`;
  if (operator === 'not_contains') return `${name} NOT CONTAINS ${first}`;
  if (operator === 'is_null') return `${name} IS NULL`;
  if (operator === 'is_not_null') return `${name} IS NOT NULL`;
  throw new Error(`No query fixture for operator ${operator}`);
}

function attributeOperatorQuery(
  descriptor: ApiCustomerSegmentAttributeDescriptor,
  operator: string,
  ids: CatalogIds,
) {
  if (descriptor.kind === 'FUNCTION') {
    if (operator === 'matches') return `${descriptor.name} MATCHES ()`;
    if (operator === 'not_matches') return `${descriptor.name} NOT MATCHES ()`;
    return comparisonClause(descriptor.name, operator, '', '');
  }
  return comparisonClause(
    descriptor.name,
    operator,
    valueLiteral(descriptor, ids),
    valueLiteral(descriptor, ids, true),
  );
}

function parameterOperatorQuery(
  fn: ApiCustomerSegmentAttributeDescriptor,
  parameter: ApiCustomerSegmentFunctionParameterDescriptor,
  operator: string,
  ids: CatalogIds,
) {
  const descriptor = { ...parameter, name: parameter.name };
  const clause = comparisonClause(
    parameter.name,
    operator,
    valueLiteral(descriptor, ids),
    valueLiteral(descriptor, ids, true),
  );
  return `${fn.name} MATCHES (${clause})`;
}

async function expectValidCatalogQuery(
  api: Parameters<typeof setupStore>[0],
  query: string,
  expected: { attribute: string; operator: string; parameter?: string },
) {
  const validation = await validateQuery(api, query);
  expect(validation, query).toMatchObject({ valid: true, diagnostics: [] });
  expect(validation.canonicalQuery, query).toEqual(expect.any(String));
  expect(validation.complexity, query).toEqual(expect.any(Number));
  const coverage = collectDefinitionCoverage(validation.definition);
  expect(sorted(coverage.attributes), query).toEqual([expected.attribute]);
  expect(sorted(coverage.operators), query).toEqual(
    sorted(new Set(expected.parameter ? ['matches', expected.operator] : [expected.operator])),
  );
  expect(sorted(coverage.parameters), query).toEqual(
    expected.parameter ? [expected.parameter] : [],
  );
}

async function expectCatalogValidationContract(
  api: Parameters<typeof setupStore>[0],
  catalog: ApiCustomerSegmentAttributeDescriptor[],
  ids: CatalogIds,
) {
  for (const descriptor of catalog.filter(({ availability }) => availability === 'AVAILABLE')) {
    for (const operator of descriptor.operators) {
      await test.step(`${descriptor.name} supports ${operator}`, async () => {
        await expectValidCatalogQuery(api, attributeOperatorQuery(descriptor, operator, ids), {
          attribute: descriptor.name,
          operator,
        });
      });
    }
    for (const parameter of descriptor.parameters) {
      for (const operator of parameter.operators) {
        await test.step(`${descriptor.name}.${parameter.name} supports ${operator}`, async () => {
          await expectValidCatalogQuery(
            api,
            parameterOperatorQuery(descriptor, parameter, operator, ids),
            {
              attribute: descriptor.name,
              operator,
              parameter: `${descriptor.name}.${parameter.name}`,
            },
          );
        });
      }
    }
  }
}

async function createQueryFixtures(api: Parameters<typeof setupStore>[0]): Promise<QueryFixtures> {
  const alpha = await createCustomer(api, {
    email: `alpha-${crypto.randomUUID()}@example.com`,
    phoneE164: '+12025550101',
    preferredLocale: 'en-US',
    dateOfBirth: '1990-02-14',
    companyName: 'Alpha Labs',
  });
  const beta = await createCustomer(api, {
    email: `beta-${crypto.randomUUID()}@sample.org`,
    phoneE164: '+380501234567',
    preferredLocale: 'uk-UA',
    dateOfBirth: '1985-11-30',
    companyName: 'Beta Works',
  });
  const gamma = await createCustomer(api);
  const deleted = await createCustomer(api, {
    email: `deleted-${crypto.randomUUID()}@example.com`,
    companyName: 'Alpha Labs',
  });
  const generatedCustomers = await createNoiseCustomers(api);
  const tag = await createTag(api, { name: `Query engine ${crypto.randomUUID()}` });
  const group = await createGroup(api, { name: `Query engine ${crypto.randomUUID()}` });

  const alphaUpdate = await updateCustomer(api, alpha, {
    addresses: {
      create: [
        {
          address1: '1 Main Street',
          city: 'New York',
          regionCode: 'NY',
          postalCode: '10001',
          countryCode: 'US',
        },
        {
          address1: '20 Queen Street West',
          city: 'Toronto',
          regionCode: 'ON',
          postalCode: 'M5H 3R3',
          countryCode: 'CA',
        },
      ],
    },
    consents: {
      set: [
        { channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: alpha.email },
        { channel: 'SMS', state: 'PENDING', contactPoint: alpha.phoneE164 },
        { channel: 'WHATSAPP', state: 'UNSUBSCRIBED', contactPoint: '+442071838750' },
        { channel: 'PUSH', state: 'SUBSCRIBED', contactPoint: 'alpha-device-token' },
      ],
    },
    tags: { tagIds: [tag.id] },
    taxIdentifiers: {
      create: [
        {
          identifierType: 'VAT',
          countryCode: 'US',
          value: 'ALPHA-QUERY-ENGINE',
          validFrom: '2020-01-01',
          validTo: '2099-12-31',
        },
      ],
    },
    taxExemptions: {
      create: [
        {
          code: 'RESALE',
          countryCode: 'US',
          validFrom: '2020-01-01',
          validTo: '2099-12-31',
        },
      ],
    },
  });
  expectNoUserErrors(alphaUpdate);

  const betaUpdate = await updateCustomer(api, beta, {
    addresses: {
      create: [
        {
          address1: '1 Khreshchatyk Street',
          city: 'Kyiv',
          regionCode: '30',
          postalCode: '01 001',
          countryCode: 'UA',
        },
      ],
    },
    groups: { memberships: [{ groupId: group.id }] },
    taxExemptions: {
      create: [
        {
          code: 'EXPIRED-RESALE',
          countryCode: 'US',
          validFrom: '2019-01-01',
          validTo: '2020-01-01',
        },
      ],
    },
  });
  expectNoUserErrors(betaUpdate);

  const gammaUpdate = await updateCustomer(api, gamma, {
    groups: {
      memberships: [{ groupId: group.id, expiresAt: new Date(Date.now() - 60_000).toISOString() }],
    },
  });
  expectNoUserErrors(gammaUpdate);

  const storeId = rawId(api.session.project.id);
  const alphaId = rawId(alpha.id);
  const betaId = rawId(beta.id);
  const gammaId = rawId(gamma.id);
  const deletedId = rawId(deleted.id);
  const sql = openCustomersSql();
  try {
    await sql`
      update customers.customer
      set account_status = 'REGISTERED', lifecycle_status = 'ACTIVE',
          email_verified = true, phone_verified = true, source = 'import',
          last_activity_at = '2024-01-15T10:00:00Z',
          created_at = '2024-01-10T10:00:00Z', updated_at = '2024-01-20T10:00:00Z'
      where id = ${alphaId}::uuid
    `;
    await sql`
      update customers.customer
      set account_status = 'INVITED', lifecycle_status = 'DISABLED',
          email_verified = false, phone_verified = false, source = 'api',
          last_activity_at = null,
          created_at = '2024-02-10T10:00:00Z', updated_at = '2024-02-20T10:00:00Z'
      where id = ${betaId}::uuid
    `;
    await sql`
      update customers.customer
      set account_status = 'GUEST', lifecycle_status = 'ACTIVE', source = 'checkout',
          last_activity_at = '2024-03-15T10:00:00Z',
          created_at = '2024-03-10T10:00:00Z', updated_at = '2024-03-20T10:00:00Z'
      where id = ${gammaId}::uuid
    `;
    await sql`
      update customers.customer
      set deleted_at = now(), company_name = 'Alpha Labs'
      where id = ${deletedId}::uuid
    `;

    await sql`
      insert into customers.customer_statistics (
        customer_id, store_id, orders_count, completed_orders_count,
        cancelled_orders_count, returns_count, first_order_id, first_order_at,
        last_order_id, last_order_at, last_checkout_at
      ) values (
        ${alphaId}::uuid, ${storeId}::uuid, 4, 3, 1, 2,
        ${crypto.randomUUID()}::uuid, '2025-01-02T10:00:00Z',
        ${crypto.randomUUID()}::uuid, '2025-03-02T10:00:00Z',
        '2025-04-02T10:00:00Z'
      ), (
        ${betaId}::uuid, ${storeId}::uuid, 1, 1, 0, 0,
        ${crypto.randomUUID()}::uuid, '2025-06-02T10:00:00Z',
        ${crypto.randomUUID()}::uuid, '2025-06-02T10:00:00Z',
        null
      )
    `;
    await sql`
      insert into customers.customer_monetary_statistics (
        store_id, customer_id, currency_code, orders_count, total_spent_minor,
        total_refunded_minor, net_spent_minor, average_order_value_minor
      ) values
        (${storeId}::uuid, ${alphaId}::uuid, 'USD', 3, 15000, 3000, 12000, 5000),
        (${storeId}::uuid, ${betaId}::uuid, 'USD', 1, 2000, 0, 2000, 2000),
        (${storeId}::uuid, ${alphaId}::uuid, 'EUR', 1, 99900, 0, 99900, 99900)
    `;

    await sql`
      insert into customers.customer_order_projection (
        order_id, store_id, customer_id, revision, status, currency_code,
        total_amount_minor, created_at, completed_at, cancelled_at, updated_at
      ) values
        (${crypto.randomUUID()}::uuid, ${storeId}::uuid, ${alphaId}::uuid, 1,
         'COMPLETED', 'USD', 10000, '2025-01-01T10:00:00Z',
         '2025-01-02T10:00:00Z', null, '2025-01-02T10:00:00Z'),
        (${crypto.randomUUID()}::uuid, ${storeId}::uuid, ${alphaId}::uuid, 1,
         'COMPLETED', 'USD', 5000, '2025-02-01T10:00:00Z',
         '2025-02-02T10:00:00Z', null, '2025-02-02T10:00:00Z'),
        (${crypto.randomUUID()}::uuid, ${storeId}::uuid, ${alphaId}::uuid, 1,
         'CANCELLED', 'USD', 7000, '2025-03-01T10:00:00Z',
         null, '2025-03-02T10:00:00Z', '2025-03-02T10:00:00Z'),
        (${crypto.randomUUID()}::uuid, ${storeId}::uuid, ${betaId}::uuid, 1,
         'OPEN', 'USD', 2000, '2025-07-01T10:00:00Z',
         null, null, '2025-07-01T10:00:00Z'),
        (${crypto.randomUUID()}::uuid, ${storeId}::uuid, ${alphaId}::uuid, 1,
         'COMPLETED', 'EUR', 99900, '2025-08-01T10:00:00Z',
         '2025-08-02T10:00:00Z', null, '2025-08-02T10:00:00Z')
    `;
  } finally {
    await sql.end();
  }

  return {
    customers: { alpha, beta, gamma },
    allCustomers: [alpha, beta, gamma, ...generatedCustomers.map(({ customer }) => customer)],
    generatedCustomers,
    tagId: tag.id,
    groupId: group.id,
  };
}

function queryCases(fixtures: QueryFixtures): QueryCase[] {
  const { tagId, groupId } = fixtures;
  return [
    {
      name: 'created date comparison',
      query: 'customer_added_date < 2024-02-01',
      expected: ['alpha'],
      attributes: ['customer_added_date'],
      operators: ['lt'],
    },
    {
      name: 'named date resolves in the Store calendar',
      query: 'customer_added_date = TODAY',
      expected: [],
      generated: 'all',
      attributes: ['customer_added_date'],
      operators: ['eq'],
    },
    {
      name: 'relative date excludes customers created today',
      query: 'customer_added_date < -1d',
      expected: ['alpha', 'beta', 'gamma'],
      attributes: ['customer_added_date'],
      operators: ['lt'],
    },
    {
      name: 'updated date range',
      query: 'customer_updated_date BETWEEN 2024-02-01 AND 2024-02-29',
      expected: ['beta'],
      attributes: ['customer_updated_date'],
      operators: ['between'],
    },
    {
      name: 'nullable activity',
      query: 'last_activity_date IS NULL',
      expected: ['beta'],
      generated: 'all',
      attributes: ['last_activity_date'],
      operators: ['is_null'],
    },
    {
      name: 'account enum IN',
      query: "customer_account_status IN ('REGISTERED', 'INVITED')",
      expected: ['alpha', 'beta'],
      attributes: ['customer_account_status'],
      operators: ['in'],
    },
    {
      name: 'lifecycle inequality',
      query: "customer_lifecycle_status != 'DISABLED'",
      expected: ['alpha', 'gamma'],
      generated: 'all',
      attributes: ['customer_lifecycle_status'],
      operators: ['neq'],
    },
    {
      name: 'language NOT IN excludes null',
      query: "customer_language NOT IN ('uk-UA')",
      expected: ['alpha'],
      generated: 'all',
      attributes: ['customer_language'],
      operators: ['not_in'],
    },
    {
      name: 'source equality',
      query: "customer_source = 'import'",
      expected: ['alpha'],
      attributes: ['customer_source'],
      operators: ['eq'],
    },
    {
      name: 'normalized email domain',
      query: "customer_email_domain = 'EXAMPLE.COM'",
      expected: ['alpha'],
      attributes: ['customer_email_domain'],
      operators: ['eq'],
    },
    {
      name: 'email boolean',
      query: 'email_verified = true',
      expected: ['alpha'],
      attributes: ['email_verified'],
      operators: ['eq'],
    },
    {
      name: 'phone boolean',
      query: 'phone_verified = false',
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['phone_verified'],
      operators: ['eq'],
    },
    {
      name: 'nullable company',
      query: 'company_name IS NULL',
      expected: ['gamma'],
      attributes: ['company_name'],
      operators: ['is_null'],
    },
    {
      name: 'date of birth upper bound',
      query: 'date_of_birth <= 1985-12-31',
      expected: ['beta'],
      generated: ({ dateOfBirth }) => dateOfBirth <= '1985-12-31',
      attributes: ['date_of_birth'],
      operators: ['lte'],
    },

    {
      name: 'country list',
      query: "customer_countries CONTAINS 'US'",
      expected: ['alpha'],
      attributes: ['customer_countries'],
      operators: ['contains'],
    },
    {
      name: 'list complement is based on absence of a matching item',
      query: "customer_countries NOT CONTAINS 'US'",
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['customer_countries'],
      operators: ['not_contains'],
    },
    {
      name: 'region list',
      query: "customer_regions CONTAINS 'UA-30'",
      expected: ['beta'],
      attributes: ['customer_regions'],
      operators: ['contains'],
    },
    {
      name: 'city list',
      query: "customer_cities CONTAINS 'US-NY::NEW YORK'",
      expected: ['alpha'],
      attributes: ['customer_cities'],
      operators: ['contains'],
    },
    {
      name: 'postal list',
      query: "customer_postal_codes CONTAINS '01 001'",
      expected: ['beta'],
      attributes: ['customer_postal_codes'],
      operators: ['contains'],
    },
    {
      name: 'tag Global ID list',
      query: `customer_tags CONTAINS '${tagId}'`,
      expected: ['alpha'],
      attributes: ['customer_tags'],
      operators: ['contains'],
    },
    {
      name: 'group Global ID list',
      query: `customer_groups CONTAINS '${groupId}'`,
      expected: ['beta'],
      attributes: ['customer_groups'],
      operators: ['contains'],
    },
    {
      name: 'list complement',
      query: `customer_tags NOT CONTAINS '${tagId}'`,
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['customer_tags'],
      operators: ['not_contains'],
    },
    {
      name: 'empty list',
      query: 'customer_groups IS NULL',
      expected: ['alpha', 'gamma'],
      generated: 'all',
      attributes: ['customer_groups'],
      operators: ['is_null'],
    },
    {
      name: 'non-empty list',
      query: 'customer_countries IS NOT NULL',
      expected: ['alpha', 'beta'],
      attributes: ['customer_countries'],
      operators: ['is_not_null'],
    },

    {
      name: 'email consent',
      query: "email_subscription_status = 'SUBSCRIBED'",
      expected: ['alpha'],
      attributes: ['email_subscription_status'],
      operators: ['eq'],
    },
    {
      name: 'sms consent',
      query: "sms_subscription_status = 'PENDING'",
      expected: ['alpha'],
      attributes: ['sms_subscription_status'],
      operators: ['eq'],
    },
    {
      name: 'WhatsApp consent',
      query: "whatsapp_subscription_status = 'UNSUBSCRIBED'",
      expected: ['alpha'],
      attributes: ['whatsapp_subscription_status'],
      operators: ['eq'],
    },
    {
      name: 'push consent',
      query: "push_subscription_status = 'SUBSCRIBED'",
      expected: ['alpha'],
      attributes: ['push_subscription_status'],
      operators: ['eq'],
    },

    {
      name: 'tax identifier effective status',
      query: "tax_identifier_statuses CONTAINS 'UNVERIFIED'",
      expected: ['alpha'],
      attributes: ['tax_identifier_statuses'],
      operators: ['contains'],
    },
    {
      name: 'tax exemption effective status',
      query: "tax_exemption_statuses CONTAINS 'ACTIVE'",
      expected: ['alpha'],
      attributes: ['tax_exemption_statuses'],
      operators: ['contains'],
    },
    {
      name: 'expired tax exemption effective status',
      query: "tax_exemption_statuses CONTAINS 'EXPIRED'",
      expected: ['beta'],
      attributes: ['tax_exemption_statuses'],
      operators: ['contains'],
    },
    {
      name: 'tax exemption country',
      query: "tax_exemption_countries CONTAINS 'US'",
      expected: ['alpha'],
      attributes: ['tax_exemption_countries'],
      operators: ['contains'],
    },

    {
      name: 'completed order count',
      query: 'number_of_orders > 2',
      expected: ['alpha'],
      attributes: ['number_of_orders'],
      operators: ['gt'],
    },
    {
      name: 'cancelled order count',
      query: 'cancelled_orders_count >= 1',
      expected: ['alpha'],
      attributes: ['cancelled_orders_count'],
      operators: ['gte'],
    },
    {
      name: 'return count',
      query: 'returns_count = 0',
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['returns_count'],
      operators: ['eq'],
    },
    {
      name: 'first order date',
      query: 'first_order_date = 2025-01-02',
      expected: ['alpha'],
      attributes: ['first_order_date'],
      operators: ['eq'],
    },
    {
      name: 'last order date',
      query: 'last_order_date > 2025-05-01',
      expected: ['beta'],
      attributes: ['last_order_date'],
      operators: ['gt'],
    },
    {
      name: 'last checkout null',
      query: 'last_checkout_date IS NULL',
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['last_checkout_date'],
      operators: ['is_null'],
    },
    {
      name: 'net spend money',
      query: 'amount_spent >= 120.00',
      expected: ['alpha'],
      attributes: ['amount_spent'],
      operators: ['gte'],
    },
    {
      name: 'money statistics ignore rows in a non-Store currency',
      query: 'amount_spent = 999.00',
      expected: [],
      attributes: ['amount_spent'],
      operators: ['eq'],
    },
    {
      name: 'gross spend money',
      query: 'gross_amount_spent BETWEEN 20.00 AND 150.00',
      expected: ['alpha', 'beta'],
      attributes: ['gross_amount_spent'],
      operators: ['between'],
    },
    {
      name: 'refund money',
      query: 'amount_refunded = 30.00',
      expected: ['alpha'],
      attributes: ['amount_refunded'],
      operators: ['eq'],
    },
    {
      name: 'average order money',
      query: 'average_order_value < 30.00',
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['average_order_value'],
      operators: ['lt'],
    },

    {
      name: 'birthday virtual date',
      query: 'birthday = 2030-02-14',
      expected: ['alpha'],
      generated: ({ dateOfBirth }) => dateOfBirth.slice(5) === '02-14',
      attributes: ['birthday'],
      operators: ['eq'],
    },
    {
      name: 'birthday null',
      query: 'birthday IS NULL',
      expected: ['gamma'],
      attributes: ['birthday'],
      operators: ['is_null'],
    },

    {
      name: 'order existence function',
      query: 'orders_placed MATCHES ()',
      expected: ['alpha', 'beta'],
      attributes: ['orders_placed'],
      operators: ['matches'],
    },
    {
      name: 'order relation null',
      query: 'orders_placed IS NULL',
      expected: ['gamma'],
      generated: 'all',
      attributes: ['orders_placed'],
      operators: ['is_null'],
    },
    {
      name: 'order relation non-null',
      query: 'orders_placed IS NOT NULL',
      expected: ['alpha', 'beta'],
      attributes: ['orders_placed'],
      operators: ['is_not_null'],
    },
    {
      name: 'order function complement',
      query: "orders_placed NOT MATCHES (status = 'COMPLETED')",
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['orders_placed'],
      operators: ['not_matches', 'eq'],
    },
    {
      name: 'order enum parameter IN',
      query: "orders_placed MATCHES (status IN ('COMPLETED', 'OPEN'))",
      expected: ['alpha', 'beta'],
      attributes: ['orders_placed'],
      operators: ['matches', 'in'],
    },
    {
      name: 'order created date parameter',
      query: 'orders_placed MATCHES (created_date = 2025-07-01)',
      expected: ['beta'],
      attributes: ['orders_placed'],
      operators: ['matches', 'eq'],
    },
    {
      name: 'order completed date parameter',
      query: 'orders_placed MATCHES (completed_date BETWEEN 2025-01-01 AND 2025-02-28)',
      expected: ['alpha'],
      attributes: ['orders_placed'],
      operators: ['matches', 'between'],
    },
    {
      name: 'order nullable parameter',
      query: 'orders_placed MATCHES (cancelled_date IS NOT NULL)',
      expected: ['alpha'],
      attributes: ['orders_placed'],
      operators: ['matches', 'is_not_null'],
    },
    {
      name: 'order money parameter',
      query: 'orders_placed MATCHES (amount BETWEEN 20.00 AND 100.00)',
      expected: ['alpha', 'beta'],
      attributes: ['orders_placed'],
      operators: ['matches', 'between'],
    },
    {
      name: 'order money ignores orders in a non-Store currency',
      query: 'orders_placed MATCHES (amount = 999.00)',
      expected: [],
      attributes: ['orders_placed'],
      operators: ['matches', 'eq'],
    },
    {
      name: 'order count aggregate',
      query: "orders_placed MATCHES (status = 'COMPLETED', count >= 2)",
      expected: ['alpha'],
      attributes: ['orders_placed'],
      operators: ['matches', 'eq', 'gte'],
    },
    {
      name: 'order count without a money predicate spans currencies',
      query: "orders_placed MATCHES (status = 'COMPLETED', count = 3)",
      expected: ['alpha'],
      attributes: ['orders_placed'],
      operators: ['matches', 'eq'],
    },
    {
      name: 'order sum aggregate',
      query: "orders_placed MATCHES (status = 'COMPLETED', sum_amount = 150.00)",
      expected: ['alpha'],
      attributes: ['orders_placed'],
      operators: ['matches', 'eq'],
    },

    {
      name: 'AND OR NOT and parentheses',
      query:
        "(company_name = 'Alpha Labs' OR company_name = 'Beta Works') AND NOT email_verified = false",
      expected: ['alpha'],
      attributes: ['company_name', 'email_verified'],
      operators: ['eq'],
    },
  ];
}

function complexQueryCases(fixtures: QueryFixtures): QueryCase[] {
  const { tagId, groupId } = fixtures;
  return [
    {
      name: 'combines profile, geography, consent, money, group and order function branches',
      query: `
        (
          customer_countries CONTAINS 'US'
          AND email_subscription_status = 'SUBSCRIBED'
          AND amount_spent >= 100.00
        )
        OR (
          customer_groups CONTAINS '${groupId}'
          AND orders_placed MATCHES (status = 'OPEN', amount = 20.00)
        )
      `,
      expected: ['alpha', 'beta'],
      attributes: [
        'customer_countries',
        'email_subscription_status',
        'amount_spent',
        'customer_groups',
        'orders_placed',
      ],
      operators: ['contains', 'eq', 'gte', 'matches'],
    },
    {
      name: 'applies NOT to a nested OR expression as an exact complement',
      query: `
        NOT (
          company_name = 'Alpha Labs'
          OR customer_tags CONTAINS '${tagId}'
        )
        AND customer_lifecycle_status IN ('ACTIVE', 'DISABLED')
      `,
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['company_name', 'customer_tags', 'customer_lifecycle_status'],
      operators: ['eq', 'contains', 'in'],
    },
    {
      name: 'combines function aggregates with tax, classification and virtual birthday',
      query: `
        orders_placed MATCHES (
          status = 'COMPLETED',
          completed_date BETWEEN 2025-01-01 AND 2025-02-28,
          count >= 2,
          sum_amount = 150.00
        )
        AND (
          tax_exemption_statuses CONTAINS 'ACTIVE'
          OR customer_tags CONTAINS '${tagId}'
        )
        AND birthday BETWEEN 2030-02-01 AND 2030-02-28
      `,
      expected: ['alpha'],
      attributes: ['orders_placed', 'tax_exemption_statuses', 'customer_tags', 'birthday'],
      operators: ['matches', 'eq', 'between', 'gte', 'contains'],
    },
    {
      name: 'keeps missing statistics and relations explicit through NULL branches',
      query: `
        last_checkout_date IS NULL
        AND number_of_orders <= 1
        AND (
          customer_countries CONTAINS 'UA'
          OR customer_countries IS NULL
        )
      `,
      expected: ['beta', 'gamma'],
      generated: 'all',
      attributes: ['last_checkout_date', 'number_of_orders', 'customer_countries'],
      operators: ['is_null', 'lte', 'contains'],
    },
    {
      name: 'uses nested function and money negation across customers without orders',
      query: `
        NOT (
          orders_placed MATCHES (status = 'COMPLETED', count >= 2)
          OR gross_amount_spent > 100.00
        )
        AND customer_email_domain IS NULL
      `,
      expected: ['gamma'],
      attributes: ['orders_placed', 'gross_amount_spent', 'customer_email_domain'],
      operators: ['matches', 'eq', 'gte', 'gt', 'is_null'],
    },
    {
      name: 'honors AND precedence over OR without parentheses',
      query: `
        company_name = 'Alpha Labs'
        OR company_name = 'Beta Works' AND email_verified = true
      `,
      expected: ['alpha'],
      attributes: ['company_name', 'email_verified'],
      operators: ['eq'],
    },
    {
      name: 'parentheses override default boolean precedence',
      query: `
        (company_name = 'Alpha Labs' OR company_name = 'Beta Works')
        AND email_verified = false
      `,
      expected: ['beta'],
      attributes: ['company_name', 'email_verified'],
      operators: ['eq'],
    },
    {
      name: 'returns an exact empty set for contradictory nested conditions',
      query: `
        (
          customer_tags CONTAINS '${tagId}'
          AND customer_tags NOT CONTAINS '${tagId}'
        )
        OR (
          orders_placed IS NULL
          AND orders_placed IS NOT NULL
        )
      `,
      expected: [],
      attributes: ['customer_tags', 'orders_placed'],
      operators: ['contains', 'not_contains', 'is_null', 'is_not_null'],
    },
  ];
}

async function expectQueryCases(
  api: Parameters<typeof setupStore>[0],
  cases: QueryCase[],
  fixtures: QueryFixtures,
) {
  for (const queryCase of cases) {
    await test.step(queryCase.name, async () => {
      const expectedGenerated =
        queryCase.generated === 'all'
          ? fixtures.generatedCustomers
          : typeof queryCase.generated === 'function'
            ? fixtures.generatedCustomers.filter(queryCase.generated)
            : [];
      const expected = [
        ...queryCase.expected.map((key) => fixtures.customers[key]),
        ...expectedGenerated.map(({ customer }) => customer),
      ];
      const { customers: actual, validation } = await previewAllCustomers(api, queryCase.query);
      const coverage = collectDefinitionCoverage(validation.definition);
      expect(sorted(coverage.attributes), `${queryCase.query} (attributes)`).toEqual(
        sorted(new Set(queryCase.attributes)),
      );
      expect(sorted(coverage.operators), `${queryCase.query} (operators)`).toEqual(
        sorted(new Set(queryCase.operators)),
      );
      const comparable = (customers: ApiCustomer[]) =>
        customers
          .map(({ id, email }) => ({ id, email }))
          .sort((left, right) => left.id.localeCompare(right.id));
      expect(comparable(actual), queryCase.query).toEqual(comparable(expected));
    });
  }
}

test.describe('Customers Admin API - segment query engine contracts', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore({ timezone: 'Europe/Kyiv' });
  });

  test('runtime catalog and semantic validator agree for every attribute, parameter and operator', async ({
    api,
  }) => {
    const tag = await createTag(api);
    const group = await createGroup(api);
    const catalog = await attributeCatalog(api);

    expect(catalog.length).toBeGreaterThan(0);
    expect(new Set(catalog.map(({ name }) => name)).size).toBe(catalog.length);
    await expectCatalogValidationContract(api, catalog, {
      customer_tags: tag.id,
      customer_groups: group.id,
    });
  });

  test('compiler branches and nested expressions return exact paginated customer sets', async ({
    api,
  }) => {
    const fixtures = await createQueryFixtures(api);
    expect(fixtures.allCustomers).toHaveLength(FIXTURE_CUSTOMER_COUNT);
    await expectQueryCases(api, queryCases(fixtures), fixtures);
    await expectQueryCases(api, complexQueryCases(fixtures), fixtures);
  });

  test('unavailable query functions fail closed and return no customers', async ({ api }) => {
    await createCustomer(api, { companyName: 'Unavailable function sentinel' });
    const result = await preview(api, 'products_purchased MATCHES ()');
    expect(result).toMatchObject({
      validation: {
        valid: false,
        diagnostics: [
          expect.objectContaining({
            code: 'SEGMENT_ATTRIBUTE_UNAVAILABLE',
            severity: 'ERROR',
          }),
        ],
      },
      customers: null,
      totalCount: null,
      timedOut: false,
    });
  });

  test('invalid syntax and semantics return stable diagnostic codes and never execute preview', async ({
    api,
  }) => {
    const cases = [
      { query: 'company_name =', code: 'SEGMENT_QUERY_SYNTAX_ERROR' },
      { query: "unknown_attribute = 'x'", code: 'SEGMENT_UNKNOWN_ATTRIBUTE' },
      { query: 'email_verified > true', code: 'SEGMENT_OPERATOR_NOT_SUPPORTED' },
      {
        query: "customer_account_status = 'UNKNOWN'",
        code: 'SEGMENT_INVALID_ENUM_VALUE',
      },
      {
        query: `customer_tags CONTAINS '${wrongTypeId('Product')}'`,
        code: 'SEGMENT_INVALID_ENTITY_ID',
      },
      { query: 'date_of_birth = 2025-02-30', code: 'SEGMENT_INVALID_DATE' },
      {
        query: 'date_of_birth BETWEEN 2025-02-02 AND 2025-01-01',
        code: 'SEGMENT_INVALID_DATE_RANGE',
      },
      { query: 'amount_spent = 1.001', code: 'SEGMENT_INVALID_MONEY' },
      {
        query: 'orders_placed MATCHES (count >= 1, count <= 2)',
        code: 'SEGMENT_DUPLICATE_PARAMETER',
      },
      {
        query: 'products_purchased MATCHES ()',
        code: 'SEGMENT_ATTRIBUTE_UNAVAILABLE',
      },
      {
        query: Array.from({ length: 21 }, (_, index) => `number_of_orders >= ${index}`).join(
          ' OR ',
        ),
        code: 'SEGMENT_COMPLEXITY_LIMIT',
      },
    ];

    for (const invalid of cases) {
      await test.step(invalid.code, async () => {
        const result = await preview(api, invalid.query);
        expect(result.validation.valid, invalid.query).toBe(false);
        expect(
          result.validation.diagnostics.map(({ code }: { code: string }) => code),
          invalid.query,
        ).toContain(invalid.code);
        expect(result, invalid.query).toMatchObject({
          customers: null,
          totalCount: null,
          timedOut: false,
        });
      });
    }
  });

  test('preview is explicitly isolated by Store even for identical customer data', async ({
    api,
  }) => {
    const localStore = api.session.project;
    const local = await createCustomer(api, { companyName: 'Tenant Sentinel' });
    await api.session.setupProject();
    await createCustomer(api, { companyName: 'Tenant Sentinel' });
    const foreignGroup = await createGroup(api);
    selectStore(api, localStore);

    const result = await previewAllCustomers(api, "company_name = 'tenant sentinel'");
    expect(result.customers.map(({ id }) => id)).toEqual([local.id]);

    const foreignReference = await preview(api, `customer_groups CONTAINS '${foreignGroup.id}'`);
    expect(foreignReference).toMatchObject({
      validation: {
        valid: false,
        diagnostics: [
          expect.objectContaining({ code: 'SEGMENT_INVALID_ENTITY_ID', severity: 'ERROR' }),
        ],
      },
      customers: null,
      totalCount: null,
      timedOut: false,
    });
  });

  test('date boundaries use the Store timezone rather than UTC', async ({ api }) => {
    const beforeLocalMidnight = await createCustomer(api);
    const atLocalMidnight = await createCustomer(api);
    const sql = openCustomersSql();
    try {
      await sql`
        update customers.customer
        set created_at = '2025-01-01T21:59:59Z'
        where id = ${rawId(beforeLocalMidnight.id)}::uuid
      `;
      await sql`
        update customers.customer
        set created_at = '2025-01-01T22:00:00Z'
        where id = ${rawId(atLocalMidnight.id)}::uuid
      `;
    } finally {
      await sql.end();
    }

    const result = await previewAllCustomers(api, 'customer_added_date = 2025-01-02');
    expect(result.customers.map(({ id }) => id)).toEqual([atLocalMidnight.id]);
    expect(result.validation.definition).toMatchObject({
      evaluationContext: { timeZone: 'Europe/Kyiv' },
    });
  });

  test('birthday handles February 29 consistently in leap and non-leap years', async ({ api }) => {
    const february28 = await createCustomer(api, { dateOfBirth: '1999-02-28' });
    const february29 = await createCustomer(api, { dateOfBirth: '2000-02-29' });

    const nonLeap = await previewAllCustomers(api, 'birthday = 2030-02-28');
    expect(sorted(nonLeap.customers.map(({ id }) => id))).toEqual(
      sorted([february28.id, february29.id]),
    );

    const leapFebruary28 = await previewAllCustomers(api, 'birthday = 2032-02-28');
    expect(leapFebruary28.customers.map(({ id }) => id)).toEqual([february28.id]);

    const leapFebruary29 = await previewAllCustomers(api, 'birthday = 2032-02-29');
    expect(leapFebruary29.customers.map(({ id }) => id)).toEqual([february29.id]);
  });

  test('preview rejects invalid limits and cursors as BAD_USER_INPUT', async ({ api }) => {
    for (const variables of [
      { query: 'company_name IS NULL', first: 0 },
      { query: 'company_name IS NULL', first: 101 },
      { query: 'company_name IS NULL', first: 10, after: 'not-a-preview-cursor' },
    ]) {
      const { errors } = await api.admin.query<any>('customers-admin-api/CustomerSegmentPreview', {
        throwOnError: false,
        variables,
      });
      expect(errors, JSON.stringify(variables)).toEqual([
        expect.objectContaining({
          extensions: expect.objectContaining({ code: 'BAD_USER_INPUT' }),
        }),
      ]);
    }
  });
});
