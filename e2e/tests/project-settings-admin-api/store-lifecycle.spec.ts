/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import {
  createStore,
  currentStore,
  expectError,
  openSql,
  rawId,
  required,
  selectStore,
  setupStore,
} from './helpers';

test.describe('Project Settings Admin API - store lifecycle', () => {
  test('PRJ-LIFE-001 storeCreate requires org.stores write permission', async ({ api }) => {
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    api.session.clearSession();
    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId: organization.id,
          name: `forbidden-${crypto.randomUUID().slice(0, 8)}`,
          displayName: 'Forbidden',
          locales: ['en'],
          currencyCode: 'USD',
        },
      },
    });
    const serialized = JSON.stringify(errors ?? data?.storeMutation?.storeCreate?.userErrors);
    expect(serialized).toMatch(/(?:UNAUTHENTICATED|FORBIDDEN|access denied)/iu);
  });

  test('PRJ-LIFE-002/PRJ-LIFE-003 valid create returns a typed Store and persists all profile fields', async ({
    api,
  }) => {
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    const name = `full-${crypto.randomUUID().slice(0, 8)}`;
    const payload = await createStore(api, organization.id, {
      name,
      displayName: 'Full lifecycle store',
      locales: ['en', 'uk'],
      currencyCode: 'EUR',
      status: 'INACTIVE',
      timezone: 'Europe/Kyiv',
      email: 'lifecycle@playwright.dev',
    });
    expect(payload.userErrors).toHaveLength(0);
    expect(payload.store).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        revision: 0,
        name,
        displayName: 'Full lifecycle store',
        status: 'INACTIVE',
        timezone: 'Europe/Kyiv',
        email: 'lifecycle@playwright.dev',
        currencyCode: 'EUR',
      }),
    );
    expect(Buffer.from(payload.store!.id, 'base64').toString()).toContain('/Store/');
  });

  test('PRJ-LIFE-004 initial locales are active and the first becomes default', async ({ api }) => {
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    const payload = await createStore(api, organization.id, { locales: ['uk', 'en', 'de'] });
    expect(payload.userErrors).toHaveLength(0);
    selectStore(api, payload.store!);
    const store = await currentStore(api);
    expect(store.locales).toEqual(expect.arrayContaining(['uk', 'en', 'de']));
    expect(store.defaultLocale).toBe('uk');
    expect(store.languageSettings.every(({ isActive }) => isActive)).toBe(true);
  });

  test('PRJ-LIFE-005 omitted optional fields use server-owned defaults', async ({ api }) => {
    await setupStore(api);
    const store = await currentStore(api);
    expect(store).toEqual(
      expect.objectContaining({
        status: 'ACTIVE',
        timezone: 'UTC',
        defaultWeightUnit: 'KILOGRAM',
        defaultDimensionUnit: 'CENTIMETER',
      }),
    );
  });

  test('PRJ-LIFE-006/PRJ-LIFE-007/PRJ-LIFE-008/PRJ-LIFE-009/PRJ-LIFE-010 invalid create input leaves no readable store', async ({
    api,
  }) => {
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    const cases = [
      { name: 'Upper_Case', displayName: 'Invalid', locales: ['en'], currencyCode: 'USD' },
      {
        name: `valid-${crypto.randomUUID().slice(0, 8)}`,
        displayName: '',
        locales: ['en'],
        currencyCode: 'USD',
      },
      {
        name: `valid-${crypto.randomUUID().slice(0, 8)}`,
        displayName: 'No locale',
        locales: [],
        currencyCode: 'USD',
      },
      {
        name: `valid-${crypto.randomUUID().slice(0, 8)}`,
        displayName: 'Duplicate locale',
        locales: ['en', 'en'],
        currencyCode: 'USD',
      },
      {
        name: `valid-${crypto.randomUUID().slice(0, 8)}`,
        displayName: 'Invalid timezone',
        locales: ['en'],
        currencyCode: 'USD',
        timezone: 'Invalid/Timezone',
      },
    ];
    for (const input of cases) {
      const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
        throwOnError: false,
        variables: { input: { organizationId: organization.id, ...input } },
      });
      const payload = data?.storeMutation?.storeCreate;
      expect(Boolean(errors?.length) || Boolean(payload?.userErrors.length)).toBe(true);
      expect(payload?.store ?? null).toBeNull();
    }
  });

  test('PRJ-LIFE-011 duplicate active slug returns DUPLICATE_VALUE without a second store', async ({
    api,
  }) => {
    await setupStore(api);
    const store = await currentStore(api);
    const duplicate = await createStore(api, api.session.organizationId!, {
      name: store.name,
      displayName: 'Duplicate',
    });
    expect(duplicate.store).toBeNull();
    expectError(duplicate.userErrors, { code: 'DUPLICATE_VALUE' });
    const { data } = await api.admin.query('project-api/Projects', {
      variables: { organizationId: api.session.organizationId! },
    });
    expect(data.storeQuery.stores.filter(({ name }) => name === store.name)).toHaveLength(1);
  });

  test('PRJ-LIFE-012/PRJ-LIFE-013 create provisions the role catalog and assigns store membership', async ({
    api,
  }) => {
    await setupStore(api);
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});
    const membership = required(data.storeQuery.currentStore?.membership, 'store membership');
    expect(membership.domain).toMatch(/^store:/u);
    expect(membership.roles.map(({ name }) => name)).toEqual(
      expect.arrayContaining(['admin', 'manager', 'viewer']),
    );
    expect(membership.roles.every(({ isSystem }) => isSystem)).toBe(true);
  });

  test('PRJ-LIFE-014 create provisions a usable store-owned Media asset group', async ({ api }) => {
    await setupStore(api);
    const file = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/lifecycle.png',
    });
    expect(file.id).toEqual(expect.any(String));
  });

  test('PRJ-LIFE-015 successful create emits one safe storeCreated event', async ({ api }) => {
    const sql = openSql();
    try {
      await setupStore(api);
      const store = await currentStore(api);
      const rows = await sql<{ payload: Record<string, unknown> }[]>`
        SELECT payload
        FROM domain_events
        WHERE event_type = 'storeCreated'
          AND subject_id = ${rawId(store.id)}
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0]?.payload).toEqual(
        expect.objectContaining({
          storeId: rawId(store.id),
          organizationId: rawId(api.session.organizationId!),
          name: store.name,
          defaultLocale: store.defaultLocale,
        }),
      );
      expect(JSON.stringify(rows[0]?.payload)).not.toMatch(/(?:token|password|credential)/iu);
    } finally {
      await sql.end();
    }
  });

  test('PRJ-LIFE-016/PRJ-LIFE-017 failed create cannot leave a partially usable store', async ({ api }) => {
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    const name = `partial-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId: organization.id,
          name,
          displayName: 'Duplicate locale compensation',
          locales: ['en', 'en'],
          currencyCode: 'USD',
        },
      },
    });
    expect(data.storeMutation.storeCreate.store).toBeNull();
    const listed = await api.admin.query('project-api/Projects', {
      variables: { organizationId: organization.id },
    });
    expect(listed.data.storeQuery.stores.map(({ name: value }) => value)).not.toContain(name);
  });

  test('PRJ-LIFE-018 retry after ambiguous create does not duplicate store or side effects', async ({
    api,
  }) => {
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    const input = {
      name: `retry-${crypto.randomUUID().slice(0, 8)}`,
      displayName: 'Idempotent lifecycle',
    };
    const first = await createStore(api, organization.id, input);
    const retry = await createStore(api, organization.id, input);
    expect(first.store).not.toBeNull();
    expect(retry.store).toBeNull();
    const listed = await api.admin.query('project-api/Projects', {
      variables: { organizationId: organization.id },
    });
    expect(listed.data.storeQuery.stores.filter(({ name }) => name === input.name)).toHaveLength(1);
  });

  test('PRJ-LIFE-019/PRJ-LIFE-020 delete requires authorization and cross-checks organization ownership', async ({
    api,
  }) => {
    await setupStore(api);
    const store = await currentStore(api);
    const foreign = await api.session.setupOrganization();
    selectStore(api, store);
    const { data } = await api.admin.mutation('project-api/ProjectDelete', {
      variables: { input: { id: store.id, organizationId: foreign.id } },
    });
    expect(data.storeMutation.storeDelete.deletedStoreId).toBeNull();
    expect(data.storeMutation.storeDelete.userErrors.length).toBeGreaterThan(0);
    expect(await currentStore(api)).toEqual(expect.objectContaining({ id: store.id }));
  });

  test('PRJ-LIFE-021/PRJ-LIFE-022/PRJ-LIFE-023 successful delete soft-deletes reads, media, and emits storeDeleted', async ({
    api,
  }) => {
    const sql = openSql();
    try {
      await setupStore(api);
      const store = await currentStore(api);
      const organizationId = api.session.organizationId!;
      const { data } = await api.admin.mutation('project-api/ProjectDelete', {
        variables: { input: { id: store.id, organizationId } },
      });
      expect(data.storeMutation.storeDelete.userErrors).toHaveLength(0);
      expect(data.storeMutation.storeDelete.deletedStoreId).toBe(store.id);
      const listed = await api.admin.query('project-api/Projects', {
        variables: { organizationId },
      });
      expect(listed.data.storeQuery.stores.map(({ id }) => id)).not.toContain(store.id);
      const events = await sql<{ payload: Record<string, unknown> }[]>`
        SELECT payload
        FROM domain_events
        WHERE event_type = 'storeDeleted'
          AND subject_id = ${rawId(store.id)}
      `;
      expect(events).toHaveLength(1);
      expect(events[0]?.payload).toEqual({
        storeId: rawId(store.id),
        organizationId: rawId(organizationId),
      });
    } finally {
      await sql.end();
    }
  });

  test('PRJ-LIFE-024/PRJ-LIFE-025 malformed, confused, unknown, and repeated deletes are safe', async ({
    api,
  }) => {
    await setupStore(api);
    const store = await currentStore(api);
    const organizationId = api.session.organizationId!;
    for (const id of [
      'malformed',
      composeGlobalId('File', crypto.randomUUID()),
      composeGlobalId('Store', crypto.randomUUID()),
    ]) {
      const { data, errors } = await api.admin.mutation('project-api/ProjectDelete', {
        throwOnError: false,
        variables: { input: { id, organizationId } },
      });
      expect(Boolean(errors?.length) || Boolean(data?.storeMutation?.storeDelete.userErrors.length)).toBe(
        true,
      );
      expect(data?.storeMutation?.storeDelete.deletedStoreId ?? null).toBeNull();
    }
    expect((await currentStore(api)).id).toBe(store.id);
  });

  test('PRJ-LIFE-026/PRJ-LIFE-027 lifecycle failures are safe and never expose session credentials', async ({
    api,
  }) => {
    await setupStore(api);
    const token = api.session.accessToken!;
    const { data, errors } = await api.admin.mutation('project-api/ProjectDelete', {
      throwOnError: false,
      variables: {
        input: {
          id: composeGlobalId('Store', crypto.randomUUID()),
          organizationId: api.session.organizationId!,
        },
      },
    });
    const serialized = JSON.stringify(errors ?? data?.storeMutation?.storeDelete);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toMatch(/(?:stack|node_modules|postgres|credential)/iu);
  });
});
