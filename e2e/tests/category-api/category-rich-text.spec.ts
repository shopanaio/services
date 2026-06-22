import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Category Rich Text API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should create, update, and query category rich-text excerpt', async ({ api }) => {
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const description = {
      html: '<p>Category <strong>description</strong></p>',
      text: 'Category description',
      json: {
        blocks: [{ type: 'paragraph', data: { text: 'Category description' } }],
      },
    };
    const excerpt = {
      html: '<p>Initial category excerpt</p>',
      text: 'Initial category excerpt',
      json: {
        blocks: [{ type: 'paragraph', data: { text: 'Initial category excerpt' } }],
      },
    };

    const { data: createData } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: `category-rich-text-${uniqueId}`,
          name: `Category Rich Text ${uniqueId}`,
          description,
          excerpt,
        },
      },
    });

    const createResult = createData.catalogMutation.categoryCreate;
    expect(createResult.userErrors).toHaveLength(0);
    expect(createResult.category.description).toEqual(description);
    expect(createResult.category.excerpt).toEqual(excerpt);

    const updatedExcerpt = {
      html: '<p>Updated <em>category</em> excerpt</p>',
      text: 'Updated category excerpt',
      json: {
        blocks: [{ type: 'paragraph', data: { text: 'Updated category excerpt' } }],
      },
    };

    const { data: updateData } = await api.admin.mutation('category-api/CategoryUpdate', {
      variables: {
        categoryId: createResult.category.id,
        operations: {
          content: {
            excerpt: updatedExcerpt,
          },
        },
      },
    });

    const updateResult = updateData.catalogMutation.categoryUpdate;
    expect(updateResult.userErrors).toHaveLength(0);
    expect(updateResult.category.description).toEqual(description);
    expect(updateResult.category.excerpt).toEqual(updatedExcerpt);

    const { data: queryData } = await api.admin.query('category-api/CategoryFindOne', {
      variables: { id: createResult.category.id },
    });

    expect(queryData.catalogQuery.category.description).toEqual(description);
    expect(queryData.catalogQuery.category.excerpt).toEqual(updatedExcerpt);
  });
});
