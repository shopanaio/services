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
 * Last Admin Protection (FR-12) - Organization Only
 *
 * - Cannot remove the last admin from organization
 * - Cannot demote the last organization admin to a lower role
 * - Store admins can ALL be removed (organization owner/admin always has full store access)
 *
 * NOTE: Store has NO "last admin" protection because org owner/admin always has full access to all stores.
 */
test.describe('Last Admin Protection (FR-12) - Organization Only', () => {
  test('Cannot remove the last admin from organization', async ({ api }) => {
    // 1. Create organization (single admin/owner)
    await api.session.setupUser();
    const adminId = api.session.tenant.userId;

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

    // 2. Attempt to remove the admin
    const { data: removeData } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: adminId,
        },
      },
    });

    // 3. Verify operation fails with appropriate error
    const userErrors = removeData.organizationMutation.memberRemove.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(removeData.organizationMutation.memberRemove.removedMemberId).toBeNull();
  });

  test('Cannot demote the last org admin to member', async ({ api }) => {
    // 1. Create organization (single admin)
    await api.session.setupUser();
    const adminId = api.session.tenant.userId;

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

    // 2. Attempt to change admin role to member
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: adminId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    // 3. Verify operation fails
    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();
  });

  test('Can remove org admin if another admin exists', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
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

    // 2. Add second admin
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

    // 3. Remove second admin (not owner)
    const { data: removeData } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: adminB.userId,
        },
      },
    });

    // 4. Verify operation succeeds
    expect(removeData.organizationMutation.memberRemove.removedMemberId).not.toBeNull();
    expect(removeData.organizationMutation.memberRemove.userErrors).toHaveLength(0);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Can demote org admin if another admin exists', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
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

    // 2. Add second admin
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

    // 3. Demote one admin to member
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: adminB.userId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    // 4. Verify operation succeeds
    expect(changeData.organizationMutation.memberRoleChange.member).not.toBeNull();
    expect(changeData.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Cannot batch remove all org admins', async ({ api }) => {
    // 1. Create org with multiple admins
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

    // Add second admin
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

    // 2. Remove second admin first (should succeed)
    const { data: removeB } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: adminB.userId,
        },
      },
    });
    expect(removeB.organizationMutation.memberRemove.userErrors).toHaveLength(0);

    // 3. Attempt to remove last admin (owner) - should fail
    const { data: removeOwner } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: ownerId,
        },
      },
    });

    // Verify last removal fails
    expect(removeOwner.organizationMutation.memberRemove.userErrors.length).toBeGreaterThan(0);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  // Store Has No Last Admin Protection
  test('Can remove the last/only store admin', async ({ api }) => {
    // Store has NO last admin protection
    // 1. Create store with single store admin
    await api.session.setupUser();
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
    const storeId = store?.id;

    // Add a user as the ONLY store admin (separate from org admin)
    const storeAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdmin.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // 2. Remove the store admin
    const { data: removeData } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: storeAdmin.userId,
        },
      },
    });

    // 3. Verify operation succeeds
    expect(removeData.organizationMutation.memberRemove.userErrors).toHaveLength(0);

    // 4. Verify org admin still has full access to store
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'update' },
      },
    });
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Can demote the last store admin to manager', async ({ api }) => {
    // Store admins can be demoted freely
    await api.session.setupUser();
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
    const storeId = store?.id;

    // Add a user as store admin
    const storeAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdmin.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // Demote store admin to manager
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: storeAdmin.userId,
          domain: `store:${storeId}`,
          role: 'manager',
        },
      },
    });

    // Verify operation succeeds
    expect(changeData.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);
    expect(changeData.organizationMutation.memberRoleChange.member).not.toBeNull();

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Can demote the last store admin to viewer', async ({ api }) => {
    // Store admins can be demoted to any role
    await api.session.setupUser();
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
    const storeId = store?.id;

    // Add a user as store admin
    const storeAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdmin.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // Demote store admin to viewer
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: storeAdmin.userId,
          domain: `store:${storeId}`,
          role: 'viewer',
        },
      },
    });

    // Verify operation succeeds
    expect(changeData.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);
    expect(changeData.organizationMutation.memberRoleChange.member).not.toBeNull();

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Can remove ALL store admins - org admin retains access', async ({ api }) => {
    // Critical test: org admin always has access
    await api.session.setupUser();
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
    const storeId = store?.id;

    // Add multiple store admins
    const storeAdmin1 = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdmin1.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    const storeAdmin2 = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdmin2.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // Remove ALL store admins
    const { data: remove1 } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: storeAdmin1.userId,
        },
      },
    });
    expect(remove1.organizationMutation.memberRemove.userErrors).toHaveLength(0);

    const { data: remove2 } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: storeAdmin2.userId,
        },
      },
    });
    expect(remove2.organizationMutation.memberRemove.userErrors).toHaveLength(0);

    // Verify org admin can still manage the store
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'update' },
      },
    });
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Verify org admin can add new store admins
    const newStoreAdmin = await api.admin.user.create();
    const { data: inviteData } = await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: newStoreAdmin.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });
    expect(inviteData.organizationMutation.memberInvite.userErrors).toHaveLength(0);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Org admin counts separately from store admin for protection', async ({ api }) => {
    // Test domain separation in admin counting
    await api.session.setupUser();
    const adminId = api.session.tenant.userId;

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

    // Create store - user becomes store admin automatically
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

    // Add another store admin
    const storeAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdmin.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // Verify removing org admin role fails (org protection active, even if store admin exists)
    const { data: orgRoleChange } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: adminId,
          domain: 'org',
          role: 'member',
        },
      },
    });
    expect(orgRoleChange.organizationMutation.memberRoleChange.userErrors.length).toBeGreaterThan(0);

    // Verify removing store admin role for the added user succeeds (no store protection)
    const { data: storeRoleChange } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: storeAdmin.userId,
          domain: `store:${storeId}`,
          role: 'manager',
        },
      },
    });
    expect(storeRoleChange.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);
  });
});
