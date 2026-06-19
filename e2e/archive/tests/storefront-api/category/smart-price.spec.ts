import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { ApiCategory } from '@codegen/admin-gql';

import type { ApiFixtures } from '@fixtures/api/api';

interface ListingResponse {
  data: {
    category: {
      listing: {
        edges: { node: { title: string } }[];
      };
    } | null;
  };
}

test.describe.skip('Storefront Smart-collection by price', () => {
  const createProduct = async (api: ApiFixtures['api'], title: string, price: number) => {
    const product = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: randomUUID(),
        status: 'PUBLISHED',
        tags: [],
        groups: [],
        title,
        variants: {
          create: [
            {
              categories: [] as string[],
              costPrice: 0,
              coverId: null,
              features: [],
              gallery: [] as string[],
              inListing: true,
              oldPrice: price,
              price,
              sku: '',
              slug: randomUUID(),
              stockStatus: 'IN_STOCK',
              title,
              variantSortIndex: 0,
              weight: 0,
              weightUnit: 'g',
              dimensionUnit: 'cm',
              height: 0,
              length: 0,
              width: 0,
            },
          ],
        },
      },
    });

    return product.id;
  };

  test('price filter reflected in storefront listing', async ({ api }) => {

    await api.session.setupUserAndProject();

    await createProduct(api, 'P1', 1000);
    await createProduct(api, 'P2', 2000);
    await createProduct(api, 'P3', 5000);

    const slug = `smart-${randomUUID()}`;
    const category = (await api.admin.category.create({
      input: {
        title: 'Smart Price',
        slug,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'AUTO',
        excerpt: '',
        description: { json: '{}', html: '', text: '' },
        gallery: [],
        listingFilters: [],
      },
    })) as ApiCategory;

    await api.session.setupApiKey();

    const fetchListing = async () => {
      return api.client.query('client/CategoryListing', {
        variables: {
          handle: slug,
          first: 20,
        },
      });
    };

    let resp = await fetchListing();
    expect(resp.data.category?.listing.edges).toHaveLength(0);

    await api.admin.mutation('admin/CategoryUpdate', {
      variables: {
        input: {
          id: category.id,
          listingFilters: [
            {
              operator: 'Between',
              path: '0.0',
              type: 'PRICE',
              value: '0',
            },
            {
              operator: 'Between',
              path: '0.1',
              type: 'PRICE',
              value: '3000',
            },
          ],
        },
      },
    });

    resp = await fetchListing();
    const titles = resp.data.category?.listing.edges.map((e) => e.node.title) ?? [];
    expect(titles).toEqual(expect.arrayContaining(['P1', 'P2']));
    expect(titles).not.toContain('P3');
    expect(titles).toHaveLength(2);
  });

  /* --------------------------------------------------------------------- */
  test('operator Eq returns exact price match', async ({ api }) => {
    await api.session.setupUserAndProject();

    await createProduct(api, 'P1', 1000);
    await createProduct(api, 'P2', 2000);
    await createProduct(api, 'P3', 5000);

    const slug = `smart-eq-${randomUUID()}`;
    const category = (await api.admin.category.create({
      input: {
        title: 'Smart Eq',
        slug,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'AUTO',
        excerpt: '',
        description: { json: '{}', html: '', text: '' },
        gallery: [],
        listingFilters: [],
      },
    })) as ApiCategory;

    await api.admin.mutation('admin/CategoryUpdate', {
      variables: {
        input: {
          id: category.id,
          listingFilters: [
            {
              operator: 'Eq',
              path: '0.0',
              type: 'PRICE',
              value: '2000',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();

    const { data }: ListingResponse = (await api.client.query('client/CategoryListing', {
      variables: { handle: slug, first: 20 },
    })) as unknown as ListingResponse;

    const titles = data.category?.listing.edges.map((e) => e.node.title) ?? [];
    expect(titles).toEqual(['P2']);
  });

  /* --------------------------------------------------------------------- */
  test('operator Lte returns prices below or equal value', async ({ api }) => {
    await api.session.setupUserAndProject();

    await createProduct(api, 'P1', 1000);
    await createProduct(api, 'P2', 2000);
    await createProduct(api, 'P3', 5000);

    const slug = `smart-lte-${randomUUID()}`;
    const category = (await api.admin.category.create({
      input: {
        title: 'Smart Lte',
        slug,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'AUTO',
        excerpt: '',
        description: { json: '{}', html: '', text: '' },
        gallery: [],
        listingFilters: [],
      },
    })) as ApiCategory;

    await api.admin.mutation('admin/CategoryUpdate', {
      variables: {
        input: {
          id: category.id,
          listingFilters: [
            {
              operator: 'Lte',
              path: '0.0',
              type: 'PRICE',
              value: '2000',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();

    const { data }: ListingResponse = (await api.client.query('client/CategoryListing', {
      variables: { handle: slug, first: 20 },
    })) as unknown as ListingResponse;

    const titles = data.category?.listing.edges.map((e) => e.node.title) ?? [];
    expect(titles).toEqual(expect.arrayContaining(['P1', 'P2']));
    expect(titles).not.toContain('P3');
  });

  /* --------------------------------------------------------------------- */
  test('operator Gte returns prices above or equal value', async ({ api }) => {
    await api.session.setupUserAndProject();

    await createProduct(api, 'P1', 1000);
    await createProduct(api, 'P2', 2000);
    await createProduct(api, 'P3', 5000);

    const slug = `smart-gte-${randomUUID()}`;
    const category = (await api.admin.category.create({
      input: {
        title: 'Smart Gte',
        slug,
        status: 'PUBLISHED',
        includeChildrenProducts: true,
        listingOrderBy: 'CREATED_AT_ASC',
        listingOrderByStatus: true,
        listingType: 'AUTO',
        excerpt: '',
        description: { json: '{}', html: '', text: '' },
        gallery: [],
        listingFilters: [],
      },
    })) as ApiCategory;

    await api.admin.mutation('admin/CategoryUpdate', {
      variables: {
        input: {
          id: category.id,
          listingFilters: [
            {
              operator: 'Gte',
              path: '0.0',
              type: 'PRICE',
              value: '2000',
            },
          ],
        },
      },
    });

    await api.session.setupApiKey();

    const { data }: ListingResponse = (await api.client.query('client/CategoryListing', {
      variables: { handle: slug, first: 20 },
    })) as unknown as ListingResponse;

    const titles = data.category?.listing.edges.map((e) => e.node.title) ?? [];
    expect(titles).toEqual(expect.arrayContaining(['P2', 'P3']));
    expect(titles).not.toContain('P1');
  });
});
