/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import {
  currentStore,
  openSql,
  rawId,
  setupStore,
  stableSettings,
  updateStore,
  validAddress,
  validBrand,
  validContact,
  validCurrencySettings,
  validDefaults,
  validOrderProcessing,
} from './helpers';

test.describe('Project Settings Admin API - saga and observability', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-OBS-001 create, update, and delete use stable content idempotency without sessions', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const clientMutationId = `observability-${crypto.randomUUID()}`;
    const first = await updateStore(api, store, { address: validAddress }, { clientMutationId });
    const retry = await updateStore(api, store, { address: validAddress }, { clientMutationId });
    expect(first.userErrors).toHaveLength(0);
    expect(retry.userErrors).toHaveLength(0);
    expect(retry.store?.revision).toBe(first.store?.revision);
    expect(JSON.stringify(retry)).not.toContain(api.session.accessToken!);
  });

  test('PRJ-OBS-002/PRJ-OBS-003 update snapshot and compensation cover every mutable settings section', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const seeded = await updateStore(api, store, {
      contactDetails: validContact('Snapshot profile', store.name),
      address: validAddress,
      brand: validBrand,
      orderProcessing: validOrderProcessing,
      defaults: validDefaults,
      currencySettings: validCurrencySettings,
    });
    expect(seeded.userErrors).toHaveLength(0);
    const snapshot = stableSettings(seeded.store!);
    const failed = await updateStore(api, seeded.store!, {
      contactDetails: validContact('Must compensate', store.name),
      address: { ...validAddress, countryCode: 'DE' },
      brand: {
        ...validBrand,
        defaultLogoId: composeGlobalId('File', crypto.randomUUID()),
      },
      orderProcessing: { ...validOrderProcessing, orderNumberPrefix: 'FAIL-' },
      defaults: { ...validDefaults, timezone: 'America/New_York' },
      currencySettings: { ...validCurrencySettings, currencyCode: 'GBP' },
    });
    expect(failed.store).toBeNull();
    const after = await currentStore(api);
    expect(after.revision).toBe(seeded.store?.revision);
    expect(stableSettings(after)).toEqual(snapshot);
  });

  test('PRJ-OBS-004 compensation failure is never represented as clean success', async ({ api }) => {
    const store = await currentStore(api);
    const failed = await updateStore(api, store, {
      brand: {
        ...validBrand,
        defaultLogoId: composeGlobalId('File', crypto.randomUUID()),
      },
    });
    expect(failed.store).toBeNull();
    expect(failed.userErrors.length).toBeGreaterThan(0);
    expect(failed.operationResults.every(({ applied }) => !applied)).toBe(true);
  });

  test('PRJ-OBS-005 storeCreated event exists only after the usable store is committed', async ({
    api,
  }) => {
    const sql = openSql();
    try {
      const store = await currentStore(api);
      const rows = await sql<{ payload: Record<string, unknown>; status: string }[]>`
        SELECT payload, status
        FROM domain_events
        WHERE event_type = 'storeCreated'
          AND subject_id = ${rawId(store.id)}
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.payload.storeId).toBe(rawId(store.id));
      expect(store.membership?.domain).toBe(`store:${rawId(store.id)}`);
    } finally {
      await sql.end();
    }
  });

  test('PRJ-OBS-006 storeDeleted event identifies tenancy without profile PII', async ({ api }) => {
    const sql = openSql();
    try {
      const store = await currentStore(api);
      const organizationId = api.session.organizationId!;
      await api.admin.mutation('project-api/ProjectDelete', {
        variables: { input: { id: store.id, organizationId } },
      });
      const rows = await sql<{ payload: Record<string, unknown> }[]>`
        SELECT payload
        FROM domain_events
        WHERE event_type = 'storeDeleted'
          AND subject_id = ${rawId(store.id)}
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.payload).toEqual({
        storeId: rawId(store.id),
        organizationId: rawId(organizationId),
      });
      expect(JSON.stringify(rows[0]?.payload)).not.toMatch(/(?:email|phone|displayName)/u);
    } finally {
      await sql.end();
    }
  });

  test('PRJ-OBS-007 errors expose safe stable codes and nested fields', async ({ api }) => {
    const store = await currentStore(api);
    const failed = await updateStore(api, store, {
      defaults: { ...validDefaults, timezone: 'Invalid/Timezone' },
    });
    expect(failed.userErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: expect.any(String),
          field: ['operations', 'defaults', 'timezone'],
        }),
      ]),
    );
    expect(JSON.stringify(failed)).not.toMatch(/(?:stack|node_modules|SELECT\s|postgres)/iu);
  });

  test('PRJ-OBS-008 errors redact claims, contact PII, and external credentials', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const secretPhone = '+12025550999';
    const failed = await updateStore(api, store, {
      contactDetails: {
        ...validContact('Redaction', store.name),
        email: 'private@example.com',
        phoneNumbers: [secretPhone, secretPhone],
      },
    });
    const serialized = JSON.stringify(failed);
    expect(serialized).not.toContain(api.session.accessToken!);
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain(secretPhone);
    expect(serialized).not.toMatch(/(?:secret|credential|access[_-]?key)/iu);
  });

  test('PRJ-OBS-009 event correlation fields are bounded and exclude slug, email, and phone labels', async ({
    api,
  }) => {
    const sql = openSql();
    try {
      const store = await currentStore(api);
      const [event] = await sql<{
        correlationId: string;
        eventType: string;
        subjectType: string;
        payload: Record<string, unknown>;
      }[]>`
        SELECT
          correlation_id AS "correlationId",
          event_type AS "eventType",
          subject_type AS "subjectType",
          payload
        FROM domain_events
        WHERE event_type = 'storeCreated'
          AND subject_id = ${rawId(store.id)}
      `;
      expect(event?.correlationId.length).toBeLessThanOrEqual(255);
      expect(event).toEqual(
        expect.objectContaining({ eventType: 'storeCreated', subjectType: 'store' }),
      );
      expect(JSON.stringify(event)).not.toContain('settings@playwright.dev');
    } finally {
      await sql.end();
    }
  });

  test('PRJ-OBS-010 dependency or authentication failure never falls back permissively', async ({
    api,
  }) => {
    const store = await currentStore(api);
    api.session.clearSession();
    const payload = await updateStore(api, store, { address: validAddress });
    expect(payload.store).toBeNull();
    expect(payload.userErrors.map(({ code }) => code)).toContain('UNAUTHENTICATED');
  });

  test('PRJ-OBS-011 unexpected and malformed failures do not expose database messages', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const failed = await updateStore(
      api,
      store,
      { address: validAddress },
      { storeId: composeGlobalId('Store', crypto.randomUUID()) },
    );
    expect(failed.store).toBeNull();
    expect(JSON.stringify(failed)).not.toMatch(
      /(?:relation .* does not exist|duplicate key|violates|SQLSTATE|SELECT .* FROM)/iu,
    );
  });

  test('PRJ-OBS-012 request correlation connects saga and event activity safely', async ({ api }) => {
    const sql = openSql();
    try {
      const store = await currentStore(api);
      const [event] = await sql<{
        correlationId: string;
        parentWorkflowId: string | null;
      }[]>`
        SELECT
          correlation_id AS "correlationId",
          parent_workflow_id AS "parentWorkflowId"
        FROM domain_events
        WHERE event_type = 'storeCreated'
          AND subject_id = ${rawId(store.id)}
      `;
      expect(event?.correlationId).toEqual(expect.any(String));
      expect(event?.parentWorkflowId).toEqual(expect.any(String));
      expect(JSON.stringify(event)).not.toContain(api.session.accessToken!);
    } finally {
      await sql.end();
    }
  });

  test('PRJ-OBS-013 health paths cannot read or mutate Project settings', async ({
    api,
    request,
  }) => {
    const before = stableSettings(await currentStore(api));
    const graphqlUrl = new URL(process.env.ADMIN_GRAPHQL_URL!);
    const response = await request.get(new URL('/health', graphqlUrl.origin).toString());
    const body = await response.text();
    expect(body).not.toContain(api.session.projectSlug);
    expect(stableSettings(await currentStore(api))).toEqual(before);
  });

  test('PRJ-OBS-014 introspection exposes types without runtime Project data or credentials', async ({
    api,
    request,
  }) => {
    const response = await request.post(process.env.ADMIN_GRAPHQL_URL!, {
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${api.session.accessToken}`,
      },
      data: {
        query: '{ __type(name: "Store") { name fields { name } } }',
      },
    });
    const body = await response.text();
    expect(body).toContain('"name":"Store"');
    expect(body).not.toContain(api.session.accessToken!);
    expect(body).not.toContain(api.session.projectSlug);
  });

  test('PRJ-OBS-015 durable settings survive fresh requests without replaying completed mutations', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const clientMutationId = `durable-${crypto.randomUUID()}`;
    const updated = await updateStore(
      api,
      store,
      { address: validAddress },
      { clientMutationId },
    );
    expect(updated.userErrors).toHaveLength(0);
    const fresh = await currentStore(api);
    expect(fresh.address).toEqual(validAddress);
    const replay = await updateStore(
      api,
      store,
      { address: validAddress },
      { clientMutationId },
    );
    expect(replay.store?.revision).toBe(fresh.revision);
  });
});
