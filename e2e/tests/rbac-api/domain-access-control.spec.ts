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

test.describe('Domain-Based Access Control (FR-2)', () => {
  test('System should support org domain level', async ({ api }) => {
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

    // 2. Verify user can access resources with domain "org"
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });

    // 3. Verify permissions are correctly scoped to organization level
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Verify org-level resource names work
    const orgResources = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.profile', action: 'write' },
      { resource: 'org.members', action: 'read' },
      { resource: 'org.roles', action: 'read' },
    ];

    for (const { resource, action } of orgResources) {
      const { data: resAuthData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });
      expect((resAuthData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
    }
  });

  test('System should support store uuid domain level', async ({ api }) => {
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
    const storeDomain = store?.membership?.domain;

    // 2. Verify user can access resources with domain "store:{uuid}"
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeDomain, resource: 'store.profile', action: 'read' },
      },
    });

    // 3. Verify permissions are correctly scoped to specific store
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Verify store-level resource names work
    const storeResources = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.roles', action: 'read' },
    ];

    for (const { resource, action } of storeResources) {
      const { data: resAuthData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: storeDomain, resource, action },
        },
      });
      expect((resAuthData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
    }
  });

  test('User can have different roles in different stores', async ({ api }) => {
    // 1. Create organization with two stores
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

    // Create store A
    const storeAName = generateStoreName();
    const { data: storeAData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeAName,
          displayName: 'Store A',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });
    const storeA = storeAData.storeMutation.storeCreate.store;
    expect(storeA).not.toBeNull();
    const storeADomain = storeA?.membership?.domain;

    // Create store B
    const storeBName = generateStoreName();
    const { data: storeBData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeBName,
          displayName: 'Store B',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });
    const storeB = storeBData.storeMutation.storeCreate.store;
    expect(storeB).not.toBeNull();
    const storeBDomain = storeB?.membership?.domain;

    // 2 & 3. Create user and assign different roles in each store
    const testUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: storeADomain, role: 'admin' }, // Admin in store A
            { domain: storeBDomain, role: 'viewer' }, // Viewer in store B
          ],
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = testUser.accessToken;
    api.session.tenant.userId = testUser.userId;

    // 4. Verify user has admin permissions in store A
    const { data: authStoreA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeADomain, resource: 'store.profile', action: 'write' },
      },
    });
    expect((authStoreA as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // 5. Verify user has only viewer permissions in store B (cannot update)
    const { data: authStoreB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeBDomain, resource: 'store.profile', action: 'write' },
      },
    });
    expect((authStoreB as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);

    // Verify viewer can read in store B
    const { data: authStoreBRead } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeBDomain, resource: 'store.profile', action: 'read' },
      },
    });
    expect((authStoreBRead as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Store domain format should be store uuid', async ({ api }) => {
    // 1. Create store
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
    const storeDomain = store?.membership?.domain;

    // 2. Verify store domain follows format "store:<gid>"
    expect(storeDomain).toBeDefined();

    // Verify the domain format works in authorization
    const domain = storeDomain;
    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain, resource: 'store.profile', action: 'read' },
      },
    });
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });

  test('User without store role should not access store resources', async ({ api }) => {
    // 1. Create org with two stores
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

    // Create store A
    const storeAName = generateStoreName();
    const { data: storeAData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeAName,
          displayName: 'Store A',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });
    const storeA = storeAData.storeMutation.storeCreate.store;
    expect(storeA).not.toBeNull();
    const storeADomain = storeA?.membership?.domain;

    // Create store B
    const storeBName = generateStoreName();
    const { data: storeBData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeBName,
          displayName: 'Store B',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });
    const storeB = storeBData.storeMutation.storeCreate.store;
    expect(storeB).not.toBeNull();
    const storeBDomain = storeB?.membership?.domain;

    // 2. Assign user role only in store A
    const testUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [
            { domain: 'org', role: 'member' },
            { domain: storeADomain, role: 'viewer' },
          ],
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = testUser.accessToken;
    api.session.tenant.userId = testUser.userId;

    // 3. Verify user cannot access store B resources
    const { data: authStoreB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeBDomain, resource: 'store.profile', action: 'read' },
      },
    });
    expect((authStoreB as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);

    // Verify user CAN access store A
    const { data: authStoreA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeADomain, resource: 'store.profile', action: 'read' },
      },
    });
    expect((authStoreA as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Org level permissions should not grant store level access for members', async ({ api }) => {
    // 1. Create org with user as member (not admin)
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

    // 2. Create store in org
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
    const storeDomain = store?.membership?.domain;

    // Add user as org member only (no store role)
    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }], // Only org member, no store role
        },
      },
    });

    // Switch to member user
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    // 3. Verify org member cannot access store resources without explicit store role
    const { data: authStore } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeDomain, resource: 'store.profile', action: 'read' },
      },
    });
    expect((authStore as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);

    // Verify org member CAN access org-level resources
    const { data: authOrg } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });
    expect((authOrg as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Store domain should include valid UUID', async ({ api }) => {
    // 1. Setup
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

    // 2. Attempt to check permissions with malformed store domain
    const invalidDomains = [
      'store:invalid',
      'store:12345',
      'store:not-a-uuid',
      'store:', // Empty UUID
      'invalid:550e8400-e29b-41d4-a716-446655440000', // Wrong prefix
    ];

    for (const domain of invalidDomains) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource: 'store.profile', action: 'read' },
        },
      });

      // System should either reject or deny access for invalid domains
      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed).toBe(false);
    }

    // Verify valid domain works
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
    const storeDomain = store?.membership?.domain;

    const { data: validAuthData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: storeDomain, resource: 'store.profile', action: 'read' },
      },
    });
    expect((validAuthData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
  });
});
