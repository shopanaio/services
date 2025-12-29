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

/**
 * Site Admin Bypass (FR-5)
 *
 * Site admins are platform-level administrators who can bypass RBAC checks.
 * They are identified by a special flag in their user record, not by organization roles.
 *
 * Note: These tests require a site admin user to be configured in the test environment.
 * If site admin functionality is not available, tests will be skipped.
 */
test.describe('Site Admin Bypass (FR-5)', () => {
  test('Site admin should bypass all RBAC checks', async ({ api }) => {
    // Note: This test requires site admin configuration
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization by regular user
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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

    // 2. Switch to site admin
    await api.session.setupSiteAdmin?.();

    // 3. Verify site admin can access organization resources without being a member
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'update' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Site admin should access any organization', async ({ api }) => {
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization by regular user
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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

    // 2. Switch to site admin
    await api.session.setupSiteAdmin?.();

    // 3. Verify site admin can read, update, manage the organization
    const actions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.profile', action: 'update' },
      { resource: 'org.members', action: 'read' },
      { resource: 'org.members', action: 'invite' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.roles', action: 'create' },
    ];

    for (const { resource, action } of actions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });

      expect(
        (authData as unknown as AuthorizeResult).userQuery.authorize.allowed,
        `Site admin should have ${resource}.${action} permission`,
      ).toBe(true);
    }
  });

  test('Site admin should access any store', async ({ api }) => {
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization and store by regular user
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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
    const storeId = store?.id;

    // 2. Switch to site admin
    await api.session.setupSiteAdmin?.();

    // 3. Verify site admin can access store resources
    const actions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'update' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'invite' },
    ];

    for (const { resource, action } of actions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: `store:${storeId}`, resource, action },
        },
      });

      expect(
        (authData as unknown as AuthorizeResult).userQuery.authorize.allowed,
        `Site admin should have ${resource}.${action} permission`,
      ).toBe(true);
    }
  });

  test('Site admin check should occur before Casbin policy evaluation', async ({ api }) => {
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization with no explicit policies for site admin
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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

    // 2. Switch to site admin
    await api.session.setupSiteAdmin?.();

    // 3. Site admin accesses resource - should succeed without Casbin evaluation
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'delete' },
      },
    });

    // Site admin bypass should grant access
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Site admin should manage members of any organization', async ({ api }) => {
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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

    // 2. Switch to site admin
    await api.session.setupSiteAdmin?.();

    // 3. Site admin invites member
    const newUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: newUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // Verify invitation succeeded
    expect(inviteData.organizationMutation.memberInvite.userErrors).toHaveLength(0);
  });

  test('Site admin should manage roles in any organization', async ({ api }) => {
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization with custom roles
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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

    // 2. Switch to site admin
    await api.session.setupSiteAdmin?.();

    // 3. Site admin creates custom role
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: 'site-admin-created-role',
          displayName: 'Role Created by Site Admin',
          permissions: [{ resource: 'org.profile', actions: ['read'] }],
        },
      },
    });

    expect(createData.roleMutation.roleCreate.role).not.toBeNull();
    const roleId = createData.roleMutation.roleCreate.role?.id;

    // 4. Site admin can delete the role
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: roleId,
        },
      },
    });

    expect(deleteData.roleMutation.roleDelete.userErrors).toHaveLength(0);
  });

  test('Regular user should not have site admin privileges', async ({ api }) => {
    // 1. Create regular user
    await api.session.setupUser();
    const regularUserToken = api.session.accessToken;
    const regularUserId = api.session.tenant.userId;

    // 2. Create organization by another user
    const anotherUser = await api.admin.user.create();
    api.session.tenant.accessToken = anotherUser.accessToken;
    api.session.tenant.userId = anotherUser.userId;

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

    // 3. Switch back to regular user and attempt to access unrelated organization
    api.session.tenant.accessToken = regularUserToken ?? undefined;
    api.session.tenant.userId = regularUserId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });

    // 4. Verify access denied (no site admin privileges)
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Site admin should not appear in organization member lists', async ({ api }) => {
    // Skip if site admin is not configured
    const hasSiteAdmin = api.session.tenant.isSiteAdmin ?? false;

    if (!hasSiteAdmin) {
      test.skip();
      return;
    }

    // 1. Create organization
    const regularUser = await api.admin.user.create();
    api.session.tenant.accessToken = regularUser.accessToken;
    api.session.tenant.userId = regularUser.userId;

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

    // 2. Site admin accesses organization
    await api.session.setupSiteAdmin?.();
    const siteAdminId = api.session.tenant.userId;

    // Access a resource to potentially trigger any implicit membership
    await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });

    // 3. Query member list
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const members = membershipData.organizationQuery.organization?.membership?.members ?? [];

    // 4. Verify site admin is not in member list
    const siteAdminInList = members.find((m: { user: { id: string } }) => m.user.id === siteAdminId);
    expect(siteAdminInList).toBeUndefined();
  });
});
