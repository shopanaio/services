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

test.describe('Store Roles (FR-4)', () => {
  test('Store viewer should only view store profile', async ({ api }) => {
    // 1. Create org and store as admin
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

    // 2. Create second user and assign as viewer in store
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

    // 4. Verify viewer can: store.profile.read
    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'store.profile', action: 'read' },
      },
    });
    const readResult = readAuth as unknown as AuthorizeResult;
    expect(readResult.userQuery.authorize.allowed).toBe(true);

    // 5. Verify viewer cannot: store.profile.update, store.members.*, store.roles.*, store.access.*
    const deniedActions = [
      { resource: 'store.profile', action: 'update' },
      { resource: 'store.profile', action: 'delete' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'invite' },
      { resource: 'store.members', action: 'update' },
      { resource: 'store.members', action: 'remove' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.roles', action: 'create' },
      { resource: 'store.roles', action: 'update' },
      { resource: 'store.roles', action: 'delete' },
      { resource: 'store.access', action: 'read' },
      { resource: 'store.access', action: 'grant' },
      { resource: 'store.access', action: 'revoke' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Viewer should be denied: ${resource}.${action}`).toBe(
        false,
      );
    }

    // Restore admin token
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });

  test('Store manager should view and edit profile', async ({ api }) => {
    // 1. Create org and store as admin
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

    // 2. Create second user and assign as manager in store
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

    // 4. Verify manager can: store.profile.read, store.profile.update
    const allowedActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'update' },
    ];

    for (const { resource, action } of allowedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Manager should be allowed: ${resource}.${action}`).toBe(
        true,
      );
    }

    // 5. Verify manager cannot: store.profile.delete, store.members.*, store.roles.*, store.access.*
    const deniedActions = [
      { resource: 'store.profile', action: 'delete' },
      { resource: 'store.members', action: 'invite' },
      { resource: 'store.members', action: 'update' },
      { resource: 'store.members', action: 'remove' },
      { resource: 'store.roles', action: 'create' },
      { resource: 'store.roles', action: 'update' },
      { resource: 'store.roles', action: 'delete' },
      { resource: 'store.access', action: 'grant' },
      { resource: 'store.access', action: 'revoke' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Manager should be denied: ${resource}.${action}`).toBe(
        false,
      );
    }

    // Restore admin token
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });

  test('Store admin should have full store management', async ({ api }) => {
    // 1. Create org and store as org admin
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

    // 2. Create second user and assign as store admin
    const storeAdminUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'admin' }],
        },
      },
    });

    // 3. Switch to store admin context
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    // 4. Verify store admin can perform all store.* actions
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'update' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'invite' },
      { resource: 'store.members', action: 'update' },
      { resource: 'store.members', action: 'remove' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.roles', action: 'create' },
      { resource: 'store.roles', action: 'update' },
      { resource: 'store.roles', action: 'delete' },
      { resource: 'store.access', action: 'read' },
      { resource: 'store.access', action: 'grant' },
      { resource: 'store.access', action: 'revoke' },
    ];

    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Store admin should be allowed: ${resource}.${action}`,
      ).toBe(true);
    }

    // Restore org admin token
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });
});
