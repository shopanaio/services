import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Owner Protection (FR-4.1)
 *
 * Tests that organization owner cannot be removed or demoted.
 */
test.describe('Owner Protection', () => {
  test('Owner cannot be removed from organization', async ({ api }) => {
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
    const ownerId = api.session.tenant.userId;

    // Attempt to remove owner should fail
    const { data } = await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: ownerId,
        },
      },
    });

    const userErrors = data.organizationMutation.memberRemove.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('owner');
    expect(data.organizationMutation.memberRemove.removedMemberId).toBeNull();
  });

  test('Owner cannot be demoted to member role', async ({ api }) => {
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
    const ownerId = api.session.tenant.userId;

    // Attempt to change owner's role should fail
    const { data } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: ownerId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    const userErrors = data.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('owner');
    expect(data.organizationMutation.memberRoleChange.member).toBeNull();
  });

  // Skipped: OwnershipRemove mutation does not exist in schema
  // Owner can only be changed via OwnershipTransfer mutation
  test.skip('Owner cannot remove their own owner status without transfer', async () => {
    // This test is skipped because OwnershipRemove mutation is not implemented
    // The constraint is enforced by only having OwnershipTransfer mutation
  });
});
