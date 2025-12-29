import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Owner Assignment (FR-4.1)
 *
 * Tests for organization owner assignment on creation.
 */
test.describe('Owner Assignment', () => {
  test('Organization creator should be marked as owner (is_owner=true)', async ({ api }) => {
    // 1. Create user and organization
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

    // 2. Query organization members
    const { data: membersData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    // 3. Verify creator is marked as owner
    const members = membersData.organizationQuery.organization?.membership?.members ?? [];
    expect(members).toHaveLength(1);
    expect(members[0].isOwner).toBe(true);
    // Creator grants themselves the role, so grantedBy is their own userId
    expect(members[0].grantedBy?.id).toBe(api.session.tenant.userId);
  });

  test('Each organization should have exactly one owner', async ({ api }) => {
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

    // 2. Invite another user as admin
    const secondUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: secondUser.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Query all members and count owners
    const { data: membersData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const members = membersData.organizationQuery.organization?.membership?.members ?? [];
    const owners = members.filter((m) => m.isOwner);
    expect(owners).toHaveLength(1); // Exactly one owner
  });
});
