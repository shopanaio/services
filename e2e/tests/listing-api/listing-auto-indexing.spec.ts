import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFacet, ApiListingFacet, ApiListingProductFilter, ApiProduct } from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import type { CategoryData } from '@fixtures/admin/category';

type Api = ApiFixtures['api'];
type OptionValues = Record<string, string>;

interface ListingSnapshot {
  totalCount: number;
  productIds: string[];
  facets: ApiListingFacet[];
}

interface FacetDefinition {
  sourceSlug: string;
  facetSlug: string;
  label: string;
  values: { handle: string; label: string }[];
}

interface ProductDefinition {
  title: string;
  handle: string;
  options: OptionValues;
  status: 'DRAFT' | 'PUBLISHED';
  priceMinor: number;
  stock: number;
}

test.describe('Listing API automatic indexing', () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });
  });

  test('indexes product mutations automatically across a multi-facet catalog matrix', async ({ api }) => {
    const unique = crypto.randomUUID().slice(0, 8);
    const facets = facetDefinitions(unique, 'product');
    const category = await api.admin.category.create({
      handle: `auto-product-category-${unique}`,
      name: 'Auto Product Listing Category',
    });
    const warehouse = await createWarehouse(api, `AUTO-PRODUCT-${unique}`);

    await createSourceProducts(api, unique, facets);
    const createdFacets = await createOptionFacets(api, facets);
    const productDefinitions = productMatrix(unique, facets, 24, 20);

    const publishedProducts: ApiProduct[] = [];
    for (const definition of productDefinitions.slice(0, 20)) {
      publishedProducts.push(
        await createListingProduct(api, {
          definition,
          category,
          warehouseId: warehouse.id,
        }),
      );
    }

    const publishedDefinitions = productDefinitions.slice(0, 20);
    await expectListingSnapshot(api, category, {
      totalCount: publishedProducts.length,
      productIds: publishedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, publishedDefinitions),
    });

    const draftProduct = await createListingProduct(api, {
      definition: productDefinitions[20],
      category,
      warehouseId: warehouse.id,
    });
    await createListingProduct(api, {
      definition: productDefinitions[21],
      category,
      warehouseId: warehouse.id,
    });
    await createListingProduct(api, {
      definition: productDefinitions[22],
      category,
      warehouseId: warehouse.id,
    });
    await createListingProduct(api, {
      definition: productDefinitions[23],
      category,
      warehouseId: warehouse.id,
    });

    await expectListingSnapshot(api, category, {
      totalCount: publishedProducts.length,
      productIds: publishedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, publishedDefinitions),
    });

    const publishedDraftProduct = await api.admin.product.update({
      productId: draftProduct.id,
      operations: { status: 'PUBLISHED' },
    });
    const nextProducts = [...publishedProducts, publishedDraftProduct];
    const nextDefinitions = productDefinitions.slice(0, 21);

    const snapshot = await expectListingSnapshot(api, category, {
      totalCount: nextProducts.length,
      productIds: nextProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, nextDefinitions),
    });

    const colorRedFilter = facetValueInput(snapshot.facets, facets[0].facetSlug, 'red');
    const sizeMFilter = facetValueInput(snapshot.facets, facets[1].facetSlug, 'm');
    const filteredProducts = nextProducts.filter(
      (_product, index) => nextDefinitions[index].options[facets[0].sourceSlug] === 'red'
        && nextDefinitions[index].options[facets[1].sourceSlug] === 'm',
    );

    await expectListingSnapshot(api, category, {
      totalCount: filteredProducts.length,
      productIds: filteredProducts.map((product) => product.id),
      facets: [colorRedFilter, sizeMFilter],
    });
  });

  test('reindexes existing products when several facets and display values are created', async ({ api }) => {
    const unique = crypto.randomUUID().slice(0, 8);
    const facets = facetDefinitions(unique, 'facet');
    const category = await api.admin.category.create({
      handle: `auto-facet-category-${unique}`,
      name: 'Auto Facet Listing Category',
    });
    const warehouse = await createWarehouse(api, `AUTO-FACET-${unique}`);
    const productDefinitions = productMatrix(unique, facets, 24, 24);

    const products: ApiProduct[] = [];
    for (const definition of productDefinitions) {
      products.push(
        await createListingProduct(api, {
          definition,
          category,
          warehouseId: warehouse.id,
        }),
      );
    }

    await expectListingSnapshot(api, category, {
      totalCount: products.length,
      productIds: products.map((product) => product.id),
      missingFacetIds: facets.map((facet) => facet.facetSlug),
    });

    const createdFacets = await createOptionFacets(api, facets);
    const snapshot = await expectListingSnapshot(api, category, {
      totalCount: products.length,
      productIds: products.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, productDefinitions),
    });

    const materialCottonFilter = facetValueInput(snapshot.facets, facets[2].facetSlug, 'cotton');
    const styleModernFilter = facetValueInput(snapshot.facets, facets[3].facetSlug, 'modern');
    const filteredProducts = products.filter(
      (_product, index) => productDefinitions[index].options[facets[2].sourceSlug] === 'cotton'
        && productDefinitions[index].options[facets[3].sourceSlug] === 'modern',
    );

    await expectListingSnapshot(api, category, {
      totalCount: filteredProducts.length,
      productIds: filteredProducts.map((product) => product.id),
      facets: [materialCottonFilter, styleModernFilter],
    });
  });
});

