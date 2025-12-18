import { test } from '@fixtures/base.extend';
import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import {
  ApiCategory,
  EntityStatus,
  ListingSort,
  ListingType,
} from '@codegen/admin-gql';



interface ListingResponse {
  data: {
    listingQuery: {
      listingV1: {
        data: { title: string }[];
      };
    };
  };
}

test.describe.skip('Smart-collection by price', () => {
  let categorySmart = {} as ApiCategory;
  const productsIds: string[] = [];

  const createProductInput = (title: string, price: number) => ({
    description: null,
    excerpt: '',
    groups: [],
    requiresShipping: false,
    slug: randomUUID(),
    status: EntityStatus.Draft,
    tags: [],
    title,
    variants: {
      create: [
        {
          categories: [],
          costPrice: 0,
          coverId: null,
          features: [],
          gallery: [],
          inListing: true,
          oldPrice: price,
          price,
          sku: '',
          slug: randomUUID(),
          stockStatus: 'IN_STOCK',
          title,
          variantSortIndex: 0,
          weight: 0,
          weightUnit: 'GR',
        },
      ],
    },
  });

  const getListing = async (api: { admin: unknown }, slug: string) => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const admin = api.admin as {
      query: (doc: string, options: { variables: unknown }) => Promise<ListingResponse>;
    };
    return admin.query('admin/ListingV1', {
      variables: {
        input: {
          listingType: ListingType.Auto,
          category: {
            slug,
          },
          page: 1,
          perPage: 25,
        },
      },
    });
  };

  test('filter by price', async ({ api }) => {
    
    await api.session.setupUserAndProject();

    
    const prices = [1000, 2000, 5000];
    for (const p of prices) {
      const { data } = await api.admin.mutation('admin/ProductCreate', {
        variables: { input: createProductInput(`Product ${p}`, p) },
      });
      productsIds.push(data.productMutation.create.id);
    }

    
    categorySmart = await api.admin.category.create({
      input: {
        title: 'Smart by price',
        slug: randomUUID(),
        status: EntityStatus.Published,
        excerpt: '',
        includeChildrenProducts: true,
        listingFilters: [],
        listingOrderBy: ListingSort.CreatedAtAsc,
        listingOrderByStatus: true,
        listingType: ListingType.Auto,
        gallery: [],
      },
    });

    let resp = (await getListing(api, categorySmart.slug)) as unknown as ListingResponse;
    expect(resp.data.listingQuery.listingV1.data.length).toBe(3);

    
    await api.admin.mutation('admin/CategoryUpdate', {
      variables: {
        input: {
          id: categorySmart.id,
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

    resp = (await getListing(api, categorySmart.slug)) as unknown as ListingResponse;
    expect(resp.data.listingQuery.listingV1.data.length).toBe(2);
    const titles = resp.data.listingQuery.listingV1.data.map((n: { title: string }) => n.title);
    expect(titles).toContain('Product 1000');
    expect(titles).toContain('Product 2000');
    expect(titles).not.toContain('Product 5000');
  });
});
