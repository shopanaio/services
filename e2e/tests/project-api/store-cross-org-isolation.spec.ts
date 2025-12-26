import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateStoreSlug = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;
const generateOrgSlug = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

interface UserContext {
  userId: string;
  accessToken: string;
  organizationId: string;
  storeId: string;
  storeSlug: string;
}

/**
 * Cross-Organization Store Isolation Tests
 *
 * Verifies that stores from one organization are completely inaccessible
 * to users from other organizations. This is a critical security boundary.
 *
 * Setup for each test:
 * - User A creates organization A with store A
 * - User B creates organization B with store B
 * - Tests verify User A cannot access Store B and vice versa
 */
test.describe('Cross-Organization Store Isolation', () => {
  let userA: UserContext;
  let userB: UserContext;

  test.beforeEach(async ({ api }) => {
    // Create User A
    const userASession = await api.admin.user.create();
    api.session.tenant.accessToken = userASession.accessToken;
    api.session.tenant.userId = userASession.userId;

    // User A creates Organization A
    const orgASlug = generateOrgSlug();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Organization A',
          slug: orgASlug,
        },
      },
    });
    const organizationA = orgAData.organizationMutation.organizationCreate.organization;
    if (!organizationA) {
      throw new Error('Failed to create Organization A');
    }
    const organizationAId = organizationA.id;

    // User A creates Store A
    const storeASlug = generateStoreSlug();

    const { data: storeAData, errors: storeAErrors } = await api.admin.mutation(
      'project-api/ProjectCreate',
      {
        throwOnError: false,
        variables: {
          input: {
            organizationId: organizationAId,
            name: 'Store A',
            slug: storeASlug,
            locales: ['en'],
            currencies: ['USD'],
            defaultCurrency: 'USD',
          },
        },
      },
    );

    const storeA = storeAData.storeMutation.storeCreate.store;
    if (!storeA) {
      const userErrors = storeAData.storeMutation?.storeCreate?.userErrors;
      throw new Error('Failed to create Store A');
    }

    userA = {
      userId: userASession.userId,
      accessToken: userASession.accessToken,
      organizationId: organizationAId,
      storeId: storeA.id,
      storeSlug: storeASlug,
    };

    // DEBUG: Try querying the store immediately after creation
    api.session.project = { id: storeA.id, slug: storeASlug, name: 'Store A' };
    const debugQuery = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: { slug: storeASlug },
    });

    // Create User B
    const userBSession = await api.admin.user.create();
    api.session.tenant.accessToken = userBSession.accessToken;
    api.session.tenant.userId = userBSession.userId;

    // User B creates Organization B
    const orgBSlug = generateOrgSlug();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'Organization B',
          slug: orgBSlug,
        },
      },
    });
    const organizationB = orgBData.organizationMutation.organizationCreate.organization;
    if (!organizationB) {
      throw new Error('Failed to create Organization B');
    }
    const organizationBId = organizationB.id;

    // User B creates Store B
    const storeBSlug = generateStoreSlug();
    const { data: storeBData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId: organizationBId,
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

    userB = {
      userId: userBSession.userId,
      accessToken: userBSession.accessToken,
      organizationId: organizationBId,
      storeId: storeB.id,
      storeSlug: storeBSlug,
    };
  });

  test('User cannot access stores from other organization via query', async ({ api }) => {
    // Switch to User A with their store as context
    api.session.tenant.accessToken = userA.accessToken;
    api.session.project = { id: userA.storeId, slug: userA.storeSlug, name: 'Store A' };

    console.log('userA:', userA);
    console.log('session.projectSlug:', api.session.projectSlug);
    console.log('session.accessToken:', api.session.accessToken?.slice(0, 20) + '...');

    // User A CAN access their own Store A
    const { data: ownStoreData, errors } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: {
        slug: userA.storeSlug,
      },
    });
    console.log('ownStoreData:', JSON.stringify(ownStoreData, null, 2));
    console.log('errors:', JSON.stringify(errors, null, 2));
    expect(ownStoreData.storeQuery.store).not.toBeNull();
    expect(ownStoreData.storeQuery.store?.id).toBe(userA.storeId);

    // User A CANNOT access Store B from another organization
    const { data } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: {
        slug: userB.storeSlug,
      },
    });
    expect(data.storeQuery.store).toBeNull();
  });

  test('User cannot see other organization stores in stores list', async ({ api }) => {
    // Switch to User A with their store as context (needed for organizationId)
    api.session.tenant.accessToken = userA.accessToken;
    api.session.project = { id: userA.storeId, slug: userA.storeSlug, name: 'Store A' };

    // User A gets list of all stores
    const { data } = await api.admin.query('project-api/Projects', {
      variables: {},
    });

    const stores = data.storeQuery.stores;
    const storeIds = stores.map((s: { id: string }) => s.id);
    const storeSlugs = stores.map((s: { slug: string }) => s.slug);

    // User A should only see Store A, not Store B
    expect(storeIds).toContain(userA.storeId);
    expect(storeIds).not.toContain(userB.storeId);
    expect(storeSlugs).toContain(userA.storeSlug);
    expect(storeSlugs).not.toContain(userB.storeSlug);
  });

  test('User cannot query store by slug from other organization', async ({ api }) => {
    // Switch to User B
    api.session.tenant.accessToken = userB.accessToken;

    // User B tries to query Store A by slug
    const { data } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: {
        slug: userA.storeSlug,
      },
    });

    // Store A should not be found in User B's context
    expect(data.storeQuery.store).toBeNull();
  });

  test('User cannot update store from other organization', async ({ api }) => {
    // Switch to User A with their store as context
    api.session.tenant.accessToken = userA.accessToken;
    api.session.project = { id: userA.storeId, slug: userA.storeSlug, name: 'Store A' };

    // User A tries to update Store B
    const { data, errors } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: {
          id: userB.storeId,
          name: 'Hacked Store B',
        },
      },
    });

    // Update should fail - either GraphQL error, null store, or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeUpdate;
      const updateFailed = result.store === null || result.userErrors.length > 0;
      expect(updateFailed).toBe(true);
    }

    // Verify Store B was not actually modified by switching to User B
    api.session.tenant.accessToken = userB.accessToken;
    api.session.project = { id: userB.storeId, slug: userB.storeSlug, name: 'Store B' };
    const { data: verifyData } = await api.admin.query('project-api/Project', {
      variables: {
        slug: userB.storeSlug,
      },
    });

    const verifiedStore = verifyData.storeQuery.store;
    expect(verifiedStore).not.toBeNull();
    expect(verifiedStore?.name).toBe('Store B');
  });

  test('User cannot delete store from other organization', async ({ api }) => {
    // Switch to User A with their store as context
    api.session.tenant.accessToken = userA.accessToken;
    api.session.project = { id: userA.storeId, slug: userA.storeSlug, name: 'Store A' };

    // User A tries to delete Store B
    const { data, errors } = await api.admin.mutation('project-api/ProjectDelete', {
      throwOnError: false,
      variables: {
        input: {
          id: userB.storeId,
        },
      },
    });

    // Delete should fail - either GraphQL error, null deletedStoreId, or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeDelete;
      const deleteFailed = result.deletedStoreId === null || result.userErrors.length > 0;
      expect(deleteFailed).toBe(true);
    }

    // Verify Store B still exists by switching to User B
    api.session.tenant.accessToken = userB.accessToken;
    api.session.project = { id: userB.storeId, slug: userB.storeSlug, name: 'Store B' };
    const { data: verifyData } = await api.admin.query('project-api/Project', {
      variables: {
        slug: userB.storeSlug,
      },
    });

    const verifiedStore = verifyData.storeQuery.store;
    expect(verifiedStore).not.toBeNull();
    expect(verifiedStore?.id).toBe(userB.storeId);
  });

  test('Stores list is isolated between organizations - bidirectional check', async ({ api }) => {
    // User A should only see stores from Org A
    api.session.tenant.accessToken = userA.accessToken;
    api.session.project = { id: userA.storeId, slug: userA.storeSlug, name: 'Store A' };
    const { data: userAStores } = await api.admin.query('project-api/Projects', {
      variables: {},
    });

    const userAStoreIds = userAStores.storeQuery.stores.map((s: { id: string }) => s.id);
    expect(userAStoreIds).toContain(userA.storeId);
    expect(userAStoreIds).not.toContain(userB.storeId);

    // User B should only see stores from Org B
    api.session.tenant.accessToken = userB.accessToken;
    api.session.project = { id: userB.storeId, slug: userB.storeSlug, name: 'Store B' };
    const { data: userBStores } = await api.admin.query('project-api/Projects', {
      variables: {},
    });

    const userBStoreIds = userBStores.storeQuery.stores.map((s: { id: string }) => s.id);
    expect(userBStoreIds).toContain(userB.storeId);
    expect(userBStoreIds).not.toContain(userA.storeId);
  });

  test('User cannot create store in other organization', async ({ api }) => {
    // Switch to User A
    api.session.tenant.accessToken = userA.accessToken;

    // User A tries to create a store in Organization B
    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId: userB.organizationId,
          name: 'Unauthorized Store',
          slug: generateStoreSlug(),
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Creation should fail
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });
});
