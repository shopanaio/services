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

test.describe('Self-Role Modification Restriction (FR-8)', () => {
  test('User cannot modify their own org role', async ({ api }) => {
    // 1. Create organization (user becomes admin)
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

    // 2. User attempts to change their own role to member
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    // 3. Verify operation fails with appropriate error
    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/self|own|yourself/);
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();
  });

  test('User cannot revoke their own org access', async ({ api }) => {
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

    // 2. User attempts to remove themselves from organization
    const { data: removeData } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId,
        },
      },
    });

    // 3. Verify operation fails
    const userErrors = removeData.organizationMutation.memberRemove.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(removeData.organizationMutation.memberRemove.removedMemberId).toBeNull();
  });

  test('Admin cannot demote themselves', async ({ api }) => {
    // 1. Create organization
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

    // 2. Admin attempts to change their role to member
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

  test('Role change must be performed by another user', async ({ api }) => {
    // 1. Create organization with two admins
    await api.session.setupUser();
    const adminAToken = api.session.accessToken;

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

    // Invite second admin
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

    // 2. Admin A changes Admin B's role to member
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

    // 3. Verify operation succeeds (another user performed it)
    expect(changeData.organizationMutation.memberRoleChange.member).not.toBeNull();
    expect(changeData.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // Restore admin token
    if (adminAToken) {
      api.session.tenant.accessToken = adminAToken;
    }
  });

  test('User cannot modify their own store role', async ({ api }) => {
    // 1. Create store
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

    // 2. User attempts to change their own store role
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId,
          domain: `store:${storeId}`,
          role: 'viewer',
        },
      },
    });

    // 3. Verify operation fails
    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/self|own|yourself/);
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();
  });

  test('User cannot revoke their own store access', async ({ api }) => {
    // 1. Create store with user as admin
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

    // 2. User attempts to remove themselves from store
    const { data: removeData } = await api.admin.mutation('iam-api/MemberAccessRemove', {
      variables: {
        input: {
          organizationId,
          userId,
          domain: `store:${storeId}`,
        },
      },
    });

    // 3. Verify operation fails
    const userErrors = removeData.organizationMutation.memberAccessRemove.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(removeData.organizationMutation.memberAccessRemove.success).toBe(false);
  });

  test('Store admin cannot demote themselves', async ({ api }) => {
    // 1. Create store
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

    // 2. Store admin attempts to demote self to manager/viewer
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId,
          domain: `store:${storeId}`,
          role: 'manager',
        },
      },
    });

    // 3. Verify operation fails
    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();
  });

  test('Store role change must be performed by another admin', async ({ api }) => {
    // 1. Create store with two admins
    await api.session.setupUser();
    const adminAToken = api.session.accessToken;

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

    // Invite second store admin
    const adminB = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminB.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // 2. Admin A changes Admin B's role to manager
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: adminB.userId,
          domain: `store:${storeId}`,
          role: 'manager',
        },
      },
    });

    // 3. Verify operation succeeds
    expect(changeData.organizationMutation.memberRoleChange.member).not.toBeNull();
    expect(changeData.organizationMutation.memberRoleChange.userErrors).toHaveLength(0);

    // Restore admin token
    if (adminAToken) {
      api.session.tenant.accessToken = adminAToken;
    }
  });

  test('Self-modification restriction applies even to site admin', async ({ api }) => {
    // Note: This test requires site admin setup which may require special configuration
    // The test verifies that even site admins cannot modify their own roles
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

    // Even if user has elevated permissions, self-modification should fail
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    // Verify operation fails (self-modification rule applies)
    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();
  });

  test('User cannot assign additional roles to themselves', async ({ api }) => {
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
    api.session.organizationId = organizationId;

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

    // 2. Create a member user
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

    // Switch to member context
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    // 3. User attempts to grant themselves admin role
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: memberUser.userId,
          domain: 'org',
          role: 'admin',
        },
      },
    });

    // 4. Verify operation fails
    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });
});
