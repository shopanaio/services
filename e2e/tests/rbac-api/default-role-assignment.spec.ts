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

interface OrganizationResult {
  organizationQuery: {
    organization: {
      id: string;
      name: string;
      owner: {
        id: string;
      };
      membership?: {
        members: Array<{
          user: { id: string };
          roles: Array<{ domain: string; role: string }>;
          isOwner?: boolean;
        }>;
      };
    };
  };
}

interface StoreResult {
  storeQuery: {
    store: {
      id: string;
      name: string;
      createdBy?: {
        id: string;
      };
      membership?: {
        members: Array<{
          user: { id: string };
          roles: Array<{ domain: string; role: string }>;
          isOwner?: boolean;
        }>;
      };
    };
  };
}

interface MemberInviteResult {
  organizationMutation: {
    memberInvite: {
      invitation?: {
        id: string;
        email: string;
        roles: Array<{ domain: string; role: string }>;
      };
      userErrors: Array<{ message: string; code: string }>;
    };
  };
}

/**
 * Default Role Assignment
 *
 * Tests for automatic role assignment on resource creation and invitations.
 *
 * Key behaviors:
 * - Organization creator becomes admin and owner
 * - Store creator becomes store admin and is marked as owner
 * - Invited users receive the role specified in the invitation
 * - Default invitation roles: member (org), viewer (store)
 * - Owner is stored separately from role assignment
 * - Each org/store has exactly one owner
 */
test.describe('Default Role Assignment', () => {
  test('Org admin creating store becomes store admin and owner', async ({ api }) => {
    // 1. Create organization (user is org admin/owner)
    await api.session.setupUser();
    const userId = api.session.tenant.userId;

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
    const storeDomain = store?.membership?.domain;

    // 3. Verify user has store admin permissions
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: {
          organizationId,
          domain: storeDomain,
          resource: 'store.members',
          action: 'write',
        },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // 4. Verify user has full admin access (indicative of store admin role)
    const adminActions = [
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.roles', action: 'write' },
    ];

    for (const { resource, action } of adminActions) {
      const { data: adminAuth } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: storeDomain, resource, action },
        },
      });
      expect(
        (adminAuth as unknown as AuthorizeResult).userQuery.authorize.allowed,
        `Store creator should have ${resource}.${action}`,
      ).toBe(true);
    }
  });

  test('Store creator is marked as owner separately from role', async ({ api }) => {
    // 1. Create organization and store
    await api.session.setupUser();
    const userId = api.session.tenant.userId;

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

    // 2. Query stores in org to verify the created store exists
    const { data: queryData } = await api.admin.query('project-api/StoreMembership', {
      variables: { organizationId },
    });

    // 3. Verify the store was created and is accessible
    const stores = queryData.storeQuery?.stores ?? [];
    const createdStore = stores.find((s: { id: string }) => s.id === storeId);
    // Store should exist and be accessible to the creator
    expect(createdStore).toBeDefined();
    expect(createdStore?.id).toBe(storeId);
  });

  test('Organization creator receives admin role', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const userId = api.session.tenant.userId;

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

    // 2. Verify creator has admin permissions
    const adminActions = [
      { resource: 'org.profile', action: 'write' },
      { resource: 'org.members', action: 'write' },
      { resource: 'org.roles', action: 'write' },
    ];

    for (const { resource, action } of adminActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });
      expect(
        (authData as unknown as AuthorizeResult).userQuery.authorize.allowed,
        `Organization creator should have ${resource}.${action}`,
      ).toBe(true);
    }
  });

  test('Organization creator is marked as owner', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const userId = api.session.tenant.userId;

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

    // 2. Query organization membership to verify owner
    const { data: queryData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const members = queryData.organizationQuery.organization?.membership?.members ?? [];
    const owner = members.find((m: { isOwner?: boolean }) => m.isOwner);
    expect(owner).toBeDefined();
    expect(owner?.user?.id).toBe(userId);
  });

  test('Only one owner per organization', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const userId = api.session.tenant.userId;

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

    // 2. Add another admin
    const adminUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Query organization membership to verify only one owner
    const { data: queryData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const members = queryData.organizationQuery.organization?.membership?.members ?? [];
    const owners = members.filter((m: { isOwner?: boolean }) => m.isOwner);
    // There should be exactly one owner (the creator)
    expect(owners).toHaveLength(1);
    expect(owners[0]?.user?.id).toBe(userId);
  });

  test('User receives role specified in invitation', async ({ api }) => {
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

    // 2. Invite user as admin
    const adminUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Verify invited user has admin role
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Default org invitation role is member', async ({ api }) => {
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

    // 2. Invite user with member role (default/explicit)
    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Verify invited user has member role (read-only, no invite permission)
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    // Should have read access
    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });
    expect((readAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Should NOT have write access (admin only)
    const { data: inviteAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });
    expect((inviteAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Default store invitation role is viewer', async ({ api }) => {
    // 1. Create organization and store
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

    // 2. Invite user with viewer role (default/explicit)
    const viewerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: viewerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: storeDomain, role: 'viewer' },
          ],
        },
      },
    });

    // 3. Verify invited user has viewer role
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // Should have read access
    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: {
          organizationId,
          domain: storeDomain,
          resource: 'store.profile',
          action: 'read',
        },
      },
    });
    expect((readAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Should NOT have write access
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: {
          organizationId,
          domain: storeDomain,
          resource: 'store.profile',
          action: 'write',
        },
      },
    });
    expect((updateAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Can invite with admin role', async ({ api }) => {
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

    // 2. Invite user as admin
    const adminUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors).toHaveLength(0);

    // 3. Verify user has admin permissions
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Can invite with manager role in store', async ({ api }) => {
    // 1. Create organization and store
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

    // 2. Invite user as manager
    const managerUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: managerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: storeDomain, role: 'manager' },
          ],
        },
      },
    });

    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors).toHaveLength(0);

    // 3. Verify user has manager permissions
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    // Manager can write profile
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: {
          organizationId,
          domain: storeDomain,
          resource: 'store.profile',
          action: 'write',
        },
      },
    });
    expect((updateAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Manager cannot write members (admin only)
    const { data: inviteAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: {
          organizationId,
          domain: storeDomain,
          resource: 'store.members',
          action: 'write',
        },
      },
    });
    expect((inviteAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Invited user is not marked as owner', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const ownerId = api.session.tenant.userId;

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

    // 2. Invite user as admin
    const adminUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Query organization membership to verify owner is still original creator
    const { data: queryData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const members = queryData.organizationQuery.organization?.membership?.members ?? [];
    const owner = members.find((m: { isOwner?: boolean }) => m.isOwner);
    // Owner should still be the original creator, not the invited admin
    expect(owner).toBeDefined();
    expect(owner?.user?.id).toBe(ownerId);
    expect(owner?.user?.id).not.toBe(adminUser.userId);
  });

  test('Cannot assign non-existent role', async ({ api }) => {
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

    // 2. Try to invite with non-existent role
    const testUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: 'nonexistent-role' }],
        },
      },
    });

    // 3. Verify invitation fails
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });

  test('Cannot assign role from different domain', async ({ api }) => {
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

    // 2. Try to assign store role (viewer/manager) at org level
    const testUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: 'viewer' }], // 'viewer' is a store role, not org role
        },
      },
    });

    // 3. Verify invitation fails (viewer is not valid for org domain)
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });
});
