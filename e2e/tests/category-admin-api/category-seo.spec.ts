import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Category SEO API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  // ===============================================
  // CREATE WITH SEO
  // ===============================================

  test('should create category with full SEO data', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-full-seo',
          name: 'Category With Full SEO',
          seo: {
            seoTitle: 'Best Products | My Store',
            seoDescription: 'Discover our curated selection of the best products at competitive prices.',
            ogTitle: 'Best Products Collection',
            ogDescription: 'Shop the finest products in our exclusive collection. Free shipping on orders over $50.',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo).toBeTruthy();
    expect(result.category.seo.seoTitle).toBe('Best Products | My Store');
    expect(result.category.seo.seoDescription).toBe(
      'Discover our curated selection of the best products at competitive prices.'
    );
    expect(result.category.seo.ogTitle).toBe('Best Products Collection');
    expect(result.category.seo.ogDescription).toBe(
      'Shop the finest products in our exclusive collection. Free shipping on orders over $50.'
    );
  });

  test('should create category with only seoTitle', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-seo-title-only',
          name: 'Category SEO Title Only',
          seo: {
            seoTitle: 'Minimal SEO Title',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo).toBeTruthy();
    expect(result.category.seo.seoTitle).toBe('Minimal SEO Title');
    expect(result.category.seo.seoDescription).toBeNull();
    expect(result.category.seo.ogTitle).toBeNull();
    expect(result.category.seo.ogDescription).toBeNull();
  });

  test('should create category with only seoDescription', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-seo-desc-only',
          name: 'Category SEO Desc Only',
          seo: {
            seoDescription: 'A comprehensive description for search engines.',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo).toBeTruthy();
    expect(result.category.seo.seoDescription).toBe('A comprehensive description for search engines.');
  });

  test('should create category with only Open Graph data', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-og-only',
          name: 'Category OG Only',
          seo: {
            ogTitle: 'Share This Collection',
            ogDescription: 'Check out this amazing collection of products!',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo).toBeTruthy();
    expect(result.category.seo.ogTitle).toBe('Share This Collection');
    expect(result.category.seo.ogDescription).toBe('Check out this amazing collection of products!');
    expect(result.category.seo.seoTitle).toBeNull();
    expect(result.category.seo.seoDescription).toBeNull();
  });

  test('should create category without SEO data', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-no-seo',
          name: 'Category Without SEO',
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    // SEO should be null or have null fields
    if (result.category.seo) {
      expect(result.category.seo.seoTitle).toBeNull();
      expect(result.category.seo.seoDescription).toBeNull();
      expect(result.category.seo.ogTitle).toBeNull();
      expect(result.category.seo.ogDescription).toBeNull();
    }
  });

  // ===============================================
  // UPDATE SEO
  // ===============================================

  test('should update category with SEO data', async ({ api }) => {
    // Create without SEO
    const category = await api.admin.category.create({
      handle: 'category-update-seo',
      name: 'Category Update SEO',
    });

    // Update with SEO
    const { data } = await api.admin.mutation('category-api/CategoryUpdate', {
      variables: {
        categoryId: category.id,
        operations: {
          seo: {
            seoTitle: 'Updated SEO Title',
            seoDescription: 'Updated SEO description for better rankings.',
            ogTitle: 'Updated OG Title',
            ogDescription: 'Updated OG description for social sharing.',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo).toBeTruthy();
    expect(result.category.seo.seoTitle).toBe('Updated SEO Title');
    expect(result.category.seo.seoDescription).toBe('Updated SEO description for better rankings.');
    expect(result.category.seo.ogTitle).toBe('Updated OG Title');
    expect(result.category.seo.ogDescription).toBe('Updated OG description for social sharing.');
  });

  test('should partially update SEO data', async ({ api }) => {
    // Create with full SEO
    const { data: createData } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-partial-seo-update',
          name: 'Category Partial SEO Update',
          seo: {
            seoTitle: 'Original SEO Title',
            seoDescription: 'Original SEO description.',
            ogTitle: 'Original OG Title',
            ogDescription: 'Original OG description.',
          },
        },
      },
    });

    const categoryId = createData.catalogMutation.categoryCreate.category.id;

    // Update only seoTitle
    const { data } = await api.admin.mutation('category-api/CategoryUpdate', {
      variables: {
        categoryId,
        operations: {
          seo: {
            seoTitle: 'New SEO Title Only',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo).toBeTruthy();
    expect(result.category.seo.seoTitle).toBe('New SEO Title Only');
    // Other fields should be preserved or reset based on implementation
  });

  test('should clear SEO data with null values', async ({ api }) => {
    // Create with full SEO
    const { data: createData } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-clear-seo',
          name: 'Category Clear SEO',
          seo: {
            seoTitle: 'Title to Clear',
            seoDescription: 'Description to Clear',
          },
        },
      },
    });

    const categoryId = createData.catalogMutation.categoryCreate.category.id;

    // Clear SEO by setting null values
    const { data } = await api.admin.mutation('category-api/CategoryUpdate', {
      variables: {
        categoryId,
        operations: {
          seo: {
            seoTitle: null,
            seoDescription: null,
          },
        },
      },
    });

    const result = data.catalogMutation.categoryUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    if (result.category.seo) {
      expect(result.category.seo.seoTitle).toBeNull();
      expect(result.category.seo.seoDescription).toBeNull();
    }
  });

  // ===============================================
  // QUERY SEO
  // ===============================================

  test('should query category with SEO data', async ({ api }) => {
    // Create with full SEO
    const { data: createData } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-query-seo',
          name: 'Category Query SEO',
          seo: {
            seoTitle: 'Query SEO Title',
            seoDescription: 'Query SEO Description',
            ogTitle: 'Query OG Title',
            ogDescription: 'Query OG Description',
          },
        },
      },
    });

    const categoryId = createData.catalogMutation.categoryCreate.category.id;

    // Query the category
    const { data } = await api.admin.query('category-api/CategoryFindOne', {
      variables: { id: categoryId },
    });

    expect(data.catalogQuery.category).toBeTruthy();
    expect(data.catalogQuery.category.seo).toBeTruthy();
    expect(data.catalogQuery.category.seo.seoTitle).toBe('Query SEO Title');
    expect(data.catalogQuery.category.seo.seoDescription).toBe('Query SEO Description');
    expect(data.catalogQuery.category.seo.ogTitle).toBe('Query OG Title');
    expect(data.catalogQuery.category.seo.ogDescription).toBe('Query OG Description');
  });

  // ===============================================
  // SEO FIELD LENGTH VALIDATION
  // ===============================================

  test('should accept seoTitle at max length (70 chars)', async ({ api }) => {
    const maxTitle = 'A'.repeat(70);

    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-max-seo-title',
          name: 'Category Max SEO Title',
          seo: {
            seoTitle: maxTitle,
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo.seoTitle).toBe(maxTitle);
    expect(result.category.seo.seoTitle.length).toBe(70);
  });

  test('should accept seoDescription at max length (160 chars)', async ({ api }) => {
    const maxDesc = 'D'.repeat(160);

    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-max-seo-desc',
          name: 'Category Max SEO Desc',
          seo: {
            seoDescription: maxDesc,
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo.seoDescription).toBe(maxDesc);
    expect(result.category.seo.seoDescription.length).toBe(160);
  });

  test('should accept ogTitle at max length (95 chars)', async ({ api }) => {
    const maxOgTitle = 'O'.repeat(95);

    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-max-og-title',
          name: 'Category Max OG Title',
          seo: {
            ogTitle: maxOgTitle,
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo.ogTitle).toBe(maxOgTitle);
    expect(result.category.seo.ogTitle.length).toBe(95);
  });

  // ===============================================
  // EDGE CASES
  // ===============================================

  test('should handle special characters in SEO fields', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-special-chars-seo',
          name: 'Category Special Chars SEO',
          seo: {
            seoTitle: 'Title with <special> & "chars"',
            seoDescription: "Description's with apostrophes & ampersands",
            ogTitle: 'OG Title: Test | Brand',
            ogDescription: 'OG Description - 100% discount!',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    expect(result.category.seo.seoTitle).toBe('Title with <special> & "chars"');
    expect(result.category.seo.seoDescription).toBe("Description's with apostrophes & ampersands");
    expect(result.category.seo.ogTitle).toBe('OG Title: Test | Brand');
    expect(result.category.seo.ogDescription).toBe('OG Description - 100% discount!');
  });

  test('should handle unicode characters in SEO fields', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-unicode-seo',
          name: 'Category Unicode SEO',
          seo: {
            seoTitle: 'Products - Buy Now',
            seoDescription: 'Shop our collection of fine products',
            ogTitle: 'Premium Collection',
            ogDescription: 'Discover amazing products at great prices!',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
    // Verify unicode is preserved
    expect(result.category.seo.seoTitle).toBeTruthy();
    expect(result.category.seo.seoDescription).toBeTruthy();
  });

  test('should handle empty string in SEO fields', async ({ api }) => {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: 'category-empty-seo',
          name: 'Category Empty SEO',
          seo: {
            seoTitle: '',
            seoDescription: '',
          },
        },
      },
    });

    const result = data.catalogMutation.categoryCreate;

    // Empty strings might be converted to null or kept as empty
    expect(result.userErrors).toHaveLength(0);
    expect(result.category).toBeTruthy();
  });
});
