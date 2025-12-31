import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Owner Exclusive Actions (FR-4.1)
 *
 * Tests for actions that only the organization owner can perform.
 */
test.describe('Owner Exclusive Actions', () => {
  test('Only owner can delete organization', async ({ api }) => {
    // 1. Create org as owner
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
    const ownerUserId = api.session.tenant.userId;

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

    // 2. Invite admin
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

    // 3. Switch to admin
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    // 4. Admin attempts delete - should fail
    const { data: adminDeleteData } = await api.admin.mutation('iam-api/OrganizationDelete', {
      variables: {
        id: organizationId,
      },
    });

    const userErrors = adminDeleteData.organizationMutation.organizationDelete.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('owner');
    expect(adminDeleteData.organizationMutation.organizationDelete.deletedOrganizationId).toBeNull();

    // 5. Switch back to owner
    api.session.tenant.accessToken = ownerToken ?? undefined;
    api.session.tenant.userId = ownerUserId;

    // 6. Owner can delete
    const { data: deleteData } = await api.admin.mutation('iam-api/OrganizationDelete', {
      variables: {
        id: organizationId,
      },
    });

    expect(deleteData.organizationMutation.organizationDelete.deletedOrganizationId).toBeDefined();
  });

  test('Admin cannot access org.profile.delete action', async ({ api }) => {
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

    // Invite admin
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

    // Switch to admin
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    // Admin should NOT have delete permission
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'admin' },
      },
    });

    expect(authData.userQuery.authorize.allowed).toBe(false);
  });

  test('Owner has org.profile.delete action via bypass', async ({ api }) => {
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

    // Owner should have delete permission via bypass
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'admin' },
      },
    });

    expect(authData.userQuery.authorize.allowed).toBe(true);
  });
});
