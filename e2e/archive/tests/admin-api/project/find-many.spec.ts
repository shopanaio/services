import { test } from '@fixtures/base.extend';
import type { ApiProject } from '@codegen/admin-gql';

test.describe('ProjectFindMany', () => {
  test('List of projects', async ({   api }) => {
    await api.session.setupUserAndProject();

    const { data } = await api.admin.query('admin/ProjectFindMany', {});

    api.admin.projects.assertProjects(data.projectQuery.findMany as ApiProject[]);
  });
});
