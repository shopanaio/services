import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Owner Bypass Authorization (FR-4.1)
 *
 * Tests that organization owner bypasses all authorization checks within the organization.
 */
test.describe('Owner Bypass Authorization', () => {
  test('Owner should bypass all authorization checks within organization', async ({ api }) => {
    // Owner has implicit access to EVERYTHING in the org, no RBAC check needed
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

    // Create a store
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

    // Owner should have access to ALL resources (bypass RBAC)
    const allActions = [
      // Org level
      { domain: 'org', resource: 'org.profile', action: 'read' },
      { domain: 'org', resource: 'org.profile', action: 'write' },
      { domain: 'org', resource: 'org.profile', action: 'admin' }, // Owner exclusive
      { domain: 'org', resource: 'org.members', action: 'read' },
      { domain: 'org', resource: 'org.members', action: 'write' },
      { domain: 'org', resource: 'org.members', action: 'admin' },
      { domain: 'org', resource: 'org.roles', action: 'read' },
      { domain: 'org', resource: 'org.roles', action: 'write' },
      { domain: 'org', resource: 'org.stores', action: 'write' },
      { domain: 'org', resource: 'org.stores', action: 'admin' },
      // Store level (owner bypasses even without store role)
      { domain: storeDomain, resource: 'store.profile', action: 'read' },
      { domain: storeDomain, resource: 'store.profile', action: 'write' },
      { domain: storeDomain, resource: 'store.members', action: 'read' },
      { domain: storeDomain, resource: 'store.members', action: 'write' },
      { domain: storeDomain, resource: 'store.access', action: 'write' },
    ];

    for (const { domain, resource, action } of allActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain, resource, action },
        },
      });

      expect(
        authData.userQuery.authorize.allowed,
        `Owner should bypass and be allowed: ${domain}/${resource}.${action}`,
      ).toBe(true);
    }
  });

  test('Owner should have access to stores even without explicit store role', async ({ api }) => {
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
    api.session.organizationId = organizationId;

    // 2. Create another user who will create the store
    const storeCreator = await api.admin.user.create();

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: storeCreator.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // 3. Switch to store creator and create store
    api.session.tenant.accessToken = storeCreator.accessToken;
    api.session.tenant.userId = storeCreator.userId;

    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Store Created By Other Admin',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    const storeDomain = store?.membership?.domain;

    // 4. Switch back to owner (who has NO explicit store role)
    api.session.tenant.accessToken = ownerToken ?? undefined;
    api.session.tenant.userId = ownerUserId;

    // 5. Owner should still have full access via bypass
    const storeActions = [
      { resource: 'store.profile', action: 'read' },
      { resource: 'store.profile', action: 'write' },
      { resource: 'store.members', action: 'read' },
      { resource: 'store.members', action: 'write' },
      { resource: 'store.members', action: 'admin' },
      { resource: 'store.roles', action: 'read' },
      { resource: 'store.access', action: 'write' },
    ];

    for (const { resource, action } of storeActions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: storeDomain, resource, action },
        },
      });

      expect(
        authData.userQuery.authorize.allowed,
        `Owner without store role should bypass: ${resource}.${action}`,
      ).toBe(true);
    }
  });
});
