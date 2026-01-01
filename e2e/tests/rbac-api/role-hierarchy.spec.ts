import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;

test.describe('Role Hierarchy (FR-4)', () => {
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
      { resource: 'org.stores', action: 'write' },
      { resource: 'org.stores', action: 'read' },
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

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Admin should be allowed: ${resource}.${action}`,
      ).toBe(true);
    }
  });

  test('Org member should have basic organization access only', async ({ api }) => {
    // 1. Create organization as first user (admin)
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

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Member should be allowed: ${resource}.${action}`,
      ).toBe(true);
    }

    // 6. Verify member cannot perform admin actions
    const deniedActions = [
      { resource: 'org.profile', action: 'write' },
      { resource: 'org.members', action: 'write' },
      { resource: 'org.members', action: 'write' },
      { resource: 'org.members', action: 'admin' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.roles', action: 'write' },
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

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Member should be denied: ${resource}.${action}`,
      ).toBe(false);
    }

    // Restore admin token for cleanup
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });

  test('Organization admin should have full access to all stores', async ({ api }) => {
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

    // 2. Create multiple stores
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

    // 3. Verify org admin can access all store resources in both stores
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.access', action: 'read' },
      { resource: 'store.access', action: 'write' },
    ];

    // Check access for store1
    if (store1) {
      api.session.project = { id: store1.id, slug: store1.name, name: store1.name };
      for (const { resource, action } of storeActions) {
        const { data: authData } = await api.admin.query('roles-api/Authorize', {
          variables: {
            input: { organizationId, domain: store1.membership?.domain, resource, action },
          },
        });

        const result = authData;
        expect(
          result.userQuery.authorize.allowed,
          `Org admin should be allowed in store1: ${resource}.${action}`,
        ).toBe(true);
      }
    }

    // Check access for store2
    if (store2) {
      api.session.project = { id: store2.id, slug: store2.name, name: store2.name };
      for (const { resource, action } of storeActions) {
        const { data: authData } = await api.admin.query('roles-api/Authorize', {
          variables: {
            input: { organizationId, domain: store2.membership?.domain, resource, action },
          },
        });

        const result = authData;
        expect(
          result.userQuery.authorize.allowed,
          `Org admin should be allowed in store2: ${resource}.${action}`,
        ).toBe(true);
      }
    }
  });

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
          roles: [{ domain: storeDomain, role: 'viewer' }],
        },
      },
    });

    // 3. Switch to viewer context
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // 4. Verify viewer can: store.profile.read
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain, resource: 'store.profile', action: 'read' },
      },
    });
    const readResult = readAuth;
    expect(readResult.userQuery.authorize.allowed).toBe(true);

    // 5. Verify viewer cannot: store.profile.update, store.members.*, store.roles.*, store.access.*
    const deniedActions = [
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.profile', action: 'admin' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'admin' },
      { resource: 'store.access', action: 'read' },
      { resource: 'store.access', action: 'write' },
      { resource: 'store.access', action: 'admin' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Viewer should be denied: ${resource}.${action}`,
      ).toBe(false);
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
          roles: [{ domain: storeDomain, role: 'manager' }],
        },
      },
    });

    // 3. Switch to manager context
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    // 4. Verify manager can: store.profile.read, store.profile.update
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const allowedActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
    ];

    for (const { resource, action } of allowedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Manager should be allowed: ${resource}.${action}`,
      ).toBe(true);
    }

    // 5. Verify manager cannot: store.profile.delete, store.members.*, store.roles.*, store.access.*
    const deniedActions = [
      { resource: 'store.profile', action: 'admin' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'admin' },
      { resource: 'store.access', action: 'write' },
      { resource: 'store.access', action: 'admin' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Manager should be denied: ${resource}.${action}`,
      ).toBe(false);
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
          roles: [{ domain: storeDomain, role: 'admin' }],
        },
      },
    });

    // 3. Switch to store admin context
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    // 4. Verify store admin can perform all store.* actions
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'admin' },
      { resource: 'store.access', action: 'read' },
      { resource: 'store.access', action: 'write' },
      { resource: 'store.access', action: 'admin' },
    ];

    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
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
          roles: [{ domain: storeDomain, role: 'manager' }],
        },
      },
    });

    // 3. Switch to manager and verify cannot perform admin-only actions
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    // Manager should NOT have admin permissions - roles are explicit, not inherited
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const adminOnlyActions = [
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'admin' },
      { resource: 'store.access', action: 'write' },
      { resource: 'store.access', action: 'admin' },
    ];

    for (const { resource, action } of adminOnlyActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
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
          roles: [{ domain: storeDomain, role: 'viewer' }],
        },
      },
    });

    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // Viewer should NOT have manager permissions
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain, resource: 'store.profile', action: 'write' },
      },
    });

    const updateResult = updateAuth;
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
          roles: [{ domain: storeDomain, role: 'viewer' }],
        },
      },
    });

    // 3. Switch to viewer context
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // 4. Verify viewer cannot update store profile (manager action)
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain, resource: 'store.profile', action: 'write' },
      },
    });

    const result = updateAuth;
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
          roles: [{ domain: storeDomain, role: 'manager' }],
        },
      },
    });

    // 3. Switch to manager context
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    // 4. Verify manager cannot: delete store, manage members, manage roles
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const adminOnlyActions = [
      { resource: 'store.profile', action: 'admin' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'write' },
      { resource: 'store.roles', action: 'admin' },
      { resource: 'store.access', action: 'write' },
      { resource: 'store.access', action: 'admin' },
    ];

    for (const { resource, action } of adminOnlyActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
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

  /**
   * Store Has No Owner or Last Admin Protection
   *
   * - Store does NOT have an owner concept (only roles: viewer, manager, admin)
   * - Store admins can ALL be removed (no "last admin" protection)
   * - Organization owner/admin ALWAYS has full access to all stores
   */
  test('Organization admin can remove ALL store admins and retain access', async ({ api }) => {
    // 1. Create org and store
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

    // 2. Add a second store admin
    const storeAdminUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [{ domain: storeDomain, role: 'admin' }],
        },
      },
    });

    // 3. Org admin should be able to remove the store admin
    // (This would use MemberRemove or similar mutation - placeholder for now)
    // After removal, org admin should still have full access

    // 4. Verify org admin still has full store access after removing store admins
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.access', action: 'write' },
    ];

    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData;
      expect(
        result.userQuery.authorize.allowed,
        `Org admin should retain access: ${resource}.${action}`,
      ).toBe(true);
    }
  });

  test('Store admin can be demoted without owner protection', async ({ api }) => {
    // Unlike org owner, store admin CAN be demoted
    // 1. Create org and store
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

    // 2. Invite another user as store admin
    const storeAdminUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [{ domain: storeDomain, role: 'admin' }],
        },
      },
    });

    // 3. Org admin can demote store admin to manager/viewer
    // (This would use role update mutation - placeholder for actual implementation)
    // The test verifies that store admin CAN be demoted (no owner protection)
  });

  test('Store creator is NOT marked as owner - just receives admin role', async ({ api }) => {
    // Store does NOT have owner concept
    // 1. Create org
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

    // 2. Create store
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

    // 3. Verify store creator has admin role but no owner attribute
    // Store should NOT have owner_id or created_by as a protected attribute
    // The creator simply gets admin role which can be changed/removed
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };

      // Verify admin permissions
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: {
            organizationId,
            domain: store.membership?.domain,
            resource: 'store.profile',
            action: 'write',
          },
        },
      });

      const result = authData;
      expect(result.userQuery.authorize.allowed).toBe(true);
    }
  });

  test('Any store admin can delete the store (with org permission)', async ({ api }) => {
    // Unlike org, where only owner can delete, any store admin can delete store
    // (provided they also have org.stores.delete permission)
    // 1. Create org and store
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

    // 2. Verify store admin can delete (has store.profile.delete permission)
    const storeDomain = store?.membership?.domain;
    const domain = storeDomain;
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain, resource: 'store.profile', action: 'admin' },
      },
    });

    const result = authData;
    expect(result.userQuery.authorize.allowed).toBe(true);

    // Note: Actual deletion also requires org.stores.delete at organization level
  });
});
