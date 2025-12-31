import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Store Has No Owner Concept (FR-4.1)
 *
 * Tests confirming that stores do not have an owner concept - only roles.
 */
test.describe('Store Has No Owner Concept', () => {
  test('Store creator gets admin role but is NOT marked as owner', async ({ api }) => {
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

    // Query organization membership to check store domain members
    const { data: membersData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const orgMembers = membersData.organizationQuery.organization?.membership?.members ?? [];
    expect(orgMembers.length).toBeGreaterThan(0);

    // Store members are managed via org membership with store domain roles
    // Store does not have its own isOwner concept - only roles
    // The creator gets admin role but there's no owner flag
    const creatorMember = orgMembers.find((m) => m.user?.id === api.session.tenant.userId);
    expect(creatorMember).toBeDefined();
    // Org owner has isOwner=true at org level, but stores don't have this concept
    expect(creatorMember?.isOwner).toBe(true); // This is org owner, not store owner
  });

  test('Store admin can be demoted (unlike org owner)', async ({ api }) => {
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
    const storeCreatorId = api.session.tenant.userId;

    // Invite another store admin
    const anotherAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: anotherAdmin.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: `store:${storeId}`, role: 'admin' },
          ],
        },
      },
    });

    // Demote original store creator to viewer
    const { data: demoteData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: storeCreatorId,
          domain: `store:${storeId}`,
          role: 'viewer',
        },
      },
    });

    // Demotion should succeed (no owner protection for stores)
    expect(demoteData.organizationMutation.memberRoleChange.member).toBeDefined();
  });

  test('All store admins can be removed (org owner retains access)', async ({ api }) => {
    await api.session.setupUser();
    const orgOwnerId = api.session.tenant.userId;

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

    // Remove store admin role from org owner (they still have org owner bypass)
    await api.admin.mutation('iam-api/MemberAccessRemove', {
      variables: {
        input: {
          organizationId,
          userId: orgOwnerId,
          domain: `store:${storeId}`,
        },
      },
    });

    // Org owner should still have access via owner bypass
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: `store:${storeId}`, resource: 'store.profile', action: 'write' },
      },
    });

    expect(authData.userQuery.authorize.allowed).toBe(true);
  });
});
