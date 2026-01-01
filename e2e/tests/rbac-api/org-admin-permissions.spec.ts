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

test.describe('Organization Admin Permissions (FR-4)', () => {
  test('Org admin should have full control within the organization', async ({ api }) => {
    // 1. Create organization (user becomes admin)
    await api.session.setupUser();

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

    // 2. Verify admin can perform all org actions via authorize checks
    const orgActions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.profile', action: 'write' },
      { resource: 'org.members', action: 'read' },
      { resource: 'org.members', action: 'write' },
      { resource: 'org.members', action: 'admin' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.roles', action: 'write' },
      { resource: 'org.roles', action: 'admin' },
      { resource: 'org.stores', action: 'read' },
      { resource: 'org.stores', action: 'write' },
      { resource: 'org.stores', action: 'admin' },
      { resource: 'org.access', action: 'read' },
      { resource: 'org.access', action: 'write' },
      { resource: 'org.access', action: 'admin' },
    ];

    // Set organizationId in session for authorization context
    api.session.organizationId = organizationId;

    for (const { resource, action } of orgActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Admin should be allowed: ${resource}.${action}`).toBe(true);
    }
  });

  test('Org admin should NOT have access to other organizations', async ({ api }) => {
    // 1. Create first user and their organization
    await api.session.setupUser();
    const firstUserToken = api.session.accessToken;
    const firstUserId = api.session.tenant.userId;

    const org1Name = generateOrgName();
    const { data: org1Data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: org1Name,
          displayName: 'Organization One',
        },
      },
    });

    const org1 = org1Data.organizationMutation.organizationCreate.organization;
    expect(org1).not.toBeNull();

    // 2. Create second user and their organization
    const secondUser = await api.admin.user.create();
    api.session.tenant.accessToken = secondUser.accessToken;
    api.session.tenant.userId = secondUser.userId;

    const org2Name = generateOrgName();
    const { data: org2Data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: org2Name,
          displayName: 'Organization Two',
        },
      },
    });

    const org2 = org2Data.organizationMutation.organizationCreate.organization;
    expect(org2).not.toBeNull();
    const org2Id = org2?.id;

    // 3. Switch back to first user
    api.session.tenant.accessToken = firstUserToken;
    api.session.tenant.userId = firstUserId;

    // 4. Verify first user CANNOT access second organization
    const deniedActions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.profile', action: 'write' },
      { resource: 'org.members', action: 'read' },
      { resource: 'org.members', action: 'write' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.stores', action: 'write' },
      { resource: 'org.access', action: 'write' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId: org2Id, domain: 'org', resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `User should be DENIED access to other org: ${resource}.${action}`,
      ).toBe(false);
    }
  });

  test('Org member should have basic organization access only', async ({ api }) => {
    // 1. Create organization as first user (admin)
    await api.session.setupUser();
    const adminToken = api.session.accessToken;
    const adminUserId = api.session.tenant.userId;

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

    // 2. Create second user to be invited as member
    const secondUser = await api.admin.user.create();

    // 3. Invite user as member
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: secondUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Switch to member context
    api.session.tenant.accessToken = secondUser.accessToken;
    api.session.tenant.userId = secondUser.userId;

    // 5. Verify member can read org.profile and org.members
    const allowedActions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.members', action: 'read' },
    ];

    for (const { resource, action } of allowedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Member should be allowed: ${resource}.${action}`).toBe(true);
    }

    // 6. Verify member cannot perform admin actions
    const deniedActions = [
      { resource: 'org.profile', action: 'write' },
      { resource: 'org.members', action: 'write' },
      { resource: 'org.members', action: 'admin' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.roles', action: 'write' },
      { resource: 'org.roles', action: 'admin' },
      { resource: 'org.stores', action: 'write' },
      { resource: 'org.access', action: 'write' },
      { resource: 'org.access', action: 'admin' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Member should be denied: ${resource}.${action}`).toBe(false);
    }

    // Restore admin token and userId for cleanup
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
      api.session.tenant.userId = adminUserId;
    }
  });

  test('Org member should NOT have access to stores without explicit role', async ({ api }) => {
    // 1. Create organization as first user (admin)
    await api.session.setupUser();
    const adminToken = api.session.accessToken;
    const adminUserId = api.session.tenant.userId;

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

    // 2. Create a store in the organization
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
    const storeDomain = store?.membership?.domain;

    // 3. Create second user and invite as org member (not store member)
    const memberUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }], // Only org member, no store role
        },
      },
    });

    // 4. Switch to member context
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    // 5. Verify member CANNOT access store resources
    const deniedStoreActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.access', action: 'write' },
    ];

    for (const { resource, action } of deniedStoreActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: storeDomain, resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Org member without store role should be DENIED: ${resource}.${action}`,
      ).toBe(false);
    }

    // Restore admin context
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
      api.session.tenant.userId = adminUserId;
    }
  });

  test('Organization admin should NOT have direct access to store resources', async ({ api }) => {
    // Org admin can create/list stores but does NOT have access to store-level resources
    // To access store resources, user must have explicit store role

    // 1. Create organization
    await api.session.setupUser();

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

    // 2. Create a second user who will be org admin (without store role)
    const orgAdminUser = await api.admin.user.create();

    // Invite as org admin only (no store role)
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: orgAdminUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Create a store (as original user who has store admin via store creation)
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
    const storeDomain = store?.membership?.domain;

    // 4. Switch to org admin context (who has NO store role)
    api.session.tenant.accessToken = orgAdminUser.accessToken;
    api.session.tenant.userId = orgAdminUser.userId;

    // 5. Verify org admin can manage org.stores (list/create stores)
    const orgStoreActions = [
      { resource: 'org.stores', action: 'read' },
      { resource: 'org.stores', action: 'write' },
    ];

    for (const { resource, action } of orgStoreActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Org admin should be allowed: ${resource}.${action}`,
      ).toBe(true);
    }

    // 6. Verify org admin CANNOT access store-level resources without explicit store role
    const deniedStoreActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.access', action: 'write' },
    ];

    for (const { resource, action } of deniedStoreActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: storeDomain, resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Org admin without store role should be DENIED: ${resource}.${action}`,
      ).toBe(false);
    }
  });

  test('Store admin should only have access to stores where role is explicitly granted', async ({ api }) => {
    // Store admin role is per-store. User needs explicit role assignment for each store.
    // 1. Create organization as org admin
    await api.session.setupUser();
    const orgAdminToken = api.session.accessToken;
    const orgAdminUserId = api.session.tenant.userId;

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

    // 2. Create two stores
    const store1Name = generateStoreName();
    const { data: store1Data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: store1Name,
          displayName: 'Store One',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store1 = store1Data.storeMutation.storeCreate.store;
    expect(store1).not.toBeNull();
    const store1Domain = store1?.membership?.domain;

    const store2Name = generateStoreName();
    const { data: store2Data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: store2Name,
          displayName: 'Store Two',
          locales: ['en'],
          currencies: ['EUR'],
          defaultCurrency: 'EUR',
        },
      },
    });

    const store2 = store2Data.storeMutation.storeCreate.store;
    expect(store2).not.toBeNull();
    const store2Domain = store2?.membership?.domain;

    // 3. Create a user and invite as store admin for store1 ONLY
    const storeAdminUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: store1Domain, role: 'admin' },
          ],
        },
      },
    });

    // 4. Switch to store admin context
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    // 5. Verify store admin CAN access store1
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
    ];

    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: store1Domain, resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `User with store admin role should be allowed: ${resource}.${action}`,
      ).toBe(true);
    }

    // 6. Verify user CANNOT access store2 (no role granted for this store)
    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: store2Domain, resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `User without role for store2 should be DENIED: ${resource}.${action}`,
      ).toBe(false);
    }

    // Restore org admin context
    if (orgAdminToken) {
      api.session.tenant.accessToken = orgAdminToken;
      api.session.tenant.userId = orgAdminUserId;
    }
  });
});
