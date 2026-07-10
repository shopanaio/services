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

interface ListingSnapshotComparison {
  totalCount: number;
  productIds: string[];
  facetCounts: Record<string, Record<string, number | null>>;
  availableCount: number | null;
  missingFacetIds: string[];
  selectedFacetValues: Record<string, string[]>;
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
      facetCounts: expectedFilteredFacetCounts(createdFacets, facets, nextDefinitions, {
        [facets[0].sourceSlug]: 'red',
        [facets[1].sourceSlug]: 'm',
      }),
      selectedFacetValues: {
        [facets[0].facetSlug]: ['red'],
        [facets[1].facetSlug]: ['m'],
      },
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
      facetCounts: expectedFilteredFacetCounts(createdFacets, facets, productDefinitions, {
        [facets[2].sourceSlug]: 'cotton',
        [facets[3].sourceSlug]: 'modern',
      }),
      selectedFacetValues: {
        [facets[2].facetSlug]: ['cotton'],
        [facets[3].facetSlug]: ['modern'],
      },
      facets: [materialCottonFilter, styleModernFilter],
    });
  });

  test('removes and rewrites indexed memberships across product and facet lifecycle changes', async ({ api }) => {
    const unique = crypto.randomUUID().slice(0, 8);
    const facets = facetDefinitions(unique, 'lifecycle');
    const category = await api.admin.category.create({
      handle: `auto-lifecycle-category-${unique}`,
      name: 'Auto Lifecycle Listing Category',
    });
    const warehouse = await createWarehouse(api, `AUTO-LIFE-${unique}`);

    await createSourceProducts(api, unique, facets);
    const createdFacets = await createOptionFacets(api, facets);
    const productDefinitions = productMatrix(unique, facets, 8, 8);

    const indexedProducts: ApiProduct[] = [];
    for (const definition of productDefinitions) {
      indexedProducts.push(
        await createListingProduct(api, {
          definition,
          category,
          warehouseId: warehouse.id,
        }),
      );
    }

    const expectedProducts = [...indexedProducts];
    const expectedDefinitions = [...productDefinitions];
    const removeExpectedProduct = (product: ApiProduct) => {
      const index = expectedProducts.findIndex((candidate) => candidate.id === product.id);
      if (index < 0) {
        throw new Error(`Product ${product.id} is not tracked by lifecycle expectations`);
      }

      expectedProducts.splice(index, 1);
      expectedDefinitions.splice(index, 1);
    };

    await expectListingSnapshot(api, category, {
      totalCount: expectedProducts.length,
      productIds: expectedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, expectedDefinitions),
    });

    indexedProducts[0] = await updateProductStatus(api, indexedProducts[0], 'DRAFT');
    removeExpectedProduct(indexedProducts[0]);
    await expectListingSnapshot(api, category, {
      totalCount: expectedProducts.length,
      productIds: expectedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, expectedDefinitions),
    });

    indexedProducts[1] = await removeProductFromCategory(api, indexedProducts[1], category);
    await expectProductCategoryAssignment(api, indexedProducts[1], category, false);
    removeExpectedProduct(indexedProducts[1]);
    await expectListingSnapshot(api, category, {
      totalCount: expectedProducts.length,
      productIds: expectedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, expectedDefinitions),
    });

    indexedProducts[2] = await updateProductVariantInventory(api, indexedProducts[2], {
      warehouseId: warehouse.id,
      onHand: 0,
    });
    await sleep(5_000);
    const unavailableProduct = indexedProducts[2];
    const availableProducts = () =>
      expectedProducts.filter((product) => product.id !== unavailableProduct.id);
    const availableDefinitions = () =>
      expectedDefinitions.filter(
        (_definition, index) => expectedProducts[index].id !== unavailableProduct.id,
      );

    const lifecycleProductDefinition = expectedDefinitions[0];
    const lifecycleColor = lifecycleProductDefinition.options[facets[0].sourceSlug];
    const lifecycleSnapshot = await readListingSnapshot(api, category);
    const lifecycleColorFilter = facetValueInput(lifecycleSnapshot.facets, facets[0].facetSlug, lifecycleColor);
    const lifecycleColorProducts = availableProducts().filter(
      (product) => {
        const index = expectedProducts.findIndex((candidate) => candidate.id === product.id);
        return expectedDefinitions[index].options[facets[0].sourceSlug] === lifecycleColor;
      },
    );

    await updateFacetDisplayValueEnabled(api, createdFacets[0], lifecycleColor, false);
    await expectListingErrors(api, category, {
      facets: [lifecycleColorFilter],
      expectedErrors: [
        {
          code: 'VALUE_DISABLED',
          messageIncludes: `${facets[0].facetSlug}:${lifecycleColor}`,
        },
      ],
    });

    await updateFacetDisplayValueEnabled(api, createdFacets[0], lifecycleColor, true);
    await expectListingSnapshot(api, category, {
      totalCount: lifecycleColorProducts.length,
      productIds: lifecycleColorProducts.map((product) => product.id),
      facets: [lifecycleColorFilter],
    });

    const availabilitySnapshot = await expectListingSnapshot(api, category, {
      totalCount: availableProducts().length,
      productIds: availableProducts().map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, availableDefinitions()),
      availableCount: availableProducts().length,
      facets: [{ available: true }],
    });
    const availableFilter = availabilityFacetInput(availabilitySnapshot.facets);
    await expectListingSnapshot(api, category, {
      totalCount: availableProducts().length,
      productIds: availableProducts().map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, availableDefinitions()),
      availableCount: availableProducts().length,
      facets: [availableFilter],
    });

    const unfilteredAvailabilitySnapshot = await expectListingSnapshot(api, category, {
      totalCount: expectedProducts.length,
      productIds: expectedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(createdFacets, facets, availableDefinitions()),
      availableCount: availableProducts().length,
    });
    expect(unfilteredAvailabilitySnapshot.productIds.at(-1)).toBe(unavailableProduct.id);

    await deleteFacet(api, createdFacets[3].id);
    await expectListingSnapshot(api, category, {
      totalCount: expectedProducts.length,
      productIds: expectedProducts.map((product) => product.id),
      facetCounts: expectedFacetCounts(
        createdFacets.slice(0, 3),
        facets.slice(0, 3),
        availableDefinitions(),
      ),
      availableCount: availableProducts().length,
      missingFacetIds: [createdFacets[3].id],
    });

    await deleteProduct(api, indexedProducts[4]);
    removeExpectedProduct(indexedProducts[4]);
    // Contract: facet metadata contains only enabled values represented in the current scope.
    const finalFacetCounts = expectedFacetCounts(
      createdFacets.slice(0, 3),
      facets.slice(0, 3),
      availableDefinitions(),
    );
    const zeroCountFacetValues = Object.entries(finalFacetCounts).flatMap(
      ([facetId, values]) =>
        Object.entries(values)
          .filter(([, count]) => count === 0)
          .map(([valueId]) => ({ facetId, valueId })),
    );
    const visibleFinalFacetCounts = Object.fromEntries(
      Object.entries(finalFacetCounts).map(([facetId, values]) => [
        facetId,
        Object.fromEntries(Object.entries(values).filter(([, count]) => count > 0)),
      ]),
    );
    const finalSnapshot = await expectListingSnapshot(api, category, {
      totalCount: expectedProducts.length,
      productIds: expectedProducts.map((product) => product.id),
      facetCounts: visibleFinalFacetCounts,
      availableCount: availableProducts().length,
      missingFacetIds: [createdFacets[3].id],
    });
    // A configured value with no remaining memberships is omitted instead of returned with count 0.
    for (const { facetId, valueId } of zeroCountFacetValues) {
      const facet = finalSnapshot.facets.find((candidate) => candidate.id === facetId);
      expect(facet?.values.some((value) => value.id === valueId) ?? false).toBe(false);
    }
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
  const combinationCount = facets.reduce((acc, facet) => acc * facet.values.length, 1);

  return Array.from({ length: count }, (_, index) => {
    const ordinal = String(index + 1).padStart(2, '0');
    let combinationIndex = (index * 17) % combinationCount;

    return {
      title: `Auto Indexed Product ${ordinal}`,
      handle: `auto-indexed-product-${unique}-${ordinal}`,
      options: Object.fromEntries(
        facets.map((facet) => {
          const value = facet.values[combinationIndex % facet.values.length];
          combinationIndex = Math.floor(combinationIndex / facet.values.length);

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

  return product;
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

function expectedFilteredFacetCounts(
  createdFacets: ApiFacet[],
  facets: FacetDefinition[],
  products: ProductDefinition[],
  selectedValues: OptionValues,
): Record<string, Record<string, number>> {
  return Object.fromEntries(
    facets.map((facet, index) => [
      createdFacets[index].slug,
      Object.fromEntries(
        facet.values.map((value) => [
          value.handle,
          products.filter(
            (product) =>
              product.options[facet.sourceSlug] === value.handle
              && Object.entries(selectedValues).every(
                ([sourceSlug, selectedValue]) =>
                  sourceSlug === facet.sourceSlug || product.options[sourceSlug] === selectedValue,
              ),
          ).length,
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

async function removeProductFromCategory(
  api: Api,
  product: ApiProduct,
  category: CategoryData,
): Promise<ApiProduct> {
  return api.admin.product.update({
    productId: product.id,
    operations: {
      categories: [
        {
          action: 'REMOVE',
          categoryId: category.id,
        },
      ],
    },
  });
}

async function expectProductCategoryAssignment(
  api: Api,
  product: ApiProduct,
  category: CategoryData,
  assigned: boolean,
): Promise<void> {
  const latestProduct = await api.admin.product.findOne(product.id);
  expect(
    latestProduct.categoryAssignments.some((assignment) => assignment.category.id === category.id),
  ).toBe(assigned);
}

async function updateProductStatus(
  api: Api,
  product: ApiProduct,
  status: ProductDefinition['status'],
): Promise<ApiProduct> {
  return api.admin.product.update({
    productId: product.id,
    operations: { status },
  });
}

async function updateProductVariantInventory(
  api: Api,
  product: ApiProduct,
  input: {
    warehouseId: string;
    onHand: number;
  },
): Promise<ApiProduct> {
  const latestProduct = await api.admin.product.findOne(product.id);
  const variant = latestProduct.variants.edges[0]?.node;
  if (!variant) {
    throw new Error(`Product ${product.id} does not have a variant to update inventory`);
  }

  return api.admin.product.update({
    productId: latestProduct.id,
    expectedRevision: latestProduct.revision,
    operations: {
      variants: [
        {
          action: 'UPDATE',
          variantId: variant.id,
          inventory: {
            warehouseId: input.warehouseId,
            onHand: input.onHand,
          },
        },
      ],
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateFacetDisplayValueEnabled(
  api: Api,
  facet: ApiFacet,
  valueHandle: string,
  enabled: boolean,
): Promise<void> {
  const value = facet.values.find((candidate) => candidate.handle === valueHandle);
  if (!value) {
    throw new Error(`Facet ${facet.id} does not have display value ${valueHandle}`);
  }

  const { data } = await api.admin.mutation('facet-api/FacetValueUpdate', {
    variables: {
      input: {
        id: value.id,
        enabled,
      },
    },
  });
  const result = data.listingMutation.facetValueUpdate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.facetValue?.enabled).toBe(enabled);
}

async function deleteFacet(api: Api, facetId: string): Promise<void> {
  const { data } = await api.admin.mutation('facet-api/FacetDelete', {
    variables: {
      input: { id: facetId },
    },
  });
  const result = data.listingMutation.facetDelete;
  expect(result.userErrors).toHaveLength(0);
  expect(result.deletedFacetId).toBe(facetId);
}

async function deleteProduct(api: Api, product: ApiProduct): Promise<void> {
  const { data } = await api.admin.mutation('inventory-api/ProductDelete', {
    variables: {
      input: { id: product.id },
    },
  });
  const result = data.catalogMutation.productDelete;
  expect(result.userErrors).toHaveLength(0);
  expect(result.deletedProductId).toBe(product.id);
}

async function expectListingSnapshot(
  api: Api,
  category: CategoryData,
  expected: {
    totalCount: number;
    productIds: string[];
    facetCounts?: Record<string, Record<string, number>>;
    availableCount?: number;
    missingFacetIds?: string[];
    selectedFacetValues?: Record<string, string[]>;
    facets?: ApiListingProductFilter[];
    expectedErrors?: { code: string; messageIncludes: string }[];
  },
): Promise<ListingSnapshot> {
  let lastSnapshot: ListingSnapshot | null = null;
  let lastMismatchSignature: string | null = null;

  await expect
    .poll(
      async () => {
        lastSnapshot = await readListingSnapshot(
          api,
          category,
          expected.facets,
          expected.expectedErrors,
        );

        const actual: ListingSnapshotComparison = {
          totalCount: lastSnapshot.totalCount,
          productIds: [...lastSnapshot.productIds].sort(),
          facetCounts: readFacetCounts(lastSnapshot.facets, expected.facetCounts),
          availableCount: readAvailabilityCount(lastSnapshot.facets),
          missingFacetIds: (expected.missingFacetIds ?? []).filter((facetId) =>
            lastSnapshot?.facets.some((facet) => facet.id === facetId),
          ),
          selectedFacetValues: readSelectedFacetValues(
            lastSnapshot.facets,
            expected.selectedFacetValues,
          ),
        };
        const expectedSnapshot: ListingSnapshotComparison = {
          totalCount: expected.totalCount,
          productIds: [...expected.productIds].sort(),
          facetCounts: expected.facetCounts ?? {},
          availableCount: expected.availableCount ?? expected.totalCount,
          missingFacetIds: [],
          selectedFacetValues: expected.selectedFacetValues ?? {},
        };
        const mismatchSignature = JSON.stringify(actual);

        if (
          mismatchSignature !== JSON.stringify(expectedSnapshot) &&
          mismatchSignature !== lastMismatchSignature
        ) {
          lastMismatchSignature = mismatchSignature;
          await logListingMismatch(api, category, actual, expectedSnapshot);
        }

        return actual;
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
      availableCount: expected.availableCount ?? expected.totalCount,
      missingFacetIds: [],
      selectedFacetValues: expected.selectedFacetValues ?? {},
    });

  if (!lastSnapshot) {
    throw new Error('Listing snapshot was not read');
  }

  return lastSnapshot;
}

async function logListingMismatch(
  api: Api,
  category: CategoryData,
  actual: ListingSnapshotComparison,
  expected: ListingSnapshotComparison,
): Promise<void> {
  const expectedProductIds = new Set(expected.productIds);
  const actualProductIds = new Set(actual.productIds);
  const unexpectedProductIds = actual.productIds.filter(
    (id) => !expectedProductIds.has(id),
  );
  const missingProductIds = expected.productIds.filter(
    (id) => !actualProductIds.has(id),
  );
  const unexpectedProducts = await Promise.all(
    unexpectedProductIds.map(async (productId) => {
      try {
        const product = await api.admin.product.findOne(productId);
        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          revision: product.revision,
          isPublished: product.isPublished,
          publishedAt: product.publishedAt,
          updatedAt: product.updatedAt,
          assignedCategoryIds: product.categoryAssignments.map(
            (assignment) => assignment.category.id,
          ),
          assignedToListingCategory: product.categoryAssignments.some(
            (assignment) => assignment.category.id === category.id,
          ),
          variants: product.variants.edges.map(({ node }) => ({
            id: node.id,
            handle: node.handle,
            inventoryItemId: node.inventoryItem?.id ?? null,
            trackInventory: node.inventoryItem?.trackInventory ?? null,
          })),
        };
      } catch (error) {
        return {
          id: productId,
          lookupError: error instanceof Error ? error.message : String(error),
        };
      }
    }),
  );

  console.warn(
    '[listing-auto-indexing] listing snapshot mismatch',
    JSON.stringify(
      {
        categoryId: category.id,
        actual,
        expected,
        unexpectedProductIds,
        missingProductIds,
        unexpectedProducts,
      },
      null,
      2,
    ),
  );
}

async function expectListingErrors(
  api: Api,
  category: CategoryData,
  expected: {
    facets?: ApiListingProductFilter[];
    expectedErrors: { code: string; messageIncludes: string }[];
  },
): Promise<void> {
  await expect
    .poll(
      async () => {
        const { errors } = await api.admin.query('listing-api/Listing', {
          variables: {
            first: 50,
            locale: 'en',
            currency: 'USD',
            scope: {
              kind: 'CATEGORY',
              categoryId: category.id,
            },
            facets: expected.facets,
          },
          throwOnError: false,
        });

        return expected.expectedErrors.every((error) =>
          (errors ?? []).some(
            (actual) =>
              actual.message.includes(error.messageIncludes) &&
              actual.extensions?.code === error.code,
          ),
        );
      },
      {
        timeout: 60_000,
        intervals: [500, 1_000, 2_000, 5_000],
      },
    )
    .toBe(true);
}

async function readListingSnapshot(
  api: Api,
  category: CategoryData,
  facets?: ApiListingProductFilter[],
  expectedErrors?: { code: string; messageIncludes: string }[],
): Promise<ListingSnapshot> {
  const { data, errors } = await api.admin.query('listing-api/Listing', {
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
    throwOnError: expectedErrors ? false : undefined,
  });
  if (expectedErrors) {
    expect(errors ?? []).toEqual(
      expect.arrayContaining(
        expectedErrors.map((error) =>
          expect.objectContaining({
            message: expect.stringContaining(error.messageIncludes),
            extensions: expect.objectContaining({
              code: error.code,
            }),
          }),
        ),
      ),
    );
  }
  const listing = data.listingQuery.listing;

  return {
    totalCount: listing.totalCount,
    productIds: listing.edges.map((edge) => edge.node.id),
    facets: listing.facets,
  };
}

function readFacetCounts(
  facets: ApiListingFacet[],
  expected?: Record<string, Record<string, number>>,
) {
  if (!expected) {
    return {};
  }

  return Object.fromEntries(
    Object.keys(expected).map((facetId) => {
      const facet = facets.find((candidate) => candidate.id === facetId);

      return [
        facetId,
        Object.fromEntries((facet?.values ?? []).map((value) => [value.id, value.count])),
      ];
    }),
  );
}

function readAvailabilityCount(facets: ApiListingFacet[]) {
  const facet = facets.find((candidate) => candidate.id === 'available');
  const value = facet?.values.find((candidate) => candidate.id === 'true');

  return value?.count ?? null;
}

function readSelectedFacetValues(facets: ApiListingFacet[], expected?: Record<string, string[]>) {
  if (!expected) {
    return {};
  }

  return Object.fromEntries(
    Object.keys(expected).map((facetId) => {
      const facet = facets.find((candidate) => candidate.id === facetId);

      return [
        facetId,
        (facet?.values.filter((value) => value.selected).map((value) => value.id) ?? []).sort(),
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

  const expectedInput: ApiListingProductFilter = {
    variantFacet: {
      facet: facetId,
      value: valueId,
    },
  };
  const input = value.input as ApiListingProductFilter | null | undefined;
  expect(input, `Listing facet value ${facetId}:${valueId} must expose reusable input`).toEqual(expectedInput);

  if (!input) {
    throw new Error(`Listing facet value ${facetId}:${valueId} did not expose reusable input`);
  }

  return input;
}

function availabilityFacetInput(facets: ApiListingFacet[]) {
  const facet = facets.find((candidate) => candidate.id === 'available');
  const value = facet?.values.find((candidate) => candidate.id === 'true');

  if (!facet || !value) {
    throw new Error('Missing listing availability facet value input');
  }

  const expectedInput: ApiListingProductFilter = {
    available: true,
  };
  const input = value.input as ApiListingProductFilter | null | undefined;
  expect(input, 'Listing availability facet value must expose reusable input').toEqual(expectedInput);

  if (!input) {
    throw new Error('Listing availability facet value did not expose reusable input');
  }

  return input;
}
