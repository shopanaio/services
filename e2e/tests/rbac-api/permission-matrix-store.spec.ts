import { test } from '@fixtures/base.extend';
import { ApiFixtures } from '@fixtures/api/api';
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

type Api = ApiFixtures['api'];

async function setupStoreWithRole(api: Api, role: 'viewer' | 'manager' | 'admin') {
  await api.session.setupUser();
  const ownerToken = api.session.accessToken;

  const orgName = generateOrgName();
  const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
    variables: { input: { name: orgName, displayName: 'Test Organization' } },
  });
  const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
  const storeId = storeData.storeMutation.storeCreate.store?.id;

  const testUser = await api.admin.user.create();
  await api.admin.mutation('iam-api/MemberInvite', {
    variables: {
      input: {
        organizationId,
        email: testUser.data.email,
        roles: [
          { domain: 'org', role: 'member' },
          { domain: `store:${storeId}`, role },
        ],
      },
    },
  });

  api.session.tenant.accessToken = testUser.accessToken;
  api.session.tenant.userId = testUser.userId;

  return { organizationId, storeId, ownerToken, testUser };
}

async function checkStorePermission(
  api: Api,
  organizationId: string | undefined,
  storeId: string | undefined,
  resource: string,
  action: string,
): Promise<boolean> {
  const { data } = await api.admin.query('roles-api/Authorize', {
    variables: {
      input: { organizationId, domain: `store:${storeId}`, resource, action },
    },
  });
  return (data as unknown as AuthorizeResult).userQuery.authorize.allowed;
}

test.describe('Store Permission Matrix', () => {
  test('Viewer can read store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'viewer');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'read');
    expect(allowed).toBe(true);
  });

  test('Viewer cannot write store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'viewer');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'write');
    expect(allowed).toBe(false);
  });

  test('Viewer cannot admin store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'viewer');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(allowed).toBe(false);
  });

  test('Manager can read store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'manager');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'read');
    expect(allowed).toBe(true);
  });

  test('Manager can write store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'manager');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'write');
    expect(allowed).toBe(true);
  });

  test('Manager cannot admin store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'manager');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(allowed).toBe(false);
  });

  test('Admin can read store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'admin');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'read');
    expect(allowed).toBe(true);
  });

  test('Admin can write store.profile', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'admin');
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'write');
    expect(allowed).toBe(true);
  });

  test('Admin owner can admin store.profile', async ({ api }) => {
    await api.session.setupUser();
    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
    const storeId = storeData.storeMutation.storeCreate.store?.id;

    // Owner (org admin + store admin) can admin (delete)
    const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(allowed).toBe(true);
  });

  test('Viewer cannot access store.members', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'viewer');
    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.members', action);
      expect(allowed, `Viewer should not have store.members.${action}`).toBe(false);
    }
  });

  test('Manager cannot access store.members', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'manager');
    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.members', action);
      expect(allowed, `Manager should not have store.members.${action}`).toBe(false);
    }
  });

  test('Admin can perform all store.members actions', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'admin');
    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.members', action);
      expect(allowed, `Admin should have store.members.${action}`).toBe(true);
    }
  });

  test('Viewer cannot access store.roles', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'viewer');
    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.roles', action);
      expect(allowed, `Viewer should not have store.roles.${action}`).toBe(false);
    }
  });

  test('Manager cannot access store.roles', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'manager');
    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.roles', action);
      expect(allowed, `Manager should not have store.roles.${action}`).toBe(false);
    }
  });

  test('Admin can perform all store.roles actions', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'admin');
    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.roles', action);
      expect(allowed, `Admin should have store.roles.${action}`).toBe(true);
    }
  });

  test('Viewer cannot access store.access', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'viewer');
    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.access', action);
      expect(allowed, `Viewer should not have store.access.${action}`).toBe(false);
    }
  });

  test('Manager cannot access store.access', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'manager');
    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.access', action);
      expect(allowed, `Manager should not have store.access.${action}`).toBe(false);
    }
  });

  test('Admin can perform all store.access actions', async ({ api }) => {
    const { organizationId, storeId } = await setupStoreWithRole(api, 'admin');
    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.access', action);
      expect(allowed, `Admin should have store.access.${action}`).toBe(true);
    }
  });

  test('Org admin has full access to all store.profile actions', async ({ api }) => {
    await api.session.setupUser();
    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
    const storeId = storeData.storeMutation.storeCreate.store?.id;

    const actions = ['read', 'write'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', action);
      expect(allowed, `Org admin should have store.profile.${action}`).toBe(true);
    }
  });

  test('Org admin has full access to all store.members actions', async ({ api }) => {
    await api.session.setupUser();
    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
    const storeId = storeData.storeMutation.storeCreate.store?.id;

    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.members', action);
      expect(allowed, `Org admin should have store.members.${action}`).toBe(true);
    }
  });

  test('Org admin has full access to all store.roles actions', async ({ api }) => {
    await api.session.setupUser();
    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
    const storeId = storeData.storeMutation.storeCreate.store?.id;

    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.roles', action);
      expect(allowed, `Org admin should have store.roles.${action}`).toBe(true);
    }
  });

  test('Org admin has full access to all store.access actions', async ({ api }) => {
    await api.session.setupUser();
    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
    const storeId = storeData.storeMutation.storeCreate.store?.id;

    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.access', action);
      expect(allowed, `Org admin should have store.access.${action}`).toBe(true);
    }
  });

  test('Org admin access applies to all stores in organization', async ({ api }) => {
    await api.session.setupUser();
    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    // Create multiple stores
    const storeIds = [];
    for (let i = 0; i < 3; i++) {
      const storeName = generateStoreName();
      const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
        variables: {
          input: {
            organizationId,
            name: storeName,
            displayName: `Store ${i}`,
            locales: ['en'],
            currencies: ['USD'],
            defaultCurrency: 'USD',
          },
        },
      });
      storeIds.push(storeData.storeMutation.storeCreate.store?.id);
    }

    // Verify org admin can access all stores
    for (const storeId of storeIds) {
      const allowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'write');
      expect(allowed).toBe(true);
    }
  });

  test('Store deletion requires both store and org permissions', async ({ api }) => {
    const { organizationId, storeId, ownerToken } = await setupStoreWithRole(api, 'admin');

    // Store admin without org admin permission cannot admin (delete)
    const storeAdminAllowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(storeAdminAllowed).toBe(false);

    // Restore org admin token
    if (ownerToken) api.session.tenant.accessToken = ownerToken;

    // Org admin (who is also store owner) can admin (delete)
    const orgAdminAllowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(orgAdminAllowed).toBe(true);
  });

  test('Only store owner can admin store', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
    const ownerId = api.session.tenant.userId;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });
    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

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
    const storeId = storeData.storeMutation.storeCreate.store?.id;

    // Add another org admin (not store owner)
    const adminB = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminB.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // Non-owner org admin tries to admin (delete) store
    api.session.tenant.accessToken = adminB.accessToken;
    api.session.tenant.userId = adminB.userId;

    const nonOwnerAllowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(nonOwnerAllowed).toBe(false);

    // Owner can admin (delete)
    if (ownerToken) api.session.tenant.accessToken = ownerToken;
    api.session.tenant.userId = ownerId;

    const ownerAllowed = await checkStorePermission(api, organizationId, storeId, 'store.profile', 'admin');
    expect(ownerAllowed).toBe(true);
  });
});