function facetDefinitions(unique: string, namespace: string): FacetDefinition[] {
  return [
    {
      sourceSlug: `${namespace}-color-${unique}`,
      facetSlug: `${namespace}-color-facet-${unique}`,
      label: 'Color',
      values: [
        { handle: 'red', label: 'Red' },
        { handle: 'blue', label: 'Blue' },
        { handle: 'green', label: 'Green' },
        { handle: 'black', label: 'Black' },
      ],
    },
    {
      sourceSlug: `${namespace}-size-${unique}`,
      facetSlug: `${namespace}-size-facet-${unique}`,
      label: 'Size',
      values: [
        { handle: 's', label: 'S' },
        { handle: 'm', label: 'M' },
        { handle: 'l', label: 'L' },
      ],
    },
    {
      sourceSlug: `${namespace}-material-${unique}`,
      facetSlug: `${namespace}-material-facet-${unique}`,
      label: 'Material',
      values: [
        { handle: 'cotton', label: 'Cotton' },
        { handle: 'linen', label: 'Linen' },
        { handle: 'wool', label: 'Wool' },
      ],
    },
    {
      sourceSlug: `${namespace}-style-${unique}`,
      facetSlug: `${namespace}-style-facet-${unique}`,
      label: 'Style',
      values: [
        { handle: 'classic', label: 'Classic' },
        { handle: 'modern', label: 'Modern' },
      ],
    },
  ];
}

function productMatrix(
  unique: string,
  facets: FacetDefinition[],
  count: number,
  publishedCount: number,
): ProductDefinition[] {
  return Array.from({ length: count }, (_, index) => {
    const ordinal = String(index + 1).padStart(2, '0');

    return {
      title: `Auto Indexed Product ${ordinal}`,
      handle: `auto-indexed-product-${unique}-${ordinal}`,
      options: Object.fromEntries(
        facets.map((facet, facetIndex) => {
          const value = facet.values[(index + facetIndex) % facet.values.length];

          return [facet.sourceSlug, value.handle];
        }),
      ),
      status: index < publishedCount ? 'PUBLISHED' : 'DRAFT',
      priceMinor: 1_000 + index * 25,
      stock: 5 + (index % 5),
    };
  });
}

async function createSourceProducts(api: Api, unique: string, facets: FacetDefinition[]): Promise<ApiProduct[]> {
  const products: ApiProduct[] = [];

  for (const facet of facets) {
    products.push(
      await api.admin.product.createWithOptions({
        title: `Listing ${facet.label} Source Product ${unique}`,
        handle: `listing-${facet.sourceSlug}-source-${unique}`,
        options: [
          {
            name: facet.label,
            slug: facet.sourceSlug,
            values: facet.values.map((value) => value.label),
          },
        ],
      }),
    );
  }

  return products;
}

