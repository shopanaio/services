import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;

interface AuthorizeResult {
  userQuery: {
    authorize: {
      allowed: boolean;
      deniedReason?: string;
    };
  };
}

test.describe('Role Inheritance (FR-4)', () => {
  test('Roles should NOT inherit permissions from other roles', async ({ api }) => {
    // 1. Create org and store with manager role user
    await api.session.setupUser();
    const adminToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Test Organization',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;
    api.session.organizationId = organizationId;

    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
    }

    // 2. Create manager user
    const managerUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: managerUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'manager' }],
        },
      },
    });

    // 3. Switch to manager and verify cannot perform admin-only actions
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    // Manager should NOT have admin permissions - roles are explicit, not inherited
    const adminOnlyActions = [
      { resource: 'store.members', action: 'invite' },
      { resource: 'store.members', action: 'remove' },
      { resource: 'store.roles', action: 'create' },
      { resource: 'store.roles', action: 'delete' },
      { resource: 'store.access', action: 'grant' },
      { resource: 'store.access', action: 'revoke' },
    ];

    for (const { resource, action } of adminOnlyActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Manager should NOT inherit admin permission: ${resource}.${action}`,
      ).toBe(false);
    }

    // 4. Create viewer and verify they don't inherit manager permissions
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
    const viewerUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: viewerUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'viewer' }],
        },
      },
    });

    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // Viewer should NOT have manager permissions
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'store.profile', action: 'update' },
      },
    });

    const updateResult = updateAuth as unknown as AuthorizeResult;
    expect(
      updateResult.userQuery.authorize.allowed,
      'Viewer should NOT inherit manager permission: store.profile.update',
    ).toBe(false);

    // Restore admin token
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });

  test('Store viewer cannot perform manager actions', async ({ api }) => {
    // 1. Create org and store
    await api.session.setupUser();
    const adminToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Test Organization',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;
    api.session.organizationId = organizationId;

    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
    }

    // 2. Assign user as viewer
    const viewerUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: viewerUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'viewer' }],
        },
      },
    });

    // 3. Switch to viewer context
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // 4. Verify viewer cannot update store profile (manager action)
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'store.profile', action: 'update' },
      },
    });

    const result = updateAuth as unknown as AuthorizeResult;
    expect(result.userQuery.authorize.allowed).toBe(false);
    expect(result.userQuery.authorize.deniedReason).toBeDefined();

    // Restore admin token
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });

  test('Store manager cannot perform admin actions', async ({ api }) => {
    // 1. Create org and store
    await api.session.setupUser();
    const adminToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Test Organization',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;
    api.session.organizationId = organizationId;

    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
    }

    // 2. Assign user as manager
    const managerUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: managerUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'manager' }],
        },
      },
    });

    // 3. Switch to manager context
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    // 4. Verify manager cannot: delete store, manage members, manage roles
    const adminOnlyActions = [
      { resource: 'store.profile', action: 'delete' },
      { resource: 'store.members', action: 'invite' },
      { resource: 'store.members', action: 'remove' },
      { resource: 'store.roles', action: 'create' },
      { resource: 'store.roles', action: 'update' },
      { resource: 'store.roles', action: 'delete' },
      { resource: 'store.access', action: 'grant' },
      { resource: 'store.access', action: 'revoke' },
    ];

    for (const { resource, action } of adminOnlyActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Manager should be denied admin action: ${resource}.${action}`,
      ).toBe(false);
    }

    // Restore admin token
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });
});
