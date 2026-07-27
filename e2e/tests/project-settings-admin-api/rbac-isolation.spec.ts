/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import {
  currentStore,
  localeCreate,
  requestStoreUpdate,
  selectStore,
  setupStore,
  stableSettings,
  updateStore,
  validAddress,
  validBrand,
  validContact,
} from './helpers';

type Api = ApiFixtures['api'];

async function inviteWithRole(
  api: Api,
  options: {
    organizationId: string;
    domain: string;
    role?: string;
    permissions?: { resource: string; action: 'read' | 'write' | 'admin' }[];
  },
) {
  const owner = {
    accessToken: api.session.tenant.accessToken!,
    userId: api.session.tenant.userId!,
  };
  const user = await api.admin.user.create();
  let role = options.role;
  if (!role) {
    role = `settings-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId: options.organizationId,
          domain: options.domain,
          name: role,
          displayName: 'Project Settings Contract Role',
          permissions: options.permissions,
        },
      },
    });
    expect(data.roleMutation.roleCreate.userErrors).toHaveLength(0);
  }
  const { data } = await api.admin.mutation('iam-api/MemberInvite', {
    variables: {
      input: {
        organizationId: options.organizationId,
        email: user.data.email,
        roles: [{ domain: options.domain, role }],
      },
    },
  });
  expect(data.organizationMutation.memberInvite.userErrors).toHaveLength(0);
  api.session.tenant.accessToken = user.accessToken;
  api.session.tenant.userId = user.userId;
  return { owner, user };
}

test.describe('Project Settings Admin API - RBAC and isolation', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-SEC-001 platform Admin authentication is required for queries and mutations', async ({
    api,
  }) => {
    const store = await currentStore(api);
    api.session.clearSession();
    const current = await api.admin.query('project-api/Project', { throwOnError: false });
    expect(JSON.stringify(current.errors ?? current.data)).toMatch(/UNAUTHENTICATED/iu);
    const result = await requestStoreUpdate(api, store, { address: validAddress });
    expect(result.payload).toBeUndefined();
    expect(JSON.stringify(result.errors)).toMatch(/UNAUTHENTICATED/iu);
  });

  test('PRJ-SEC-002 org.stores write permits create but not destructive delete', async ({ api }) => {
    const existing = await currentStore(api);
    const organizationId = api.session.organizationId!;
    await inviteWithRole(api, {
      organizationId,
      domain: 'org',
      permissions: [{ resource: 'org.stores', action: 'write' }],
    });
    api.session.organizationId = organizationId;
    const created = await api.admin.project.create({ organizationId });
    expect(created.id).toEqual(expect.any(String));
    const deletion = await api.admin.mutation('project-api/ProjectDelete', {
      variables: { input: { id: existing.id, organizationId } },
    });
    expect(deletion.data.storeMutation.storeDelete.deletedStoreId).toBeNull();
    expect(deletion.data.storeMutation.storeDelete.userErrors.length).toBeGreaterThan(0);
  });

  test('PRJ-SEC-003 org admin can delete a store inside the authorized organization', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const { data } = await api.admin.mutation('project-api/ProjectDelete', {
      variables: { input: { id: store.id, organizationId: api.session.organizationId! } },
    });
    expect(data.storeMutation.storeDelete.userErrors).toHaveLength(0);
    expect(data.storeMutation.storeDelete.deletedStoreId).toBe(store.id);
  });

  test('PRJ-SEC-004 store.profile read exposes Store but never permits mutation', async ({
    api,
  }) => {
    const store = await currentStore(api);
    await inviteWithRole(api, {
      organizationId: api.session.organizationId!,
      domain: store.membership!.domain,
      permissions: [{ resource: 'store.profile', action: 'read' }],
    });
    selectStore(api, store);
    expect((await currentStore(api)).id).toBe(store.id);
    const payload = await updateStore(api, store, { address: validAddress });
    expect(payload.store).toBeNull();
    expect(payload.userErrors.map(({ code }) => code)).toContain('FORBIDDEN');
  });

  test('PRJ-SEC-005/PRJ-SEC-006 store manager hierarchy permits settings and locale writes', async ({
    api,
  }) => {
    const store = await currentStore(api);
    await inviteWithRole(api, {
      organizationId: api.session.organizationId!,
      domain: store.membership!.domain,
      role: 'manager',
    });
    selectStore(api, store);
    const payload = await updateStore(api, store, {
      contactDetails: validContact('Manager update', store.name),
    });
    expect(payload.userErrors).toHaveLength(0);
    const locale = await localeCreate(api, 'de', true);
    expect(locale.payload.userErrors).toHaveLength(0);
  });

  test('PRJ-SEC-007 custom read-only role cannot update settings, locales, or brand media', async ({
    api,
  }) => {
    const store = await currentStore(api);
    await inviteWithRole(api, {
      organizationId: api.session.organizationId!,
      domain: store.membership!.domain,
      permissions: [{ resource: 'store.profile', action: 'read' }],
    });
    selectStore(api, store);
    for (const operations of [
      { address: validAddress },
      { brand: validBrand },
    ]) {
      const payload = await updateStore(api, store, operations);
      expect(payload.store).toBeNull();
      expect(payload.userErrors.map(({ code }) => code)).toContain('FORBIDDEN');
    }
    const locale = await localeCreate(api, 'de', true);
    expect(JSON.stringify(locale.errors ?? locale.payload.userErrors)).toMatch(/FORBIDDEN/iu);
  });

  test('PRJ-SEC-008/PRJ-SEC-009/PRJ-SEC-010 authorization trusts subject and persisted ownership, not selectors', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const trustedOrganizationId = api.session.organizationId!;
    await api.session.setupOrganization();
    api.session.organizationId = trustedOrganizationId;
    selectStore(api, store);
    const payload = await updateStore(api, store, {
      contactDetails: validContact('Persisted organization', store.name),
    });
    expect(payload.userErrors).toHaveLength(0);
    expect(payload.store?.displayName).toBe('Persisted organization');
  });

  test('PRJ-SEC-011 selected store claim cannot grant access to a sibling store', async ({
    api,
  }) => {
    const allowed = await currentStore(api);
    const sibling = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    await inviteWithRole(api, {
      organizationId: api.session.organizationId!,
      domain: allowed.membership!.domain,
      role: 'manager',
    });
    selectStore(api, sibling);
    const payload = await updateStore(api, sibling as typeof allowed, {
      contactDetails: validContact('Forbidden sibling', sibling.name),
    });
    expect(payload.store).toBeNull();
    expect(payload.userErrors.map(({ code }) => code)).toContain('FORBIDDEN');
  });

  test('PRJ-SEC-012/PRJ-SEC-013 foreign and type-confused Store IDs fail safely before mutation', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const before = stableSettings(store);
    for (const storeId of [
      composeGlobalId('File', crypto.randomUUID()),
      composeGlobalId('Store', crypto.randomUUID()),
    ]) {
      const payload = await updateStore(
        api,
        store,
        { address: validAddress },
        { storeId },
      );
      expect(payload.store).toBeNull();
      expect(payload.userErrors.length).toBeGreaterThan(0);
    }
    expect(stableSettings(await currentStore(api))).toEqual(before);
  });

  test('PRJ-SEC-014 client headers cannot substitute organization, subject, locale, or identity', async ({
    api,
  }) => {
    const trusted = await currentStore(api);
    const foreignOrganization = await api.session.setupOrganization();
    api.session.organizationId = foreignOrganization.id;
    selectStore(api, trusted);
    const current = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(JSON.stringify(current.errors ?? current.data)).toMatch(/ADMIN_CONTEXT_INVALID/iu);
  });

  test('PRJ-SEC-015/PRJ-SEC-016 non-Admin session scopes cannot authorize Project Admin GraphQL', async ({
    api,
  }) => {
    const store = await currentStore(api);
    api.session.scope = 'customer';
    api.session.apiKey = '';
    api.session.clearSession();
    const current = await api.admin.query('project-api/Project', { throwOnError: false });
    expect(JSON.stringify(current.errors ?? current.data)).toMatch(/UNAUTHENTICATED/iu);
    const result = await requestStoreUpdate(api, store, { address: validAddress });
    expect(result.payload).toBeUndefined();
    expect(JSON.stringify(result.errors)).toMatch(/UNAUTHENTICATED/iu);
  });

  test('PRJ-SEC-017 authorization denial creates no revision or settings side effect', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const snapshot = stableSettings(store);
    const owner = {
      accessToken: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    api.session.clearSession();
    const denied = await requestStoreUpdate(api, store, {
      address: validAddress,
      brand: validBrand,
    });
    expect(denied.payload).toBeUndefined();
    api.session.tenant.accessToken = owner.accessToken;
    api.session.tenant.userId = owner.userId;
    api.session.scope = 'tenant';
    selectStore(api, store);
    const after = await currentStore(api);
    expect(after.revision).toBe(store.revision);
    expect(stableSettings(after)).toEqual(snapshot);
  });

  test('PRJ-SEC-018 request-local resolution never mixes sibling settings', async ({ api }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    const firstResult = await updateStore(api, first, {
      contactDetails: validContact('First tenant', first.name),
    });
    expect(firstResult.userErrors).toHaveLength(0);
    selectStore(api, second);
    expect((await currentStore(api)).displayName).not.toBe('First tenant');
  });

  test('PRJ-SEC-019 soft-deleted store cannot be recovered through query or update paths', async ({
    api,
  }) => {
    const store = await currentStore(api);
    await api.admin.mutation('project-api/ProjectDelete', {
      variables: { input: { id: store.id, organizationId: api.session.organizationId! } },
    });
    api.session.clearProject();
    expect((await api.admin.query('project-api/Project', {})).data.storeQuery.currentStore).toBeNull();
    const payload = await updateStore(api, store, { address: validAddress });
    expect(payload.store).toBeNull();
    expect(payload.userErrors.map(({ code }) => code)).toContain('NOT_FOUND');
  });

  test('PRJ-SEC-020 negative tenant attempts change neither selected nor foreign organizations', async ({
    api,
  }) => {
    const selected = await currentStore(api);
    const selectedOrganizationId = api.session.organizationId!;
    const selectedSnapshot = stableSettings(selected);
    const owner = {
      accessToken: api.session.tenant.accessToken,
      userId: api.session.tenant.userId,
    };
    const foreignOrganization = await api.session.setupOrganization();
    const foreign = await api.admin.project.create({
      organizationId: foreignOrganization.id,
    });
    selectStore(api, foreign);
    const foreignSnapshot = stableSettings(await currentStore(api));
    api.session.organizationId = selectedOrganizationId;
    selectStore(api, selected);
    api.session.clearSession();
    await requestStoreUpdate(api, selected, { address: validAddress });
    await requestStoreUpdate(api, foreign as typeof selected, { brand: validBrand });
    api.session.tenant.accessToken = owner.accessToken;
    api.session.tenant.userId = owner.userId;
    api.session.organizationId = selectedOrganizationId;
    selectStore(api, selected);
    expect(stableSettings(await currentStore(api))).toEqual(selectedSnapshot);
    api.session.organizationId = foreignOrganization.id;
    selectStore(api, foreign);
    expect(stableSettings(await currentStore(api))).toEqual(foreignSnapshot);
  });
});
