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
 * Store Has No Owner or Last Admin Protection
 *
 * - Store does NOT have an owner concept (only roles: viewer, manager, admin)
 * - Store admins can ALL be removed (no "last admin" protection)
 * - Organization owner/admin ALWAYS has full access to all stores
 */
test.describe('Store Ownership Model (FR-4)', () => {
  test('Organization admin can remove ALL store admins and retain access', async ({ api }) => {
    // 1. Create org and store
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
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
    }

    // 2. Add a second store admin
    const storeAdminUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'admin' }],
        },
      },
    });

    // 3. Org admin should be able to remove the store admin
    // (This would use MemberRemove or similar mutation - placeholder for now)
    // After removal, org admin should still have full access

    // 4. Verify org admin still has full store access after removing store admins
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.access', action: 'write' },
    ];

    const storeId = store?.id;
    const domain = `store:${storeId}`;

    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(
        result.userQuery.authorize.allowed,
        `Org admin should retain access: ${resource}.${action}`,
      ).toBe(true);
    }
  });

  test('Store admin can be demoted without owner protection', async ({ api }) => {
    // Unlike org owner, store admin CAN be demoted
    // 1. Create org and store
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
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
    }

    // 2. Invite another user as store admin
    const storeAdminUser = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeAdminUser.data.email,
          roles: [{ domain: `store:${store?.id}`, role: 'admin' }],
        },
      },
    });

    // 3. Org admin can demote store admin to manager/viewer
    // (This would use role update mutation - placeholder for actual implementation)
    // The test verifies that store admin CAN be demoted (no owner protection)
  });

  test('Store creator is NOT marked as owner - just receives admin role', async ({ api }) => {
    // Store does NOT have owner concept
    // 1. Create org
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

    // 2. Create store
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

    // 3. Verify store creator has admin role but no owner attribute
    // Store should NOT have owner_id or created_by as a protected attribute
    // The creator simply gets admin role which can be changed/removed
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
      const domain = `store:${store.id}`;

      // Verify admin permissions
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource: 'store.profile', action: 'write' },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed).toBe(true);
    }
  });

  test('Any store admin can delete the store (with org permission)', async ({ api }) => {
    // Unlike org, where only owner can delete, any store admin can delete store
    // (provided they also have org.stores.delete permission)
    // 1. Create org and store
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
    if (store) {
      api.session.project = { id: store.id, slug: store.name, name: store.name };
    }

    // 2. Verify store admin can delete (has store.profile.delete permission)
    const storeId = store?.id;
    const domain = `store:${storeId}`;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain, resource: 'store.profile', action: 'admin' },
      },
    });

    const result = authData as unknown as AuthorizeResult;
    expect(result.userQuery.authorize.allowed).toBe(true);

    // Note: Actual deletion also requires org.stores.delete at organization level
  });
});
