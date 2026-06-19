import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('PageUpdate API', () => {
  test('Update', async ({   api }) => {
    await api.session.setupUserAndProject();

    const input = {
      title: 'Page Title',
      slug: randomUUID(),
      status: 'DRAFT',
    };

    const inputUpdate = {
      title: 'New Page Title',
      slug: 'new-page-title',
      status: 'PUBLISHED',
      excerpt: 'Excerpt',
      seo: {
        title: 'SEO title',
        description: 'SEO description',
      },
    };

    const { id, createdAt } = await api.admin.page.create({ input });
    await api.admin.mutation('admin/PageUpdate', {
      variables: {
        input: {
          ...inputUpdate,
          id,
        },
      },
    });

    const updatedPage = await api.admin.page.findOne(id);
    expect(updatedPage).toMatchSchema(
      yup.object({
        id: yup.string().equals([id]).required(),
        title: yup.string().equals([inputUpdate.title]).required(),
        slug: yup.string().equals([inputUpdate.slug]).required(),
        status: yup.string().equals([inputUpdate.status]).required(),
        createdAt: yup.string().equals([createdAt]).required(),
        updatedAt: yup.string().required(),
        gallery: yup.array().required(),
        excerpt: yup.string(),
      }),
    );
  });
});
