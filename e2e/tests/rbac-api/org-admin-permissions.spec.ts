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

test.describe('Organization Admin Permissions (FR-4)', () => {
  test('Org admin should have full control within the organization', async ({ api }) => {
    // 1. Create organization (user becomes admin)
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

    // 2. Verify admin can perform all org actions via authorize checks
    const orgActions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.profile', action: 'update' },
      { resource: 'org.members', action: 'read' },
      { resource: 'org.members', action: 'invite' },
      { resource: 'org.members', action: 'update' },
      { resource: 'org.members', action: 'remove' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.roles', action: 'create' },
      { resource: 'org.roles', action: 'update' },
      { resource: 'org.roles', action: 'delete' },
      { resource: 'org.stores', action: 'create' },
      { resource: 'org.stores', action: 'read' },
      { resource: 'org.access', action: 'read' },
      { resource: 'org.access', action: 'grant' },
      { resource: 'org.access', action: 'revoke' },
    ];

    // Set organizationId in session for authorization context
    api.session.organizationId = organizationId;

    for (const { resource, action } of orgActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Admin should be allowed: ${resource}.${action}`).toBe(
        true,
      );
    }
  });

  test('Org member should have basic organization access only', async ({ api }) => {
    // 1. Create organization as first user (admin)
    await api.session.setupUser();
    const adminToken = api.session.accessToken;

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

    // 2. Create second user to be invited as member
    const secondUser = await api.admin.user.create();

    // 3. Invite user as member
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: secondUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Switch to member context
    api.session.tenant.accessToken = secondUser.accessToken;
    api.session.tenant.userId = secondUser.userId;

    // 5. Verify member can read org.profile and org.members
    const allowedActions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.members', action: 'read' },
    ];

    for (const { resource, action } of allowedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Member should be allowed: ${resource}.${action}`).toBe(
        true,
      );
    }

    // 6. Verify member cannot perform admin actions
    const deniedActions = [
      { resource: 'org.profile', action: 'update' },
      { resource: 'org.members', action: 'invite' },
      { resource: 'org.members', action: 'update' },
      { resource: 'org.members', action: 'remove' },
      { resource: 'org.roles', action: 'read' },
      { resource: 'org.roles', action: 'create' },
      { resource: 'org.roles', action: 'update' },
      { resource: 'org.roles', action: 'delete' },
      { resource: 'org.stores', action: 'create' },
      { resource: 'org.access', action: 'grant' },
      { resource: 'org.access', action: 'revoke' },
    ];

    for (const { resource, action } of deniedActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      const result = authData as unknown as AuthorizeResult;
      expect(result.userQuery.authorize.allowed, `Member should be denied: ${resource}.${action}`).toBe(
        false,
      );
    }

    // Restore admin token for cleanup
    if (adminToken) {
      api.session.tenant.accessToken = adminToken;
    }
  });

  test('Organization admin should have full access to all stores', async ({ api }) => {
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
    api.session.organizationId = organizationId;

    // 2. Create multiple stores
    const store1Name = generateStoreName();
    const { data: store1Data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: store1Name,
          displayName: 'Store One',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store1 = store1Data.storeMutation.storeCreate.store;
    expect(store1).not.toBeNull();

    const store2Name = generateStoreName();
    const { data: store2Data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: store2Name,
          displayName: 'Store Two',
          locales: ['en'],
          currencies: ['EUR'],
          defaultCurrency: 'EUR',
        },
      },
    });

    const store2 = store2Data.storeMutation.storeCreate.store;
    expect(store2).not.toBeNull();

    // 3. Verify org admin can access all store resources in both stores
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'update' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'invite' },
      { resource: 'store.members', action: 'update' },
      { resource: 'store.members', action: 'remove' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.roles', action: 'create' },
      { resource: 'store.access', action: 'read' },
      { resource: 'store.access', action: 'grant' },
    ];

    // Check access for store1
    if (store1) {
      api.session.project = { id: store1.id, slug: store1.name, name: store1.name };
      for (const { resource, action } of storeActions) {
        const { data: authData } = await api.admin.query('roles-api/Authorize', {
          variables: {
            input: { resource, action },
          },
        });

        const result = authData as unknown as AuthorizeResult;
        expect(
          result.userQuery.authorize.allowed,
          `Org admin should be allowed in store1: ${resource}.${action}`,
        ).toBe(true);
      }
    }

    // Check access for store2
    if (store2) {
      api.session.project = { id: store2.id, slug: store2.name, name: store2.name };
      for (const { resource, action } of storeActions) {
        const { data: authData } = await api.admin.query('roles-api/Authorize', {
          variables: {
            input: { resource, action },
          },
        });

        const result = authData as unknown as AuthorizeResult;
        expect(
          result.userQuery.authorize.allowed,
          `Org admin should be allowed in store2: ${resource}.${action}`,
        ).toBe(true);
      }
    }
  });
});
