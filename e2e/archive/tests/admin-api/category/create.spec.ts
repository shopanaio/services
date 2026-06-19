import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('CategoryCreate', () => {
  test('Create', async ({   api }) => {
    await test.step('Create user and project', async () => {
      await api.session.setupUserAndProject();
    });

    const input = {
      excerpt: '',
      includeChildrenProducts: false,
      listingFilters: [],
      listingOrderBy: 'PRICE_ASC',
      listingOrderByStatus: true,
      listingType: 'MANUAL',
      slug: randomUUID(),
      status: 'DRAFT',
      title: 'Category',
      gallery: [],
    };

    expect(await api.admin.category.create({ input })).toMatchSchema(
      yup.object({
        id: yup.string().required(),
        listingOrderByStatus: yup.boolean().isTrue().required(),
        listingOrderBy: yup.string().equals(['PRICE_ASC']).required(),
        status: yup.string().equals(['DRAFT']).required(),
        slug: yup.string().equals([input.slug]).required(),
        listingType: yup.string().equals(['MANUAL']).required(),
        createdAt: yup.string().required(),
        updatedAt: yup.string().required(),
      }),
    );
  });
});
