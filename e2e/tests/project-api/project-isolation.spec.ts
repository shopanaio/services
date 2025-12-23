import { test as base } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;

interface UserSession {
  email: string;
  password: string;
  accessToken: string;
}

const test = base.extend<{
  userA: UserSession;
  userB: UserSession;
}>({
  userA: async ({ api }, use) => {
    // Setup first user
    const result = await api.session.setupUser();
    await use({
      email: api.session.tenant.data.email,
      password: api.session.tenant.data.password,
      accessToken: result.token?.accessToken ?? '',
    });
  },
  userB: async ({ api }, use) => {
    // Create second user with new credentials
    const { generateUser } = await import('@utils/user');
    const userData = generateUser();

    const { data } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: userData.email,
          password: userData.password,
        },
      },
    });

    const result = data.userMutation.signUp;
    await use({
      email: userData.email,
      password: userData.password,
      accessToken: result.token?.accessToken ?? '',
    });
  },
});

test.describe('Project Isolation', () => {
  test('User cannot access projects of another user via project query', async ({ api, userA, userB }) => {
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    // User A creates a project
    api.session.tenant.accessToken = userA.accessToken;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project A',
          slug: slugA,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // User B creates a project
    api.session.tenant.accessToken = userB.accessToken;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project B',
          slug: slugB,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // User B tries to access User A's project - should fail or return null
    // Set project slug to User A's project while authenticated as User B
    api.session.project = { slug: slugA, id: '' } as typeof api.session.project;

    const { data: projectData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: {
        slug: slugA,
      },
    });

    // User B should NOT be able to see User A's project
    // Either data is null (error) or project is null (access denied)
    expect(projectData?.projectQuery?.project ?? null).toBeNull();
  });

  test.skip('User cannot see other users projects in projects list', async ({ api, userA, userB }) => {
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    // User A creates a project
    api.session.tenant.accessToken = userA.accessToken;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project A',
          slug: slugA,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // User B creates a project
    api.session.tenant.accessToken = userB.accessToken;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project B',
          slug: slugB,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // User B gets list of projects - should only see their own
    const { data: projectsData } = await api.admin.query('project-api/Projects', {
      variables: {},
    });

    const projects = projectsData.projectQuery.projects;
    const projectSlugs = projects.map((p: { slug: string }) => p.slug);

    // User B should see their own project
    expect(projectSlugs).toContain(slugB);

    // User B should NOT see User A's project
    expect(projectSlugs).not.toContain(slugA);
  });

  test('User can only access their own project', async ({ api, userA }) => {
    const slug = generateProjectSlug();

    // User A creates a project
    api.session.tenant.accessToken = userA.accessToken;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'My Project',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Set project slug for subsequent queries
    api.session.project = { slug, id: '' } as typeof api.session.project;

    // User A should be able to access their own project
    const { data: projectData } = await api.admin.query('project-api/Project', {
      variables: {
        slug,
      },
    });

    expect(projectData.projectQuery.project).not.toBeNull();
    expect(projectData.projectQuery.project?.slug).toBe(slug);
    expect(projectData.projectQuery.project?.name).toBe('My Project');
  });
});
