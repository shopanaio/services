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

interface MemberInviteResult {
  organizationMutation: {
    memberInvite: {
      member?: {
        user: { id: string; email: string };
        roles: { domain: string; role: string }[];
      };
      userErrors: { message: string; code: string }[];
    };
  };
}

interface MembershipResult {
  organizationQuery: {
    organization: {
      membership: {
        members: {
          user: { id: string; email: string };
          roles: { domain: string; role: string }[];
        }[];
      };
    };
  };
}

/**
 * Invitation Workflow (FR-10)
 *
 * Tests for the member invitation system.
 * Note: Current API auto-accepts invitations for existing users.
 *
 * Key behaviors:
 * - Admin can invite users to organization
 * - Invited users receive specified roles
 * - Duplicate invitations are rejected
 * - Member cannot invite others
 * - Can invite with multiple roles (org + store)
 */
test.describe('Invitation Workflow (FR-10)', () => {
  test('Admin can invite user to organization', async ({ api }) => {
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

    // 2. Invite a user
    const invitedUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: invitedUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Verify invitation succeeded
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors).toHaveLength(0);
  });

  test('Invited user receives specified role', async ({ api }) => {
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

    // 3. Verify invited user has admin permissions
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Invited user as member has read-only permissions', async ({ api }) => {
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

    // 2. Invite user as member
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

    // 3. Verify member has read access
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });
    expect((readAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // 4. Verify member cannot write members
    const { data: inviteAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });
    expect((inviteAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Member cannot invite others', async ({ api }) => {
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

    // 2. Invite first user as member
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

    // 3. Switch to member and try to invite another user
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const anotherUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: anotherUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Verify invitation fails
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });

  test('Duplicate invitation to same user fails', async ({ api }) => {
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

    // 2. Invite user
    const invitedUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: invitedUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Try to invite same user again
    const { data: duplicateData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: invitedUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Verify duplicate invitation fails
    const result = duplicateData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });

  test('Can invite with multiple roles (org + store)', async ({ api }) => {
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

    // 2. Invite user with both org member and store manager roles
    const invitedUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: invitedUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'manager' },
          ],
        },
      },
    });

    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors).toHaveLength(0);

    // 3. Verify user has both roles
    api.session.tenant.accessToken = invitedUser.accessToken;
    api.session.tenant.userId = invitedUser.userId;

    // Check org member access
    const { data: orgAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });
    expect((orgAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Check store manager access
    const { data: storeAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'write' },
      },
    });
    expect((storeAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Can invite user as store admin', async ({ api }) => {
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

    // 3. Verify store admin permissions
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.members', action: 'write' },
      },
    });
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Can invite user as store viewer', async ({ api }) => {
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

    // 3. Verify viewer has read-only access
    api.session.tenant.accessToken = viewerUser.accessToken;
    api.session.tenant.userId = viewerUser.userId;

    // Can read
    const { data: readAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'read' },
      },
    });
    expect((readAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Cannot write
    const { data: updateAuth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'write' },
      },
    });
    expect((updateAuth as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Invited user appears in member list', async ({ api }) => {
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

    // 2. Invite user
    const invitedUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: invitedUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Query member list
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const result = membershipData as unknown as MembershipResult;
    const members = result.organizationQuery.organization?.membership?.members ?? [];

    // 4. Verify invited user is in member list
    const invitedMember = members.find(m => m.user.id === invitedUser.userId);
    expect(invitedMember).toBeDefined();
  });

  test('Cannot invite to organization user is not member of', async ({ api }) => {
    // 1. Create two organizations with different owners
    await api.session.setupUser();
    const ownerAToken = api.session.accessToken;
    const ownerAId = api.session.tenant.userId;

    const orgAName = generateOrgName();
    await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    // Create org B with different owner
    const ownerB = await api.admin.user.create();
    api.session.tenant.accessToken = ownerB.accessToken;
    api.session.tenant.userId = ownerB.userId;

    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });
    const orgBId = orgBData.organizationMutation.organizationCreate.organization?.id;

    // 2. Owner A tries to invite to org B (should fail)
    api.session.tenant.accessToken = ownerAToken ?? undefined;
    api.session.tenant.userId = ownerAId;

    const testUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId: orgBId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Verify invitation fails
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });

  test('Admin can invite multiple users', async ({ api }) => {
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

    // 2. Invite multiple users
    const users = await Promise.all([
      api.admin.user.create(),
      api.admin.user.create(),
      api.admin.user.create(),
    ]);

    for (const user of users) {
      const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
        variables: {
          input: {
            organizationId,
            email: user.data.email,
            roles: [{ domain: 'org', role: 'member' }],
          },
        },
      });

      const result = inviteData as unknown as MemberInviteResult;
      expect(result.organizationMutation.memberInvite.userErrors).toHaveLength(0);
    }

    // 3. Verify all users are members
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const result = membershipData as unknown as MembershipResult;
    const members = result.organizationQuery.organization?.membership?.members ?? [];

    // Should have 4 members: owner + 3 invited
    expect(members.length).toBeGreaterThanOrEqual(4);

    for (const user of users) {
      const isMember = members.some(m => m.user.id === user.userId);
      expect(isMember).toBe(true);
    }
  });

  test('Cannot invite with invalid role', async ({ api }) => {
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

    // 2. Try to invite with invalid role
    const testUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: 'super-admin' }], // Invalid role
        },
      },
    });

    // 3. Verify invitation fails
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });

  test('Cannot invite with store role to non-existent store', async ({ api }) => {
    // 1. Create organization (no store)
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

    // 2. Try to invite with role for non-existent store
    const testUser = await api.admin.user.create();
    const fakeStoreId = crypto.randomUUID();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${fakeStoreId}`, role: 'viewer' },
          ],
        },
      },
    });

    // 3. Verify invitation fails
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
  });

  test('Org admin can invite to any store in org', async ({ api }) => {
    // 1. Create organization and multiple stores
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

    // Create store
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

    // 2. Invite user directly as store admin
    const storeAdminUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
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

    // 3. Verify invitation succeeded
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors).toHaveLength(0);

    // 4. Verify user has store admin access
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.members', action: 'write' },
      },
    });
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('Store admin cannot invite without org.members:write permission', async ({ api }) => {
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

    // 2. Invite user as store admin (org member only at org level)
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

    // 3. Switch to store admin and try to invite another user
    api.session.tenant.accessToken = storeAdminUser.accessToken;
    api.session.tenant.userId = storeAdminUser.userId;

    const viewerUser = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
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

    // 4. Verify invitation fails - store admin needs org.members:write permission
    const result = inviteData as unknown as MemberInviteResult;
    expect(result.organizationMutation.memberInvite.userErrors.length).toBeGreaterThan(0);
    expect(result.organizationMutation.memberInvite.userErrors[0].code).toBe('FORBIDDEN');
  });
});
