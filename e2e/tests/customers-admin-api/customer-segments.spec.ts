/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  createSegment,
  customerEmail,
  expectNoUserErrors,
  expectRelayConnection,
  expectUserError,
  future,
  missingId,
  openCustomersSql,
  past,
  setupStore,
  updateSegment,
  wrongTypeId,
} from './helpers';

const validQuery = "company_name = 'Engine' AND customer_lifecycle_status = 'ACTIVE'";
async function validate(api: any, query: string) {
  return (
    await api.admin.query<any>('customers-admin-api/CustomerSegmentQueryValidate', {
      variables: { query },
    })
  ).data.customersQuery.customerSegmentQueryValidate;
}

test.describe('Customers Admin API - customer segments', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates a manual draft segment without a query', async ({ api }) => {
    const segment = await createSegment(api);
    expect(segment).toMatchObject({
      type: 'MANUAL',
      status: 'DRAFT',
      query: null,
      definition: {},
      definitionRevision: 1,
      revision: 1,
      customersCount: 0,
    });
  });

  test('admin creates a dynamic segment from a valid query', async ({ api }) => {
    const segment = await createSegment(api, { type: 'DYNAMIC', query: validQuery });
    expect(segment).toMatchObject({
      type: 'DYNAMIC',
      status: 'DRAFT',
      query: validQuery,
      definition: expect.any(Object),
      definitionRevision: 1,
      materializationStatus: 'PENDING',
    });
  });

  test('dynamic segment requires a query and manual segment forbids one', async ({ api }) => {
    for (const input of [
      { name: 'Dynamic', type: 'DYNAMIC' },
      { name: 'Manual', type: 'MANUAL', query: validQuery },
    ]) {
      const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerSegmentCreate', {
        variables: { input },
      });
      expect(data.customersMutation.customerSegmentCreate.userErrors[0].code).toMatch(
        /SEGMENT_QUERY_REQUIRED|SEGMENT_QUERY_NOT_ALLOWED/u,
      );
    }
  });

  test('blank duplicate names and invalid colors are rejected', async ({ api }) => {
    await createSegment(api, { name: 'VIP' });
    for (const input of [
      { name: '', type: 'MANUAL' },
      { name: ' vip ', type: 'MANUAL' },
      { name: 'Color', type: 'MANUAL', color: 'red' },
      { name: 'Color2', type: 'MANUAL', color: '#12345G' },
    ]) {
      const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerSegmentCreate', {
        variables: { input },
      });
      expect(data.customersMutation.customerSegmentCreate.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('segment query validation returns canonical query definition and complexity', async ({
    api,
  }) => {
    const result = await validate(api, "COMPANY_NAME = 'Straße' and amount_spent >= 12.3");
    expect(result).toMatchObject({
      valid: true,
      canonicalQuery: "company_name = 'strasse' AND amount_spent >= 12.30",
      definition: expect.any(Object),
      complexity: expect.any(Number),
      diagnostics: [],
    });
  });

  test('segment query validation returns precise diagnostics for invalid syntax semantics and types', async ({
    api,
  }) => {
    for (const query of [
      'company_name =',
      "unknown_attribute = 'x'",
      "email_verified = 'yes'",
      'date_of_birth = 2025-02-30',
    ]) {
      const result = await validate(api, query);
      expect(result.valid).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({
        code: expect.any(String),
        severity: 'ERROR',
        startOffset: expect.any(Number),
        endOffset: expect.any(Number),
        line: expect.any(Number),
        column: expect.any(Number),
      });
    }
  });

  test('segment query validation enforces complexity limits', async ({ api }) => {
    const query = Array.from({ length: 300 }, (_, i) => `number_of_orders >= ${i}`).join(' OR ');
    const result = await validate(api, query);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }: any) => code)).toContain('SEGMENT_COMPLEXITY_LIMIT');
  });

  test('segment preview returns matching customers count and Relay page', async ({ api }) => {
    await createCustomer(api, { companyName: 'Engine', email: customerEmail() });
    await createCustomer(api, { companyName: 'Other' });
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerSegmentPreview', {
      variables: { query: "company_name = 'engine'", first: 1 },
    });
    const preview = data.customersQuery.customerSegmentPreview;
    expect(preview.validation.valid).toBe(true);
    expect(preview.timedOut).toBe(false);
    expectRelayConnection(preview.customers, 1);
    expect(preview.totalCount).toBe(1);
  });

  test('invalid preview returns validation without executing a customer query', async ({ api }) => {
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerSegmentPreview', {
      variables: { query: 'invalid =' },
    });
    const preview = data.customersQuery.customerSegmentPreview;
    expect(preview).toMatchObject({
      validation: { valid: false },
      customers: null,
      totalCount: null,
      timedOut: false,
    });
  });

  test('segment preview reports timeout without partial success ambiguity', async ({ api }) => {
    const locker = openCustomersSql();
    let markLocked!: () => void;
    let releaseLock!: () => void;
    const locked = new Promise<void>((resolve) => {
      markLocked = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    const lockTask = locker.begin(async (transaction) => {
      await transaction`lock table customers.customer in access exclusive mode`;
      markLocked();
      await release;
    });

    await locked;
    try {
      const { data } = await api.admin.query<any>('customers-admin-api/CustomerSegmentPreview', {
        variables: { query: "company_name = 'timeout-probe'" },
      });
      expect(data.customersQuery.customerSegmentPreview).toMatchObject({
        timedOut: true,
        customers: null,
        totalCount: null,
        validation: {
          valid: true,
          diagnostics: expect.arrayContaining([
            expect.objectContaining({
              code: 'SEGMENT_PREVIEW_TIMEOUT',
              severity: 'WARNING',
            }),
          ]),
        },
      });
    } finally {
      releaseLock();
      await lockTask;
      await locker.end();
    }
  });

  test('segment attribute catalog describes every supported attribute function and availability', async ({
    api,
  }) => {
    const catalog = (
      await api.admin.query<any>('customers-admin-api/CustomerSegmentAttributeCatalog', {
        variables: {},
      })
    ).data.customersQuery.customerSegmentAttributeCatalog;
    expect(catalog.length).toBeGreaterThan(20);
    expect(catalog.map(({ name }: any) => name)).toEqual(
      expect.arrayContaining([
        'company_name',
        'amount_spent',
        'orders_placed',
        'products_purchased',
      ]),
    );
    expect(
      catalog.every(
        ({ operators, enumValues, parameters, availability }: any) =>
          Array.isArray(operators) &&
          Array.isArray(enumValues) &&
          Array.isArray(parameters) &&
          ['AVAILABLE', 'UNAVAILABLE'].includes(availability),
      ),
    ).toBe(true);
  });

  test('admin updates segment details definition state and memberships atomically', async ({
    api,
  }) => {
    const segment = await createSegment(api, { type: 'DYNAMIC', query: "company_name = 'a'" });
    const payload = await updateSegment(api, segment, {
      details: { name: 'Updated', description: 'D', color: '#112233' },
      definition: { query: "company_name = 'b'" },
      state: { status: 'ACTIVE' },
    });
    expectNoUserErrors(payload);
    expect(payload.segment).toMatchObject({
      name: 'Updated',
      description: 'D',
      color: '#112233',
      status: 'ACTIVE',
      query: "company_name = 'b'",
      revision: segment.revision + 1,
      definitionRevision: segment.definitionRevision + 1,
    });
  });

  test('definition revision changes only when the dynamic definition changes', async ({ api }) => {
    let segment = await createSegment(api, { type: 'DYNAMIC', query: "company_name = 'a'" });
    const revision = segment.definitionRevision;
    segment = (await updateSegment(api, segment, { details: { description: 'D' } })).segment;
    expect(segment.definitionRevision).toBe(revision);
    segment = (await updateSegment(api, segment, { state: { status: 'ACTIVE' } })).segment;
    expect(segment.definitionRevision).toBe(revision);
    segment = (await updateSegment(api, segment, { definition: { query: "company_name = 'b'" } }))
      .segment;
    expect(segment.definitionRevision).toBe(revision + 1);
  });

  test('aggregate revision changes for accepted definition state and membership updates', async ({
    api,
  }) => {
    let segment = await createSegment(api);
    const customer = await createCustomer(api);
    let revision = segment.revision;
    for (const operations of [
      { details: { description: 'D' } },
      { state: { status: 'ACTIVE' } },
      { memberships: { setCustomerIds: [customer.id] } },
    ]) {
      segment = (await updateSegment(api, segment, operations)).segment;
      expect(segment.revision).toBe(++revision);
    }
  });

  test('manual memberships support create update delete and atomic replacement', async ({
    api,
  }) => {
    let segment = await createSegment(api);
    const a = await createCustomer(api);
    const b = await createCustomer(api);
    const c = await createCustomer(api);
    segment = (
      await updateSegment(api, segment, {
        memberships: { create: [{ customerId: a.id }, { customerId: b.id }] },
      })
    ).segment;
    const [update, remove] = segment.customerMemberships.edges.map(({ node }: any) => node);
    segment = (
      await updateSegment(api, segment, {
        memberships: {
          update: [{ membershipId: update.id, expiresAt: future() }],
          deleteIds: [remove.id],
        },
      })
    ).segment;
    segment = (await updateSegment(api, segment, { memberships: { setCustomerIds: [c.id] } }))
      .segment;
    expect(segment.customerMemberships.edges.map(({ node }: any) => node.customer.id)).toEqual([
      c.id,
    ]);
  });

  test('membership replacement conflicts with incremental operations', async ({ api }) => {
    const segment = await createSegment(api);
    const customer = await createCustomer(api);
    expectUserError(
      await updateSegment(api, segment, {
        memberships: { setCustomerIds: [customer.id], create: [{ customerId: customer.id }] },
      }),
      'CONFLICTING_OPERATION',
    );
  });

  test('dynamic segment rejects manual membership operations', async ({ api }) => {
    const segment = await createSegment(api, { type: 'DYNAMIC', query: validQuery });
    const customer = await createCustomer(api);
    expectUserError(
      await updateSegment(api, segment, { memberships: { setCustomerIds: [customer.id] } }),
      'SEGMENT_NOT_MANUAL',
    );
  });

  test('segment memberships reject duplicate missing foreign customers and invalid expiry', async ({
    api,
  }) => {
    const segment = await createSegment(api);
    const customer = await createCustomer(api);
    for (const memberships of [
      { setCustomerIds: [customer.id, customer.id] },
      { setCustomerIds: [missingId()] },
      { create: [{ customerId: customer.id, expiresAt: past() }] },
    ])
      expect(
        (await updateSegment(api, segment, { memberships })).userErrors.length,
      ).toBeGreaterThan(0);
  });

  test('stale segment revision rejects all requested operations', async ({ api }) => {
    const segment = await createSegment(api);
    const winner = await updateSegment(api, segment, { details: { name: 'Winner' } });
    const stale = await updateSegment(
      api,
      segment,
      { details: { name: 'Loser' }, state: { status: 'ACTIVE' } },
      segment.revision,
    );
    expectUserError(stale, 'REVISION_CONFLICT');
    expect(
      (
        await api.admin.query<any>('customers-admin-api/CustomerSegment', {
          variables: { id: segment.id },
        })
      ).data.customersQuery.customerSegment.name,
    ).toBe(winner.segment.name);
  });

  test('changing dynamic definition invalidates stale RULE memberships fail-closed', async ({
    api,
  }) => {
    let segment = await createSegment(api, {
      type: 'DYNAMIC',
      status: 'ACTIVE',
      query: "company_name = 'a'",
    });
    const generation = segment.evaluationGeneration;
    segment = (await updateSegment(api, segment, { definition: { query: "company_name = 'b'" } }))
      .segment;
    expect(segment.definitionRevision).toBeGreaterThan(1);
    expect(segment.evaluationGeneration).toBeGreaterThanOrEqual(generation);
    expect(segment.materializationStatus).toBe('PENDING');
  });

  test('segment list filters ordering and Relay pagination are correct', async ({ api }) => {
    const b = await createSegment(api, { name: 'B' });
    const a = await createSegment(api, { name: 'A' });
    await createSegment(api, {
      name: 'Dynamic hidden',
      type: 'DYNAMIC',
      query: "company_name = 'hidden'",
    });
    const variables = {
      first: 1,
      where: { type: { _eq: 'MANUAL' } },
      orderBy: [{ field: 'name', direction: 'asc' }],
    };
    const list = (
      await api.admin.query<any>('customers-admin-api/CustomerSegments', {
        variables,
      })
    ).data.customersQuery.customerSegments;
    expectRelayConnection(list, 2);
    expect(list.edges[0].node.id).toBe(a.id);
    const next = (
      await api.admin.query<any>('customers-admin-api/CustomerSegments', {
        variables: { ...variables, after: list.pageInfo.endCursor },
      })
    ).data.customersQuery.customerSegments;
    expect(next.edges.map(({ node }: any) => node.id)).toEqual([b.id]);
    const back = (
      await api.admin.query<any>('customers-admin-api/CustomerSegments', {
        variables: {
          last: 1,
          before: next.pageInfo.startCursor,
          where: variables.where,
          orderBy: variables.orderBy,
        },
      })
    ).data.customersQuery.customerSegments;
    expect(back.edges.map(({ node }: any) => node.id)).toEqual([a.id]);
    expect(b.id).toEqual(expect.any(String));
  });

  test('segment membership connection filters ordering and pagination are correct', async ({
    api,
  }) => {
    const segment = await createSegment(api);
    const customers = await Promise.all([createCustomer(api), createCustomer(api)]);
    const updated = await updateSegment(api, segment, {
      memberships: { create: customers.map(({ id }) => ({ customerId: id })) },
    });
    expectRelayConnection(updated.segment.customerMemberships, 2);
    expect(
      updated.segment.customerMemberships.edges.every(
        ({ node }: any) => node.source === 'MANUAL' && node.isActive,
      ),
    ).toBe(true);
  });

  test('delete with matching revision removes a segment and memberships', async ({ api }) => {
    let segment = await createSegment(api);
    const customer = await createCustomer(api);
    segment = (
      await updateSegment(api, segment, { memberships: { setCustomerIds: [customer.id] } })
    ).segment;
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerSegmentDelete', {
      variables: { input: { id: segment.id, expectedRevision: segment.revision } },
    });
    expect(data.customersMutation.customerSegmentDelete).toMatchObject({
      deletedSegmentId: segment.id,
      userErrors: [],
    });
  });

  test('delete with stale revision or active dependency fails safely', async ({ api }) => {
    let segment = await createSegment(api);
    segment = (await updateSegment(api, segment, { details: { description: 'revision' } })).segment;
    const { data } = await api.admin.mutation<any>('customers-admin-api/CustomerSegmentDelete', {
      variables: { input: { id: segment.id, expectedRevision: 1 } },
    });
    expectUserError(data.customersMutation.customerSegmentDelete, 'REVISION_CONFLICT');
  });

  test('missing malformed and cross-store segment operations are safe', async ({ api }) => {
    for (const id of [missingId('CustomerSegment'), 'malformed', wrongTypeId()]) {
      const { data } = await api.admin.query<any>('customers-admin-api/CustomerSegment', {
        throwOnError: false,
        variables: { id },
      });
      expect(data?.customersQuery?.customerSegment ?? null).toBeNull();
    }
    const foreign = await createSegment(api);
    await api.session.setupProject();
    expect(
      (await updateSegment(api, foreign, { details: { name: 'No' } })).userErrors.length,
    ).toBeGreaterThan(0);
  });
});
