import { test } from '@fixtures/base.extend';
import { ApiProjectMutationUpdateArgs, ApiProjectQueryFindOneArgs } from '@codegen/admin-gql';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('ProjectUpdate API', () => {
  test('Update project', async ({   api }) => {
    await api.session.setupUserAndProject();

    const input = {
      name: 'UpdatedName',
      email: 'updated@example.com',
      phoneNumber: '0987654321',
      country: 'UA',
      timezone: 'Europe/Kiev',
    };

    const { data } = await api.admin.mutation<ApiProjectMutationUpdateArgs>('admin/ProjectUpdate', {
      variables: { input },
    });

    expect(data.projectMutation.update).toBe(true);

    // TODO: Check JSON

    const projectOne = await api.admin.query<ApiProjectQueryFindOneArgs>('admin/ProjectFindOne', {
      variables: {
        slug: api.session.project.slug,
      },
    });

    if (projectOne.data.projectQuery.findOne) {
      api.admin.projects.assertProject(projectOne.data.projectQuery.findOne);
    }

    expect(projectOne.data.projectQuery.findOne).toMatchSchema(
      Yup.object({
        name: Yup.string().equals([input.name]).required(),
        status: Yup.string().required(),
      }),
    );
  });
});