async function createListingProduct(
  api: Api,
  input: {
    definition: ProductDefinition;
    category: CategoryData;
    warehouseId: string;
  },
): Promise<ApiProduct> {
  const product = await api.admin.product.createWithOptions({
    title: input.definition.title,
    handle: input.definition.handle,
    status: input.definition.status,
    price: input.definition.priceMinor,
    options: Object.entries(input.definition.options).map(([sourceSlug, valueHandle]) => ({
      name: sourceSlug,
      slug: sourceSlug,
      values: [valueHandle],
    })),
  });
  const variant = product.variants.edges[0]?.node;
  const inventoryItemId = variant?.inventoryItem?.id;

  if (!variant || !inventoryItemId) {
    throw new Error(`Created product ${product.id} does not have a variant inventory item`);
  }

  await setVariantStock(api, {
    inventoryItemId,
    warehouseId: input.warehouseId,
    onHand: input.definition.stock,
  });
  await addProductToCategory(api, {
    productId: product.id,
    categoryId: input.category.id,
  });

  return api.admin.product.findOne(product.id);
}

async function createOptionFacets(api: Api, facets: FacetDefinition[]): Promise<ApiFacet[]> {
  const createdFacets: ApiFacet[] = [];

  for (const facet of facets) {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'OPTION',
          slug: facet.facetSlug,
          label: facet.label,
          uiType: 'CHECKBOX',
          selectionMode: 'MULTI',
          sources: [
            {
              handle: facet.sourceSlug,
              name: facet.label,
            },
          ],
          valueCandidates: facet.values.map((value) => ({
            handle: `${facet.sourceSlug}:${value.handle}`,
            label: value.label,
            sourceHandle: facet.sourceSlug,
          })),
        },
      },
    });
    const result = data.listingMutation.facetCreate;
    expect(result.userErrors).toHaveLength(0);

    const sourceFacet = result.facet;
    if (!sourceFacet) {
      throw new Error(`Failed to create facet ${facet.facetSlug}`);
    }

    const sourceValueByHandle = new Map(sourceFacet.values.map((value) => [value.handle, value]));
    const displayValues = [];

    for (const [index, value] of facet.values.entries()) {
      const sourceValue = sourceValueByHandle.get(`${facet.sourceSlug}:${value.handle}`);
      if (!sourceValue) {
        throw new Error(`Missing source value ${facet.sourceSlug}:${value.handle}`);
      }

      const { data: valueData } = await api.admin.mutation('facet-api/FacetValueCreate', {
        variables: {
          input: {
            facetId: sourceFacet.id,
            kind: 'DISPLAY',
            handle: value.handle,
            label: value.label,
            sortIndex: index,
            sourceValueIds: [sourceValue.id],
          },
        },
      });
      const valueResult = valueData.listingMutation.facetValueCreate;
      expect(valueResult.userErrors).toHaveLength(0);
      expect(valueResult.facetValue).toBeTruthy();
      displayValues.push(valueResult.facetValue);
    }

    createdFacets.push({
      ...sourceFacet,
      values: displayValues as ApiFacet['values'],
    });
  }

  return createdFacets;
}

function expectedFacetCounts(
  createdFacets: ApiFacet[],
  facets: FacetDefinition[],
  products: ProductDefinition[],
): Record<string, Record<string, number>> {
  return Object.fromEntries(
    facets.map((facet, index) => [
      createdFacets[index].slug,
      Object.fromEntries(
        facet.values.map((value) => [
          value.handle,
          products.filter((product) => product.options[facet.sourceSlug] === value.handle).length,
        ]),
      ),
    ]),
  );
}

