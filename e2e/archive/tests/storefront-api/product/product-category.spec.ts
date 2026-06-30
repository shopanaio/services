/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiCategory } from '@codegen/admin-gql';

import { randomUUID } from 'node:crypto';

test.describe('client product category', () => {
  let category = {} as ApiCategory;

  const categoryInput = {
    title: 'Primary Category',
    slug: randomUUID(),
    status: 'PUBLISHED',
    excerpt: '',
    includeChildrenProducts: false,
    listingFilters: [],
    listingOrderBy: 'CREATED_AT_ASC',
    listingOrderByStatus: true,
    listingType: 'MANUAL',
    gallery: [],
  };

  const createProductInput = (title: string, categoryId: string) => ({
    description: null,
    excerpt: '',
    groups: [],
    primaryCategory: categoryId,
    requiresShipping: false,
    slug: randomUUID(),
    status: 'PUBLISHED',
    tags: [],
    title,
    variants: {
      create: [
        {
          categories: [categoryId],
          costPrice: 0,
          coverId: null,
          features: [],
          gallery: [],
          inListing: true,
          oldPrice: 0,
          price: 3500,
          sku: '',
          slug: randomUUID(),
          stockStatus: 'IN_STOCK',
          title,
          variantSortIndex: 0,
          weight: 0,
          weightUnit: 'g',
        },
      ],
    },
  });

  test('primary category should be present in client product categories', async ({ api }) => {
    /* ---------- Setup ---------- */
    await api.session.setupUserAndProject();

    // Create category
    category = await api.admin.category.create({ input: categoryInput });

    // Create product with primary category
    const product = await api.admin.product.create({
      input: createProductInput('Product With Primary Category', category.id),
    });

    // Prepare client API
    await api.session.setupApiKey();

    /* ---------- Client Query ---------- */
    const firstVariant = product.variants[0];
    const { data: clientData } = await api.client.query('client/ProductContainerCategory', {
      variables: {
        handle: firstVariant.slug,
      },
    });

    const clientVariant = clientData.variant;
    expect(clientVariant?.product).not.toBeNull();
    expect(clientVariant?.product?.category?.handle).toBe(category.slug);
  });

  test('primary category should appear in categories connection', async ({ api }) => {
    /* ---------- Setup ---------- */
    await api.session.setupUserAndProject();

    // Create category
    category = await api.admin.category.create({ input: categoryInput });
    const product = await api.admin.product.create({
      input: createProductInput('Product With Primary Category', category.id),
    });
    // Create product with primary category
    await api.session.setupApiKey();
    const firstVariant = product.variants[0];
    const { data: clientData } = await api.client.query('client/ProductContainerCategoriesList', {
      variables: {
        handle: firstVariant.slug,
        first: 10,
      },
    });

    const clientVariant = clientData.variant;
    expect(clientVariant).not.toBeNull();

    const edges = clientVariant?.categories.edges || [];
    expect(edges.map((e) => e.node.handle).includes(category.slug)).toBe(true);
  });
});
