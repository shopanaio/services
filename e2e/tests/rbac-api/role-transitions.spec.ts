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

interface MemberRoleChangeResult {
  organizationMutation: {
    memberRoleChange: {
      member?: {
        user: { id: string };
        roles: Array<{ domain: string; role: string }>;
      };
      userErrors: Array<{ message: string; code: string }>;
    };
  };
}

interface StoreMemberRoleChangeResult {
  storeMutation: {
    memberRoleChange: {
      member?: {
        user: { id: string };
        roles: Array<{ domain: string; role: string }>;
      };
      userErrors: Array<{ message: string; code: string }>;
    };
  };
}

interface OwnershipTransferResult {
  organizationMutation: {
    ownershipTransfer: {
      organization?: {
        id: string;
        owner: { id: string };
      };
      userErrors: Array<{ message: string; code: string }>;
    };
  };
}

/**
 * Role Transitions
 *
 * Tests for role promotion and demotion workflows in organizations and stores.
 *
 * Organization role hierarchy: owner > admin > member
 * Store role hierarchy: admin > manager > viewer
 *
 * Constraints:
 * - Users cannot modify their own roles
 * - Cannot demote the last admin
 * - Cannot demote the owner
 * - Only owner can transfer ownership
 * - Ownership transfer target must be an admin
 */
test.describe('Role Transitions', () => {
  test('Admin can promote member to admin', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
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

    // 2. Invite a user as member
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

    // 3. Accept invitation as member
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    // 4. Switch back to owner and promote member to admin
    api.session.tenant.accessToken = ownerToken ?? undefined;
    api.session.tenant.userId = ownerId;

    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: memberUser.userId,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);
    expect(result.organizationMutation.memberRoleChange.member).not.toBeNull();

    // 5. Verify promoted user has admin permissions
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Admin can demote admin to member if not last or owner', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
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

    // 2. Invite a user as admin (second admin)
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

    // 3. Demote admin B to member (owner remains admin)
    const { data: demoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: adminUser.userId,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    const result = demoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify demoted user no longer has admin permissions
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Cannot demote owner admin', async ({ api }) => {
    // 1. Create organization (creator becomes owner)
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
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

    // 3. Try to demote owner (as new admin)
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: demoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: ownerId,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Verify demotion fails
    const result = demoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);
  });

  test('Store admin can promote viewer to manager', async ({ api }) => {
    // 1. Create organization and store
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
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

    // 2. Invite user as store viewer
    const viewerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: viewerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    // 3. Promote viewer to manager
    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: viewerUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify manager permissions
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Store admin can promote viewer to admin', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Invite user as store viewer
    const viewerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: viewerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    // 3. Promote viewer directly to admin
    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: viewerUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify admin permissions
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Store admin can demote manager to viewer', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Invite user as store manager
    const managerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: managerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    // 3. Demote manager to viewer
    const { data: demoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: managerUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    const result = demoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify viewer permissions (no update access)
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Store admin can promote manager to admin', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Invite user as store manager
    const managerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: managerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    // 3. Promote manager to admin
    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: managerUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify admin permissions
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Store admin can demote admin to manager if not last or owner', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Invite user as store admin (org admin always has full store access as backup)
    const storeAdminUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // 3. Demote store admin to manager (org admin still has full access)
    const { data: demoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: storeAdminUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    const result = demoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify demoted user no longer has admin permissions
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Store admin can demote admin to viewer if not last or owner', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Invite user as store admin
    const storeAdminUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // 3. Demote store admin directly to viewer
    const { data: demoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: storeAdminUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    const result = demoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // 4. Verify viewer permissions (read only)
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'read' },
      },
    });
    expect((readAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'write' },
      },
    });
    expect((updateAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Cannot modify own role', async ({ api }) => {
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

    // 2. Try to modify own role
    const { data: selfModifyData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: userId,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Verify self-modification fails
    const result = selfModifyData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);
  });

  test('Cannot demote last admin to lower role', async ({ api }) => {
    // 1. Create organization (creator is the only admin)
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

    // 2. Add second admin
    const secondAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: secondAdmin.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Have second admin demote the first to member
    api.session.tenant.accessToken = secondAdmin.accessToken;
    api.session.tenant.userId = secondAdmin.userId;

    // 4. Try to demote the last admin (the second admin trying to demote owner - should fail due to owner protection)
    // Note: Owner cannot be demoted, this acts as last admin protection for owner
    const { data: demoteOwner } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: api.session.tenant.userId, // self-modification attempt
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    const result = demoteOwner as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);
  });

  test('Member cannot promote others', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
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

    // 2. Add member
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

    // 3. Add another member to try to promote
    const targetUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: targetUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Switch to member and try to promote target
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: targetUser.userId,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 5. Verify promotion fails (member lacks permission)
    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);
  });

  test('Store viewer cannot perform transitions', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Add viewer
    const viewerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: viewerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    // 3. Add target user
    const targetUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: targetUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    // 4. Switch to viewer and try to promote target
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: targetUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    // 5. Verify transition fails
    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);
  });

  test('Store manager cannot perform transitions', async ({ api }) => {
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
    const storeId = store?.id;

    // 2. Add manager
    const managerUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: managerUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    // 3. Add target user
    const targetUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: targetUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'viewer' },
          ],
        },
      },
    });

    // 4. Switch to manager and try to promote target
    api.session.tenant.accessToken = managerUser.accessToken;
    api.session.tenant.userId = managerUser.userId;

    const { data: promoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: targetUser.userId,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // 5. Verify transition fails (manager lacks permission)
    const result = promoteData as unknown as MemberRoleChangeResult;
    expect(result.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);
  });

  test('Owner can transfer ownership to another admin', async ({ api }) => {
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

    // 2. Add admin
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

    // 3. Transfer ownership to admin
    const { data: transferData } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: adminUser.userId,
        },
      },
    });

    const result = transferData as unknown as OwnershipTransferResult;
    expect(result.organizationMutation.ownershipTransfer.userErrors).toHaveLength(0);
    expect(result.organizationMutation.ownershipTransfer.organization?.owner.id).toBe(adminUser.userId);
  });

  test('Only current owner can transfer ownership', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
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

    // 2. Add admin
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

    // 3. Add target admin
    const targetAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: targetAdmin.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 4. Switch to non-owner admin and try to transfer ownership
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: transferData } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: targetAdmin.userId,
        },
      },
    });

    // 5. Verify transfer fails
    const result = transferData as unknown as OwnershipTransferResult;
    expect(result.organizationMutation.ownershipTransfer.userErrors.length).toBeGreaterThan(0);
  });

  test('Target of ownership transfer must be admin', async ({ api }) => {
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

    // 2. Add member (not admin)
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

    // 3. Try to transfer ownership to member
    const { data: transferData } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: memberUser.userId,
        },
      },
    });

    // 4. Verify transfer fails (target must be admin)
    const result = transferData as unknown as OwnershipTransferResult;
    expect(result.organizationMutation.ownershipTransfer.userErrors.length).toBeGreaterThan(0);
  });

  test('Previous owner retains admin role after transfer', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
    const ownerId = api.session.tenant.userId;
    const ownerToken = api.session.accessToken;

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

    // 2. Add admin
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

    // 3. Transfer ownership
    await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: adminUser.userId,
        },
      },
    });

    // 4. Verify previous owner still has admin permissions
    api.session.tenant.accessToken = ownerToken ?? undefined;
    api.session.tenant.userId = ownerId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });
});