async function createWarehouse(api: Api, codePrefix: string): Promise<{ id: string }> {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: codePrefix.toUpperCase(),
        name: 'Listing Auto Index Warehouse',
      },
    },
  });
  const result = data.inventoryMutation.warehouseCreate;
  expect(result.userErrors).toHaveLength(0);

  if (!result.warehouse?.id) {
    throw new Error('Failed to create warehouse for listing auto indexing test');
  }

  return { id: result.warehouse.id };
}

async function setVariantStock(
  api: Api,
  input: {
    inventoryItemId: string;
    warehouseId: string;
    onHand: number;
  },
) {
  const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
    variables: {
      input: {
        id: input.inventoryItemId,
        trackInventory: true,
        stock: {
          warehouseId: input.warehouseId,
          onHand: input.onHand,
        },
      },
    },
  });

  expect(data.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);
}

async function addProductToCategory(
  api: Api,
  input: {
    productId: string;
    categoryId: string;
  },
) {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: {
      productId: input.productId,
      categoryId: input.categoryId,
    },
  });

  expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
}

async function expectListingSnapshot(
  api: Api,
  category: CategoryData,
  expected: {
    totalCount: number;
    productIds: string[];
    facetCounts?: Record<string, Record<string, number>>;
    missingFacetIds?: string[];
    facets?: ApiListingProductFilter[];
  },
): Promise<ListingSnapshot> {
  let lastSnapshot: ListingSnapshot | null = null;

  await expect
    .poll(
      async () => {
        lastSnapshot = await readListingSnapshot(api, category, expected.facets);

        return {
          totalCount: lastSnapshot.totalCount,
          productIds: [...lastSnapshot.productIds].sort(),
          facetCounts: readFacetCounts(lastSnapshot.facets, expected.facetCounts),
          missingFacetIds: (expected.missingFacetIds ?? []).filter((facetId) =>
            lastSnapshot?.facets.some((facet) => facet.id === facetId),
          ),
        };
      },
      {
        timeout: 60_000,
        intervals: [500, 1_000, 2_000, 5_000],
      },
    )
    .toEqual({
      totalCount: expected.totalCount,
      productIds: [...expected.productIds].sort(),
      facetCounts: expected.facetCounts ?? {},
      missingFacetIds: [],
    });

  if (!lastSnapshot) {
    throw new Error('Listing snapshot was not read');
  }

  return lastSnapshot;
}

async function readListingSnapshot(
  api: Api,
  category: CategoryData,
  facets?: ApiListingProductFilter[],
): Promise<ListingSnapshot> {
  const { data } = await api.admin.query('listing-api/Listing', {
    variables: {
      first: 50,
      locale: 'en',
      currency: 'USD',
      scope: {
        kind: 'CATEGORY',
        categoryId: category.id,
      },
      facets,
    },
  });
  const listing = data.listingQuery.listing;

  return {
    totalCount: listing.totalCount,
    productIds: listing.edges.map((edge) => edge.node.id),
    facets: listing.facets,
  };
}

function readFacetCounts(facets: ApiListingFacet[], expected?: Record<string, Record<string, number>>) {
  if (!expected) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(expected).map(([facetId, values]) => {
      const facet = facets.find((candidate) => candidate.id === facetId);

      return [
        facetId,
        Object.fromEntries(
          Object.keys(values).map((valueId) => [
            valueId,
            facet?.values.find((value) => value.id === valueId)?.count ?? null,
          ]),
        ),
      ];
    }),
  );
}

function facetValueInput(facets: ApiListingFacet[], facetId: string, valueId: string) {
  const facet = facets.find((candidate) => candidate.id === facetId);
  const value = facet?.values.find((candidate) => candidate.id === valueId);

  if (!facet || !value) {
    throw new Error(`Missing listing facet value input for ${facetId}:${valueId}`);
  }

  const input = value.input as ApiListingProductFilter | undefined;
  if (input && Object.keys(input).length > 0) {
    return input;
  }

  return {
    variantFacet: {
      facet: facet.id,
      value: value.id,
    },
  };
}
