
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import * as yup from 'yup';
import { test } from '@fixtures/base.extend';

test.describe('CategoryUpdate', () => {
  test('Update', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      excerpt: '',
      includeChildrenProducts: false,
      listingFilters: [],
      listingOrderBy: 'CREATED_AT_ASC',
      listingOrderByStatus: true,
      listingType: 'MANUAL',
      slug: randomUUID(),
      status: 'DRAFT',
      title: 'Category',
      gallery: [],
    };

    const newInput = {
      title: 'Category title updated',
      status: 'PUBLISHED',
      slug: 'category-title-updated',
      listingOrderBy: 'PRICE_ASC',
      listingType: 'COMPOSITE',
    };

    const { id } = await api.admin.category.create({ input });
    await api.admin.mutation('admin/CategoryUpdate', {
      variables: {
        input: { ...newInput, id },
      },
    });

    expect(await api.admin.category.findOne(id)).toMatchSchema(
      yup.object({
        id: yup.string().required(),
        createdAt: yup.string().required(),
        listingOrderBy: yup.string().equals([newInput.listingOrderBy]).required(),
        listingOrderByStatus: yup.boolean().required(),
        listingType: yup.string().equals([newInput.listingType]).required(),
        slug: yup.string().equals([newInput.slug]).required(),
        status: yup.string().equals([newInput.status]).required(),
        title: yup.string().equals([newInput.title]).required(),
        updatedAt: yup.string().required(),
      }),
    );
  });
});
