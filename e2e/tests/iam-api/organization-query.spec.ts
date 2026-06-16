import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

interface OrganizationsResult {
  organizationQuery: {
    organizations: {
      edges: Array<{
        cursor: string;
        node: {
          id: string;
          name: string;
          displayName: string;
          createdAt: string;
          updatedAt: string | null;
        };
      }>;
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
      };
      totalCount: number;
    };
  };
}

test.describe('Organizations Query', () => {
  test('User can see organizations they created (as admin)', async ({ api }) => {
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

    // 2. Query organizations
    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 3. Verify organization is returned
    expect(orgs.totalCount).toBeGreaterThanOrEqual(1);
    const foundOrg = orgs.edges.find((e) => e.node.id === organization?.id);
    expect(foundOrg).toBeDefined();
    expect(foundOrg?.node.name).toBe(orgName);
    expect(foundOrg?.node.displayName).toBe('Test Organization');
  });

  test('User can see organizations they are invited to as member', async ({ api }) => {
    // 1. Create organization with user A as admin
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Member Test Org',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;

    // 2. Invite user B as member
    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Switch to user B and query organizations
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 4. Verify user B can see the organization
    expect(orgs.totalCount).toBeGreaterThanOrEqual(1);
    const foundOrg = orgs.edges.find((e) => e.node.id === organizationId);
    expect(foundOrg).toBeDefined();
    expect(foundOrg?.node.name).toBe(orgName);
  });

  test('User sees only organizations they have access to', async ({ api }) => {
    // 1. Create org A with user A
    await api.session.setupUser();
    const userAToken = api.session.accessToken;
    const userAId = api.session.tenant.userId;

    const orgAName = generateOrgName();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    const orgA = orgAData.organizationMutation.organizationCreate.organization;
    expect(orgA).not.toBeNull();

    // 2. Create org B with user B
    const userB = await api.admin.user.create();
    api.session.tenant.accessToken = userB.accessToken;
    api.session.tenant.userId = userB.userId;

    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });

    const orgB = orgBData.organizationMutation.organizationCreate.organization;
    expect(orgB).not.toBeNull();

    // 3. Switch back to user A and query organizations
    api.session.tenant.accessToken = userAToken ?? undefined;
    api.session.tenant.userId = userAId;

    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 4. Verify user A sees only org A
    const foundOrgA = orgs.edges.find((e) => e.node.id === orgA?.id);
    expect(foundOrgA).toBeDefined();

    const foundOrgB = orgs.edges.find((e) => e.node.id === orgB?.id);
    expect(foundOrgB).toBeUndefined();
  });

  test('User with multiple organization access sees all of them', async ({ api }) => {
    // 1. Create user and first organization
    await api.session.setupUser();
    const userToken = api.session.accessToken;
    const userId = api.session.tenant.userId;

    const org1Name = generateOrgName();
    const { data: org1Data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: org1Name,
          displayName: 'Organization 1',
        },
      },
    });

    const org1 = org1Data.organizationMutation.organizationCreate.organization;
    expect(org1).not.toBeNull();

    // 2. Create second organization
    const org2Name = generateOrgName();
    const { data: org2Data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: org2Name,
          displayName: 'Organization 2',
        },
      },
    });

    const org2 = org2Data.organizationMutation.organizationCreate.organization;
    expect(org2).not.toBeNull();

    // 3. Create third organization with different user
    const userB = await api.admin.user.create();
    api.session.tenant.accessToken = userB.accessToken;
    api.session.tenant.userId = userB.userId;

    const org3Name = generateOrgName();
    const { data: org3Data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: org3Name,
          displayName: 'Organization 3',
        },
      },
    });

    const org3 = org3Data.organizationMutation.organizationCreate.organization;
    expect(org3).not.toBeNull();

    // Get user A email from the tenant session data
    const userAEmail = api.session.tenant.data.email;

    // Invite user A to org 3 as member
    api.session.tenant.accessToken = userB.accessToken;
    api.session.tenant.userId = userB.userId;

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId: org3?.id,
          email: userAEmail,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Switch back to user A and query organizations
    api.session.tenant.accessToken = userToken ?? undefined;
    api.session.tenant.userId = userId;

    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 5. Verify user A sees all 3 organizations
    expect(orgs.totalCount).toBeGreaterThanOrEqual(3);

    const foundOrg1 = orgs.edges.find((e) => e.node.id === org1?.id);
    const foundOrg2 = orgs.edges.find((e) => e.node.id === org2?.id);
    const foundOrg3 = orgs.edges.find((e) => e.node.id === org3?.id);

    expect(foundOrg1).toBeDefined();
    expect(foundOrg2).toBeDefined();
    expect(foundOrg3).toBeDefined();
  });

  test('Newly created user sees empty organization list', async ({ api }) => {
    // 1. Create user without any organizations
    const newUser = await api.admin.user.create();
    api.session.tenant.accessToken = newUser.accessToken;
    api.session.tenant.userId = newUser.userId;

    // 2. Query organizations
    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 3. Verify empty list
    expect(orgs.totalCount).toBe(0);
    expect(orgs.edges).toHaveLength(0);
  });

  test('Unauthenticated user gets empty organization list', async ({ api }) => {
    // 1. Clear session
    api.session.clearSession();

    // 2. Query organizations
    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 3. Verify empty list
    expect(orgs.totalCount).toBe(0);
    expect(orgs.edges).toHaveLength(0);
  });

  test('Pagination: first parameter limits results', async ({ api }) => {
    // 1. Create user and multiple organizations
    await api.session.setupUser();

    const orgNames: string[] = [];
    for (let i = 0; i < 5; i++) {
      const name = generateOrgName();
      orgNames.push(name);
      await api.admin.mutation('iam-api/OrganizationCreate', {
        variables: {
          input: {
            name,
            displayName: `Organization ${i + 1}`,
          },
        },
      });
    }

    // 2. Query with first=2
    const { data } = await api.admin.query('iam-api/Organizations', {
      variables: { first: 2 },
    });

    const result = data as unknown as OrganizationsResult;
    const orgs = result.organizationQuery.organizations;

    // 3. Verify pagination
    expect(orgs.edges.length).toBe(2);
    expect(orgs.totalCount).toBeGreaterThanOrEqual(5);
    expect(orgs.pageInfo.hasNextPage).toBe(true);
  });

  test('Pagination: cursor-based navigation works', async ({ api }) => {
    // 1. Create user and multiple organizations
    await api.session.setupUser();

    for (let i = 0; i < 4; i++) {
      const name = generateOrgName();
      await api.admin.mutation('iam-api/OrganizationCreate', {
        variables: {
          input: {
            name,
            displayName: `Org ${i + 1}`,
          },
        },
      });
    }

    // 2. Get first page
    const { data: firstPageData } = await api.admin.query('iam-api/Organizations', {
      variables: { first: 2 },
    });

    const firstPage = firstPageData as unknown as OrganizationsResult;
    const firstPageOrgs = firstPage.organizationQuery.organizations;

    expect(firstPageOrgs.edges.length).toBe(2);
    expect(firstPageOrgs.pageInfo.endCursor).toBeDefined();

    // 3. Get second page using cursor
    const { data: secondPageData } = await api.admin.query('iam-api/Organizations', {
      variables: {
        first: 2,
        after: firstPageOrgs.pageInfo.endCursor,
      },
    });

    const secondPage = secondPageData as unknown as OrganizationsResult;
    const secondPageOrgs = secondPage.organizationQuery.organizations;

    expect(secondPageOrgs.edges.length).toBeGreaterThan(0);
    expect(secondPageOrgs.pageInfo.hasPreviousPage).toBe(true);

    // 4. Verify pages have different organizations
    const firstPageIds = firstPageOrgs.edges.map((e) => e.node.id);
    const secondPageIds = secondPageOrgs.edges.map((e) => e.node.id);

    for (const id of secondPageIds) {
      expect(firstPageIds).not.toContain(id);
    }
  });

  test('Different roles see the same organizations they have access to', async ({ api }) => {
    // 1. Create organization with admin user
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Role Test Org',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;

    // 2. Create and invite admin user
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

    // 3. Create and invite member user
    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Verify admin user sees the organization
    api.session.tenant.accessToken = adminUser.accessToken;
    api.session.tenant.userId = adminUser.userId;

    const { data: adminOrgsData } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const adminOrgs = adminOrgsData as unknown as OrganizationsResult;
    const adminFoundOrg = adminOrgs.organizationQuery.organizations.edges.find(
      (e) => e.node.id === organizationId
    );
    expect(adminFoundOrg).toBeDefined();

    // 5. Verify member user sees the organization
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data: memberOrgsData } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const memberOrgs = memberOrgsData as unknown as OrganizationsResult;
    const memberFoundOrg = memberOrgs.organizationQuery.organizations.edges.find(
      (e) => e.node.id === organizationId
    );
    expect(memberFoundOrg).toBeDefined();
  });

  test('User removed from organization no longer sees it', async ({ api }) => {
    // 1. Create organization with admin
    await api.session.setupUser();
    const adminToken = api.session.accessToken;
    const adminId = api.session.tenant.userId;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Removal Test Org',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;

    // 2. Invite user as member
    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 3. Verify member can see organization
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data: beforeRemovalData } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const beforeRemoval = beforeRemovalData as unknown as OrganizationsResult;
    const beforeFoundOrg = beforeRemoval.organizationQuery.organizations.edges.find(
      (e) => e.node.id === organizationId
    );
    expect(beforeFoundOrg).toBeDefined();

    // 4. Admin removes member
    api.session.tenant.accessToken = adminToken ?? undefined;
    api.session.tenant.userId = adminId;

    await api.admin.mutation('iam-api/MemberRemove', {
      variables: {
        input: {
          organizationId,
          userId: memberUser.userId,
        },
      },
    });

    // 5. Verify member no longer sees organization
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const { data: afterRemovalData } = await api.admin.query('iam-api/Organizations', {
      variables: {},
    });

    const afterRemoval = afterRemovalData as unknown as OrganizationsResult;
    const afterFoundOrg = afterRemoval.organizationQuery.organizations.edges.find(
      (e) => e.node.id === organizationId
    );
    expect(afterFoundOrg).toBeUndefined();
  });
});
