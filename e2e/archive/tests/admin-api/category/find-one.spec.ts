import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiCategoryQueryFindOneArgs } from '@codegen/admin-gql';

import { randomUUID } from 'node:crypto';
import * as yup from 'yup';

test.describe('CategoryFindOne', () => {
  test('should return a single category', async ({   api }) => {
    await api.session.setupUserAndProject();

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

    // todo: create category
    const request = await api.admin.mutation('admin/CategoryCreate', {
      variables: { input },
    });

    const { data } = await api.admin.query<ApiCategoryQueryFindOneArgs>('admin/CategoryFindOne', {
      variables: {
        id: request.data.categoryMutation.create,
      },
    });

    expect(data.categoryQuery.findOne).toMatchSchema(
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
