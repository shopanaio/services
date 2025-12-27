import { test } from '@fixtures/base.extend';
import { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateStoreSlug = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;
const generateOrgSlug = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateEmail = () => `test-${crypto.randomUUID()}@playwright.dev`;

interface OwnerContext {
  userId: string;
  accessToken: string;
  organizationId: string;
  storeAId: string;
  storeASlug: string;
  storeBId: string;
  storeBSlug: string;
}

interface InvitedUserContext {
  userId: string;
  accessToken: string;
  email: string;
}

/**
 * Store-Level Domain Isolation Tests
 *
 * Verifies that domain-scoped roles properly isolate access between
 * different stores within the same organization.
 *
 * Domain format:
 * - "store:{storeId}" - access to specific store only
 *
 * Setup for each test:
 * - Owner creates organization with Store A and Store B
 * - Invites users with store-specific roles
 * - Tests verify domain boundary enforcement
 */
test.describe('Store-Level Domain Isolation', () => {
  let owner: OwnerContext;

  test.beforeEach(async ({ api }) => {
    // Create Owner
    const ownerSession = await api.admin.user.create();
    api.session.tenant.accessToken = ownerSession.accessToken;
    api.session.tenant.userId = ownerSession.userId;

    // Owner creates Organization
    const orgSlug = generateOrgSlug();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'Test Organization',
          slug: orgSlug,
        },
      },
    });
    const organization = orgData.organizationMutation.organizationCreate.organization;
    if (!organization) {
      throw new Error('Failed to create organization');
    }

    // Owner creates Store A
    const storeASlug = generateStoreSlug();
    const { data: storeAData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId: organization.id,
          name: 'Store A',
          slug: storeASlug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });
    const storeA = storeAData.storeMutation.storeCreate.store;
    if (!storeA) {
      throw new Error('Failed to create Store A');
    }

    // Owner creates Store B
    const storeBSlug = generateStoreSlug();
    const { data: storeBData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId: organization.id,
          name: 'Store B',
          slug: storeBSlug,
          locales: ['en'],
          currencies: ['EUR'],
          defaultCurrency: 'EUR',
        },
      },
    });
    const storeB = storeBData.storeMutation.storeCreate.store;
    if (!storeB) {
      throw new Error('Failed to create Store B');
    }

    owner = {
      userId: ownerSession.userId,
      accessToken: ownerSession.accessToken,
      organizationId: organization.id,
      storeAId: storeA.id,
      storeASlug,
      storeBId: storeB.id,
      storeBSlug,
    };
  });

  /**
   * Helper to create and invite a new user with specified roles
   */
  async function inviteUserWithRoles(
    api: ApiFixtures['api'],
    roles: { domain: string; role: string }[],
  ): Promise<InvitedUserContext> {
    // Create a new user
    const email = generateEmail();
    const userSession = await api.admin.user.create({ email, password: 'StrongPassword123' });

    // Switch back to owner to invite
    api.session.tenant.accessToken = owner.accessToken;
    api.session.tenant.userId = owner.userId;
    api.session.organizationId = owner.organizationId;

    // Invite user with specified roles
    const { data, errors } = await api.admin.mutation('iam-api/MemberInvite', {
      throwOnError: false,
      variables: {
        input: {
          organizationId: owner.organizationId,
          email,
          roles,
        },
      },
    });

    if (errors && errors.length > 0) {
      throw new Error(`Failed to invite user: ${errors[0].message}`);
    }

    if (data.organizationMutation.memberInvite.userErrors.length > 0) {
      throw new Error(
        `Failed to invite user: ${data.organizationMutation.memberInvite.userErrors[0].message}`,
      );
    }

    return {
      userId: userSession.userId,
      accessToken: userSession.accessToken,
      email,
    };
  }

  test('User with store-A role cannot access store-B data', async ({ api }) => {
    // Invite user with role only in Store A
    const user = await inviteUserWithRoles(api, [
      { domain: `store:${owner.storeAId}`, role: 'viewer' },
    ]);

    // Switch to invited user
    api.session.tenant.accessToken = user.accessToken;
    api.session.tenant.userId = user.userId;

    // User CAN access Store A
    api.session.project = { id: owner.storeAId, slug: owner.storeASlug, name: 'Store A' };
    const { data: storeAData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(storeAData.storeQuery.currentStore).not.toBeNull();
    expect(storeAData.storeQuery.currentStore?.id).toBe(owner.storeAId);

    // User CANNOT access Store B
    api.session.project = { id: owner.storeBId, slug: owner.storeBSlug, name: 'Store B' };
    const { data: storeBData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(storeBData.storeQuery.currentStore).toBeNull();
  });

  test('User with store-A role cannot modify store-B', async ({ api }) => {
    // Invite user with editor role only in Store A
    const user = await inviteUserWithRoles(api, [
      { domain: `store:${owner.storeAId}`, role: 'manager' },
    ]);

    // Switch to invited user
    api.session.tenant.accessToken = user.accessToken;
    api.session.tenant.userId = user.userId;
    api.session.organizationId = owner.organizationId;

    // User tries to update Store B (set context to Store B)
    api.session.project = { id: owner.storeBId, slug: owner.storeBSlug, name: 'Store B' };
    const { data, errors } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Hacked Store B',
        },
      },
    });

    // Update should fail - either GraphQL error, null store, or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else if (data) {
      const result = data.storeMutation.storeUpdate;
      const updateFailed = result.store === null || result.userErrors.length > 0;
      expect(updateFailed).toBe(true);
    }

    // Verify Store B was not modified by switching to owner
    api.session.tenant.accessToken = owner.accessToken;
    api.session.tenant.userId = owner.userId;
    api.session.project = { id: owner.storeBId, slug: owner.storeBSlug, name: 'Store B' };

    const { data: verifyData } = await api.admin.query('project-api/Project', {});
    expect(verifyData.storeQuery.currentStore?.name).toBe('Store B');
  });

  test('Store-specific permissions are isolated per store', async ({ api }) => {
    // Invite user with editor role in Store A (we'll verify they can't edit Store B)
    const user = await inviteUserWithRoles(api, [
      { domain: `store:${owner.storeAId}`, role: 'manager' },
    ]);

    // Switch to invited user
    api.session.tenant.accessToken = user.accessToken;
    api.session.tenant.userId = user.userId;

    // User CAN update Store A
    api.session.project = { id: owner.storeAId, slug: owner.storeASlug, name: 'Store A' };
    api.session.organizationId = owner.organizationId;
    const { data: updateAData, errors: updateAErrors } = await api.admin.mutation(
      'project-api/ProjectUpdate',
      {
        throwOnError: false,
        variables: {
          input: {
            name: 'Store A Updated',
          },
        },
      },
    );

    expect(updateAErrors).toBeUndefined();
    expect(updateAData).toBeDefined();
    const updateAResult = updateAData.storeMutation.storeUpdate;
    expect(updateAResult.store).not.toBeNull();
    expect(updateAResult.store?.name).toBe('Store A Updated');

    // User CANNOT update Store B (even with project context set to B)
    api.session.project = { id: owner.storeBId, slug: owner.storeBSlug, name: 'Store B' };
    const { data: updateBData, errors: updateBErrors } = await api.admin.mutation(
      'project-api/ProjectUpdate',
      {
        throwOnError: false,
        variables: {
          input: {
            name: 'Store B Updated',
          },
        },
      },
    );

    if (updateBErrors && updateBErrors.length > 0) {
      expect(updateBErrors.length).toBeGreaterThan(0);
    } else {
      const updateBResult = updateBData.storeMutation.storeUpdate;
      const updateBFailed = updateBResult.store === null || updateBResult.userErrors.length > 0;
      expect(updateBFailed).toBe(true);
    }
  });

  test('User with multiple store-specific roles has access to only those stores', async ({
    api,
  }) => {
    // Owner creates Store C
    api.session.tenant.accessToken = owner.accessToken;
    const storeCSlug = generateStoreSlug();
    const { data: storeCData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId: owner.organizationId,
          name: 'Store C',
          slug: storeCSlug,
          locales: ['en'],
          currencies: ['GBP'],
          defaultCurrency: 'GBP',
        },
      },
    });
    const storeC = storeCData.storeMutation.storeCreate.store;
    if (!storeC) {
      throw new Error('Failed to create Store C');
    }

    // Invite user with roles in Store A and Store C only (not Store B)
    const user = await inviteUserWithRoles(api, [
      { domain: `store:${owner.storeAId}`, role: 'manager' },
      { domain: `store:${storeC.id}`, role: 'viewer' },
    ]);

    // Switch to invited user
    api.session.tenant.accessToken = user.accessToken;
    api.session.tenant.userId = user.userId;

    // User CAN access Store A
    api.session.project = { id: owner.storeAId, slug: owner.storeASlug, name: 'Store A' };
    const { data: storeAData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(storeAData.storeQuery.currentStore).not.toBeNull();

    // User CAN access Store C
    api.session.project = { id: storeC.id, slug: storeCSlug, name: 'Store C' };
    const { data: storeCQueryData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(storeCQueryData.storeQuery.currentStore).not.toBeNull();

    // User CANNOT access Store B
    api.session.project = { id: owner.storeBId, slug: owner.storeBSlug, name: 'Store B' };
    const { data: storeBData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(storeBData.storeQuery.currentStore).toBeNull();
  });

  test('User stores list shows only stores they have access to', async ({ api }) => {
    // Invite user with role only in Store A
    const user = await inviteUserWithRoles(api, [
      { domain: `store:${owner.storeAId}`, role: 'manager' },
    ]);

    // Switch to invited user
    api.session.tenant.accessToken = user.accessToken;
    api.session.tenant.userId = user.userId;
    api.session.organizationId = owner.organizationId;

    // Get list of stores user can access
    const { data } = await api.admin.query('project-api/Projects', {
      throwOnError: false,
      variables: {
        organizationId: owner.organizationId,
      },
    });

    const stores = data.storeQuery.stores;
    const storeIds = stores.map((s: { id: string }) => s.id);

    // User should only see Store A, not Store B
    expect(storeIds).toContain(owner.storeAId);
    expect(storeIds).not.toContain(owner.storeBId);
  });

  test('User cannot delete store they have no access to', async ({ api }) => {
    // Invite user with role only in Store A
    const user = await inviteUserWithRoles(api, [
      { domain: `store:${owner.storeAId}`, role: 'owner' },
    ]);

    // Switch to invited user
    api.session.tenant.accessToken = user.accessToken;
    api.session.tenant.userId = user.userId;
    api.session.organizationId = owner.organizationId;
    api.session.project = { id: owner.storeAId, slug: owner.storeASlug, name: 'Store A' };

    // User tries to delete Store B
    const { data, errors } = await api.admin.mutation('project-api/ProjectDelete', {
      throwOnError: false,
      variables: {
        input: {
          id: owner.storeBId,
        },
      },
    });

    // Delete should fail
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeDelete;
      const deleteFailed = result.deletedStoreId === null || result.userErrors.length > 0;
      expect(deleteFailed).toBe(true);
    }

    // Verify Store B still exists by switching to owner
    api.session.tenant.accessToken = owner.accessToken;
    api.session.tenant.userId = owner.userId;
    api.session.project = { id: owner.storeBId, slug: owner.storeBSlug, name: 'Store B' };

    const { data: verifyData } = await api.admin.query('project-api/Project', {});
    expect(verifyData.storeQuery.currentStore).not.toBeNull();
    expect(verifyData.storeQuery.currentStore?.id).toBe(owner.storeBId);
  });
});
