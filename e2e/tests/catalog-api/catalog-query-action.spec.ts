import { test } from '@fixtures/base.extend';
import { expect, type APIRequestContext } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';

const ACTION_PROXY_URL =
  process.env.TEST_ACTION_PROXY_URL ??
  `http://127.0.0.1:${process.env.TEST_ACTION_PROXY_PORT ?? '15000'}`;

type ActionProxyResponse<T> =
  | {
      ok: true;
      result: T;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        name?: string;
      };
    };

type CatalogQueryResult =
  | {
      ok: true;
      data: {
        products?: {
          totalCount?: number;
          edges?: Array<{
            cursor?: string;
            node?: {
              snapshotVersion?: string;
              id?: string;
              storeId?: string;
              revision?: number;
              kind?: string;
              handle?: string | null;
              status?: string;
              publishedAt?: string | null;
              createdAt?: string;
              updatedAt?: string;
              vendorId?: string | null;
              vendor?: {
                id?: string;
                name?: string;
              } | null;
              content?: Array<{
                locale?: string;
                title?: string;
                excerpt?: {
                  text?: string;
                  html?: string;
                  json?: unknown;
                } | null;
                description?: {
                  text?: string;
                  html?: string;
                  json?: unknown;
                } | null;
              }>;
              seo?: Array<{
                locale?: string;
                seoTitle?: string | null;
                seoDescription?: string | null;
              }>;
              availability?: {
                availableForSale?: boolean;
                totalQuantity?: number | null;
              };
              primaryCategory?: {
                id?: string;
                content?: Array<{
                  locale?: string;
                  name?: string;
                }>;
              } | null;
              categories?: Array<{
                id?: string;
                content?: Array<{
                  locale?: string;
                  name?: string;
                }>;
              }>;
              tags?: Array<{
                id?: string;
                handle?: string;
              }>;
              features?: Array<{
                id?: string;
                handle?: string;
                values?: Array<{
                  id?: string;
                  handle?: string;
                }>;
              }>;
              variants?: Array<{
                id?: string;
                handle?: string | null;
                isDefault?: boolean;
                createdAt?: string;
                updatedAt?: string;
                availability?: {
                  availableForSale?: boolean;
                  totalQuantity?: number | null;
                };
                prices?: Array<{
                  currencyCode?: string;
                  amountMinor?: number | null;
                }>;
                content?: Array<{
                  locale?: string;
                  title?: string;
                }>;
                inventoryItem?: {
                  id?: string;
                  sku?: string | null;
                } | null;
                options?: Array<{
                  id?: string;
                  handle?: string;
                  values?: Array<{
                    id?: string;
                    handle?: string;
                  }>;
                }>;
              }>;
            };
          }>;
          pageInfo?: {
            hasNextPage?: boolean;
            hasPreviousPage?: boolean;
            startCursor?: string | null;
            endCursor?: string | null;
          };
        };
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
      retryable: boolean;
    };

async function callAction<TResult>(
  request: APIRequestContext,
  action: string,
  params: unknown,
): Promise<ActionProxyResponse<TResult>> {
  const response = await request.post(`${ACTION_PROXY_URL}/__test/actions/call`, {
    data: { action, params },
  });

  expect(response.ok()).toBe(true);
  return response.json() as Promise<ActionProxyResponse<TResult>>;
}

function buildFullProductSnapshotSelection(productId: string) {
  return buildFullProductSnapshotSelectionFromArgs({
    first: 1,
    where: {
      id: {
        _eq: productId,
      },
    },
  });
}

function buildFullProductSnapshotSelectionFromArgs(args: unknown) {
  return {
    populate: {
      products: {
        fieldName: 'products',
        args,
        fields: ['totalCount'],
        populate: {
          edges: {
            fieldName: 'edges',
            fields: ['cursor'],
            populate: {
              node: {
                fields: [
                  'snapshotVersion',
                  'id',
                  'storeId',
                  'revision',
                  'kind',
                  'status',
                  'publishedAt',
                  'createdAt',
                  'updatedAt',
                  'handle',
                  'vendorId',
                ],
                populate: {
                  content: {
                    fieldName: 'content',
                    fields: ['locale', 'title'],
                    populate: {
                      excerpt: {
                        fieldName: 'excerpt',
                        fields: ['text', 'html', 'json'],
                      },
                      description: {
                        fieldName: 'description',
                        fields: ['text', 'html', 'json'],
                      },
                    },
                  },
                  seo: {
                    fieldName: 'seo',
                    fields: ['locale', 'seoTitle', 'seoDescription'],
                  },
                  vendor: {
                    fieldName: 'vendor',
                    fields: ['id', 'name'],
                  },
                  availability: {
                    fieldName: 'availability',
                    fields: ['availableForSale', 'totalQuantity'],
                  },
                  primaryCategory: {
                    fieldName: 'primaryCategory',
                    fields: ['id'],
                    populate: {
                      content: {
                        fieldName: 'content',
                        fields: ['locale', 'name'],
                      },
                    },
                  },
                  categories: {
                    fieldName: 'categories',
                    fields: ['id'],
                    populate: {
                      content: {
                        fieldName: 'content',
                        fields: ['locale', 'name'],
                      },
                    },
                  },
                  tags: {
                    fieldName: 'tags',
                    fields: ['id', 'handle'],
                  },
                  features: {
                    fieldName: 'features',
                    fields: ['id', 'handle'],
                    populate: {
                      values: {
                        fieldName: 'values',
                        fields: ['id', 'handle'],
                      },
                    },
                  },
                  variants: {
                    fieldName: 'variants',
                    fields: ['id', 'handle', 'isDefault', 'createdAt', 'updatedAt'],
                    populate: {
                      availability: {
                        fieldName: 'availability',
                        fields: ['availableForSale', 'totalQuantity'],
                      },
                      prices: {
                        fieldName: 'prices',
                        fields: ['currencyCode', 'amountMinor'],
                      },
                      content: {
                        fieldName: 'content',
                        fields: ['locale', 'title'],
                      },
                      inventoryItem: {
                        fieldName: 'inventoryItem',
                        fields: ['id', 'sku'],
                      },
                      options: {
                        fieldName: 'options',
                        fields: ['id', 'handle'],
                        populate: {
                          values: {
                            fieldName: 'values',
                            fields: ['id', 'handle'],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          pageInfo: {
            fieldName: 'pageInfo',
            fields: ['hasNextPage', 'hasPreviousPage', 'startCursor', 'endCursor'],
          },
        },
      },
    },
  };
}

test.describe('Catalog query action', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('returns product snapshot through broker action proxy', async ({ api, request }) => {
    const handle = `catalog-query-action-${crypto.randomUUID().slice(0, 8)}`;
    const product = await api.admin.product.createWithOptions({
      title: 'Catalog Query Action Product',
      handle,
      price: 1299,
      options: [
        {
          name: 'Size',
          slug: 'size',
          values: ['Small', 'Large'],
        },
      ],
      excerpt: {
        text: 'Catalog query action excerpt',
        html: '<p>Catalog query action excerpt</p>',
        json: {
          blocks: [{ type: 'paragraph', data: { text: 'Catalog query action excerpt' } }],
        },
      },
      description: {
        text: 'Catalog query action description',
        html: '<p>Catalog query action description</p>',
        json: {
          blocks: [{ type: 'paragraph', data: { text: 'Catalog query action description' } }],
        },
      },
    });
    const storeId = decodeGlobalId(api.session.project.id).id;
    const productId = decodeGlobalId(product.id).id;
    const category = await api.admin.category.create({
      name: 'Catalog Query Action Category',
      handle: `catalog-query-action-category-${crypto.randomUUID().slice(0, 8)}`,
    });
    const { data: vendorData } = await api.admin.mutation('inventory-api/VendorCreate', {
      variables: {
        input: {
          name: 'Catalog Query Action Vendor',
        },
      },
    });
    const vendorResult = vendorData.catalogMutation.vendorCreate;
    expect(vendorResult.userErrors).toHaveLength(0);
    expect(vendorResult.vendor).toBeTruthy();
    const vendor = vendorResult.vendor!;
    const tag = await api.admin.tag.create({
      name: 'Catalog Query Action Tag',
      handle: `catalog-query-action-tag-${crypto.randomUUID().slice(0, 8)}`,
    });

    const { data: updateData } = await api.admin.mutation('inventory-api/ProductUpdate', {
      variables: {
        productId: product.id,
        expectedRevision: product.revision,
        operations: {
          categories: [
            { categoryId: category.id, action: 'ADD' },
            { categoryId: category.id, action: 'SET_PRIMARY' },
          ],
          vendorId: vendor.id,
          tags: [{ tagId: tag.id, action: 'ADD' }],
        },
      },
    });
    const updateResult = updateData.catalogMutation.productUpdate;
    expect(updateResult.userErrors).toHaveLength(0);

    const { data: featuresData } = await api.admin.mutation('inventory-api/ProductUpdate', {
      variables: {
        productId: product.id,
        operations: {
          features: [
            {
              index: [0],
              isGroup: false,
              name: 'Material',
              slug: 'material',
              values: [
                { index: 0, name: 'Cotton', slug: 'cotton' },
                { index: 1, name: 'Wool', slug: 'wool' },
              ],
            },
          ],
        },
      },
    });
    const featuresResult = featuresData.catalogMutation.productUpdate;
    expect(featuresResult.userErrors).toHaveLength(0);
    expect(featuresResult.product?.features).toHaveLength(1);
    expect(featuresResult.product!.features[0].values).toHaveLength(2);

    const categoryId = decodeGlobalId(category.id).id;
    const vendorId = decodeGlobalId(vendor.id).id;
    const tagId = decodeGlobalId(tag.id).id;
    const featureId = decodeGlobalId(featuresResult.product!.features[0].id).id;
    const featureValueIds = featuresResult.product!.features[0].values.map((value: { id: string }) =>
      decodeGlobalId(value.id).id,
    );

    const proxyResult = await callAction<CatalogQueryResult>(request, 'catalog.query', {
      storeId,
      selection: buildFullProductSnapshotSelection(productId),
    });

    expect(proxyResult.ok).toBe(true);
    if (!proxyResult.ok) return;

    const result = proxyResult.result;
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const products = result.data.products;
    expect(products?.totalCount).toBe(1);
    expect(products?.edges).toHaveLength(1);
    expect(products?.pageInfo?.hasNextPage).toBe(false);
    expect(products?.pageInfo?.hasPreviousPage).toBe(false);

    const node = products?.edges?.[0]?.node;
    expect(node).toEqual(
      expect.objectContaining({
        snapshotVersion: '2026-07-13',
        id: productId,
        storeId,
        revision: expect.any(Number),
        kind: 'BASE',
        handle,
        status: 'draft',
        publishedAt: null,
        vendorId,
      }),
    );
    expect(node?.revision).toBeGreaterThan(product.revision);
    expect(node?.createdAt).toBeTruthy();
    expect(node?.updatedAt).toBeTruthy();
    expect(node?.availability).toEqual(
      expect.objectContaining({
        availableForSale: expect.any(Boolean),
      }),
    );
    expect(node?.seo).toEqual([]);
    expect(node?.vendor).toEqual({
      id: vendorId,
      name: 'Catalog Query Action Vendor',
    });
    expect(node?.primaryCategory).toEqual({
      id: categoryId,
      content: expect.arrayContaining([
        expect.objectContaining({
          name: 'Catalog Query Action Category',
        }),
      ]),
    });
    expect(node?.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: categoryId,
          content: expect.arrayContaining([
            expect.objectContaining({
              name: 'Catalog Query Action Category',
            }),
          ]),
        }),
      ]),
    );
    expect(node?.tags).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: tagId,
          handle: tag.handle,
        }),
      ]),
    );
    expect(node?.features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: featureId,
          handle: 'material',
          values: expect.arrayContaining([
            expect.objectContaining({
              id: featureValueIds[0],
              handle: 'cotton',
            }),
            expect.objectContaining({
              id: featureValueIds[1],
              handle: 'wool',
            }),
          ]),
        }),
      ]),
    );
    expect(node?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Catalog Query Action Product',
          excerpt: expect.objectContaining({
            text: 'Catalog query action excerpt',
            html: '<p>Catalog query action excerpt</p>',
            json: expect.anything(),
          }),
          description: expect.objectContaining({
            text: 'Catalog query action description',
            html: '<p>Catalog query action description</p>',
            json: expect.anything(),
          }),
        }),
      ]),
    );
    expect(node?.variants).toHaveLength(2);
    expect(node?.variants?.some((variant) => variant.isDefault)).toBe(true);
    expect(node?.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          handle: 'small',
          isDefault: true,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          availability: expect.objectContaining({
            availableForSale: expect.any(Boolean),
          }),
          prices: expect.arrayContaining([
            expect.objectContaining({
              currencyCode: 'USD',
              amountMinor: 1299,
            }),
          ]),
          content: [],
          inventoryItem: {
            id: expect.any(String),
            sku: null,
          },
          options: expect.arrayContaining([
            expect.objectContaining({
              handle: 'size',
              values: expect.arrayContaining([
                expect.objectContaining({
                  handle: 'small',
                }),
              ]),
            }),
          ]),
        }),
      ]),
    );
  });

  test('returns only products selected by id _in filter', async ({ api, request }) => {
    const products = await Promise.all(
      ['one', 'two', 'three'].map((suffix) =>
        api.admin.product.createWithOptions({
          title: `Catalog Query Action ${suffix}`,
          handle: `catalog-query-action-${suffix}-${crypto.randomUUID().slice(0, 8)}`,
          price: suffix === 'three' ? 3999 : 1999,
          options: [
            {
              name: 'Size',
              slug: 'size',
              values: ['Small', 'Large'],
            },
          ],
        }),
      ),
    );
    const storeId = decodeGlobalId(api.session.project.id).id;
    const productIds = products.map((product) => decodeGlobalId(product.id).id);
    const selectedIds = [productIds[0], productIds[2]];
    const excludedId = productIds[1];

    const proxyResult = await callAction<CatalogQueryResult>(request, 'catalog.query', {
      storeId,
      selection: buildFullProductSnapshotSelectionFromArgs({
        first: 10,
        where: {
          id: {
            _in: selectedIds,
          },
        },
      }),
    });
    console.log('catalog.query _in response', JSON.stringify(proxyResult, null, 2));

    expect(proxyResult.ok).toBe(true);
    if (!proxyResult.ok) return;

    const result = proxyResult.result;
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const edges = result.data.products?.edges ?? [];
    const returnedIds = edges.map((edge) => edge.node?.id).sort();

    expect(result.data.products?.totalCount).toBe(2);
    expect(edges).toHaveLength(2);
    expect(returnedIds).toEqual([...selectedIds].sort());
    expect(returnedIds).not.toContain(excludedId);

    for (const edge of edges) {
      expect(edge.cursor).toBeTruthy();
      expect(edge.node).toEqual(
        expect.objectContaining({
          snapshotVersion: '2026-07-13',
          storeId,
          kind: 'BASE',
          status: 'draft',
        }),
      );
      expect(edge.node?.variants).toHaveLength(2);
      expect(edge.node?.variants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            content: [],
            inventoryItem: {
              id: expect.any(String),
              sku: null,
            },
            prices: expect.arrayContaining([
              expect.objectContaining({
                currencyCode: 'USD',
              }),
            ]),
            options: expect.arrayContaining([
              expect.objectContaining({
                handle: 'size',
                values: expect.arrayContaining([
                  expect.objectContaining({
                    handle: expect.stringMatching(/^(small|large)$/),
                  }),
                ]),
              }),
            ]),
          }),
        ]),
      );
    }
  });

  test('returns catalog validation error for invalid query selection', async ({ api, request }) => {
    const proxyResult = await callAction<CatalogQueryResult>(request, 'catalog.query', {
      storeId: decodeGlobalId(api.session.project.id).id,
      selection: {
        populate: {},
      },
    });

    expect(proxyResult.ok).toBe(true);
    if (!proxyResult.ok) return;

    expect(proxyResult.result).toEqual({
      ok: false,
      code: 'INVALID_CATALOG_PRODUCT_READ_INPUT',
      message: 'selection.populate.products is required',
      retryable: false,
    });
  });
});
