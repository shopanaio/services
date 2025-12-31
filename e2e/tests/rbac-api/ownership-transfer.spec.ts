import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Ownership Transfer (FR-4.1)
 *
 * Tests for transferring organization ownership to another admin.
 */
test.describe('Ownership Transfer', () => {
  test('Owner can transfer ownership to another admin', async ({ api }) => {
    // 1. Create org as owner
    await api.session.setupUser();
    const originalOwnerId = api.session.tenant.userId;

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

    // 2. Invite another user as admin
    const newOwner = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: newOwner.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Transfer ownership
    const { data: transferData } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: newOwner.userId,
        },
      },
    });

    expect(transferData.organizationMutation.ownershipTransfer.success).toBe(true);

    // 4. Verify new owner
    const { data: membersData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const members = membersData.organizationQuery.organization?.membership?.members ?? [];
    expect(members.length).toBeGreaterThan(0);
    const newOwnerMember = members.find((m) => m.user?.id === newOwner.userId);
    const oldOwnerMember = members.find((m) => m.user?.id === originalOwnerId);

    expect(newOwnerMember?.isOwner).toBe(true);
    expect(oldOwnerMember?.isOwner).toBe(false);
    // Old owner's grantedBy is themselves (they created the org and granted themselves the role)
    expect(oldOwnerMember?.grantedBy?.id).toBe(originalOwnerId);
  });

  test('Cannot transfer ownership to non-admin member', async ({ api }) => {
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

    // Invite as member (not admin)
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

    // Attempt transfer to member should fail
    const { data } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: memberUser.userId,
        },
      },
    });

    const userErrors = data.organizationMutation.ownershipTransfer.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('admin');
    expect(data.organizationMutation.ownershipTransfer.success).toBe(false);
  });

  test('Cannot transfer ownership to non-member', async ({ api }) => {
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

    // Create user but don't invite
    const outsideUser = await api.admin.user.create();

    // Attempt transfer to non-member should fail
    const { data } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: outsideUser.userId,
        },
      },
    });

    const userErrors = data.organizationMutation.ownershipTransfer.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('member');
    expect(data.organizationMutation.ownershipTransfer.success).toBe(false);
  });

  test('Only owner can transfer ownership (admin cannot)', async ({ api }) => {
    // 1. Create org as owner
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

    // 2. Invite two admins
    const adminUser = await api.admin.user.create();
    const anotherAdmin = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: anotherAdmin.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Switch to admin (not owner)
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    // 4. Admin attempts to transfer ownership - should fail
    const { data } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: anotherAdmin.userId,
        },
      },
    });

    const userErrors = data.organizationMutation.ownershipTransfer.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('owner');
    expect(data.organizationMutation.ownershipTransfer.success).toBe(false);
  });

  test('Previous owner retains admin role after transfer', async ({ api }) => {
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

    // Invite new admin and transfer
    const newOwner = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: newOwner.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: newOwner.userId,
        },
      },
    });

    // Verify previous owner still has admin role (not demoted)
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });

    // Previous owner should still be able to invite (admin permission)
    // Note: They no longer bypass, they now use RBAC
    expect(authData.userQuery.authorize.allowed).toBe(true);
  });
});
