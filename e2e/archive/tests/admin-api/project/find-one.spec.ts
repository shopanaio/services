import { test } from '@fixtures/base.extend';
import { ApiProjectQueryFindOneArgs } from '@codegen/admin-gql';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('ProjectFindOne', () => {
  test('Single project', async ({   api }) => {
    await api.session.setupUserAndProject();

    const { data } = await api.admin.query<ApiProjectQueryFindOneArgs>('admin/ProjectFindOne', {
      variables: {
        slug: api.session.projectSlug,
      },
    });

    if (data.projectQuery.findOne) {
      await api.admin.projects.assertProject(data.projectQuery.findOne);
    }

    expect(data.projectQuery.findOne).toMatchSchema(
      Yup.object({
        id: Yup.string().required(),
        name: Yup.string().required(),
        status: Yup.string().required(),
      }),
    );
  });
});
