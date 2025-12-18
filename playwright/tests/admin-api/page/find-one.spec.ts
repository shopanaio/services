import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('PageFindOne API', () => {
  test('FindOne', async ({   api }) => {
    await api.session.setupUserAndProject();

    const input = {
      title: 'Page Title',
      slug: randomUUID(),
      status: EntityStatus.Draft,
    };

    const page = await api.admin.page.create({ input });
    expect(page).toMatchSchema(
      yup.object({
        id: yup.string().required(),
        title: yup.string().equals([input.title]).required(),
        slug: yup.string().equals([input.slug]).required(),
        status: yup.string().equals([input.status]).required(),
        createdAt: yup.string().required(),
        updatedAt: yup.string().required(),
        gallery: yup.array().required(),
      }),
    );
  });
});
