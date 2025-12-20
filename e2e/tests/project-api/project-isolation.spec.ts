import { test as base } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';
import { generateUser } from '@utils/user';
import { AdminApiFixture } from '@fixtures/admin/api';
import { ApiUserMutationSignUpArgs } from '@codegen/admin-gql';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;

interface UserSession {
  email: string;
  password: string;
  accessToken: string;
}

async function createUser(api: AdminApiFixture): Promise<UserSession> {
  const userData = generateUser();

  const { data } = await api.mutation<ApiUserMutationSignUpArgs>('users-api/SignUp', {
    variables: {
      input: {
        email: userData.email,
        password: userData.password,
      },
    },
  });

  const result = data.userMutation.signUp;
  if (!result.token?.accessToken) {
    throw new Error('Failed to create user');
  }

  return {
    email: userData.email,
    password: userData.password,
    accessToken: result.token.accessToken,
  };
}

const test = base.extend<{
  userA: UserSession;
  userB: UserSession;
}>({
  userA: async ({ api }, use) => {
    const user = await createUser(api.admin);
    api.session.tenant.accessToken = user.accessToken;
    await use(user);
  },
  userB: async ({ api }, use) => {
    const user = await createUser(api.admin);
    await use(user);
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
    const { data: projectData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: {
        slug: slugA,
      },
    });

    // User B should NOT be able to see User A's project
    expect(projectData.projectQuery.project).toBeNull();
  });

  // Project query is not implemented yet
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
