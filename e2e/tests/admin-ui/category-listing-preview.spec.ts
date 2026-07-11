import type { ApiListingFacet, ApiProduct } from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import type { CategoryData } from '@fixtures/admin/category';
import { expect, type Locator, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface FacetDefinition {
  facetType: 'OPTION' | 'TAG';
  sourceSlug: string;
  facetSlug: string;
  label: string;
  productField: 'colors' | 'sizes' | 'tags';
  values: Array<{ handle: string; label: string }>;
  groups?: Array<{
    handle: string;
    label: string;
    sourceValueHandles: string[];
  }>;
}

interface PreviewProductDefinition {
  title: string;
  handle: string;
  colors: string[];
  sizes: string[];
  tags: string[];
  priceMinor: number;
  stock: number;
  inStock: boolean;
}

interface PublicFacetValueDefinition {
  handle: string;
  label: string;
  sourceValueHandles: string[];
}

interface SeededPreviewProduct {
  definition: PreviewProductDefinition;
  product: ApiProduct;
}

interface CatalogTag {
  id: string;
  handle: string;
  name: string;
}

const PRODUCT_COUNT = 20;
const IN_STOCK_PRODUCT_COUNT = 15;

const facetDefinitions = (unique: string): FacetDefinition[] => [
  {
    facetType: 'OPTION',
    sourceSlug: `preview-color-${unique}`,
    facetSlug: `preview-color-facet-${unique}`,
    label: 'Color',
    productField: 'colors',
    values: [
      { handle: 'red', label: 'Red' },
      { handle: 'orange', label: 'Orange' },
      { handle: 'blue', label: 'Blue' },
      { handle: 'green', label: 'Green' },
      { handle: 'black', label: 'Black' },
    ],
    groups: [
      {
        handle: 'warm',
        label: 'Warm',
        sourceValueHandles: ['red', 'orange'],
      },
      {
        handle: 'cool',
        label: 'Cool',
        sourceValueHandles: ['blue', 'green'],
      },
    ],
  },
  {
    facetType: 'OPTION',
    sourceSlug: `preview-size-${unique}`,
    facetSlug: `preview-size-facet-${unique}`,
    label: 'Size',
    productField: 'sizes',
    values: [
      { handle: 's', label: 'S' },
      { handle: 'm', label: 'M' },
      { handle: 'l', label: 'L' },
    ],
  },
  {
    facetType: 'TAG',
    sourceSlug: 'tags',
    facetSlug: 'tag',
    label: 'Tags',
    productField: 'tags',
    values: [
      { handle: `preview-summer-${unique}`, label: 'Summer' },
      { handle: `preview-sale-${unique}`, label: 'Sale' },
      { handle: `preview-premium-${unique}`, label: 'Premium' },
    ],
  },
];

function previewProductDefinitions(unique: string): PreviewProductDefinition[] {
  const colorPairs = [
    ['red', 'orange'],
    ['blue', 'green'],
    ['green', 'black'],
    ['black', 'red'],
  ];
  const tagPairs = [
    [`preview-summer-${unique}`, `preview-sale-${unique}`],
    [`preview-sale-${unique}`, `preview-premium-${unique}`],
    [`preview-premium-${unique}`, `preview-summer-${unique}`],
  ];

  return Array.from({ length: PRODUCT_COUNT }, (_, index) => {
    const ordinal = String(index + 1).padStart(2, '0');

    return {
      title: `Listing Preview Product ${ordinal}`,
      handle: `listing-preview-product-${unique}-${ordinal}`,
      colors: colorPairs[index % colorPairs.length],
      sizes: index % 2 === 0 ? ['s'] : ['m', 'l'],
      tags: tagPairs[index % tagPairs.length],
      priceMinor: 1_000 + index * 125,
      stock: 5 + (index % 4),
      inStock: index < IN_STOCK_PRODUCT_COUNT,
    };
  });
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email-input').fill(email);
  await page.getByTestId('sign-in-password-input').fill(password);
  await page.getByTestId('sign-in-submit-button').click();
  await page.waitForFunction(() => localStorage.getItem('auth_access_token') !== null);
}

async function completeProfileIfNeeded(page: Page) {
  const firstNameInput = page.getByTestId('complete-profile-first-name-input');
  await firstNameInput.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByTestId('complete-profile-last-name-input').fill('User');
  await page.getByTestId('complete-profile-submit-button').click();
  await expect(firstNameInput).toBeHidden();
}

async function createWarehouse(api: Api, unique: string): Promise<string> {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `PREVIEW-${unique}`.toUpperCase(),
        name: `Listing Preview Warehouse ${unique}`,
      },
    },
  });
  const result = data.inventoryMutation.warehouseCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.warehouse?.id).toBeTruthy();

  return result.warehouse!.id;
}

async function createFacetSources(
  api: Api,
  unique: string,
  facets: FacetDefinition[],
): Promise<void> {
  for (const facet of facets) {
    if (facet.facetType !== 'OPTION') {
      continue;
    }

    await api.admin.product.createWithOptions({
      title: `Listing Preview ${facet.label} Source ${unique}`,
      handle: `listing-preview-${facet.sourceSlug}-source`,
      options: [
        {
          name: facet.label,
          slug: facet.sourceSlug,
          values: facet.values.map((value) => value.label),
        },
      ],
    });
  }
}

async function createCatalogTags(
  api: Api,
  facet: FacetDefinition,
): Promise<Map<string, CatalogTag>> {
  const tags = new Map<string, CatalogTag>();

  for (const value of facet.values) {
    const { data } = await api.admin.mutation('inventory-api/TagCreate', {
      variables: { input: { name: value.label, handle: value.handle } },
    });
    const result = data.catalogMutation.tagCreate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.tag).toBeTruthy();
    tags.set(value.handle, result.tag!);
  }

  return tags;
}

async function createListingFacets(
  api: Api,
  facets: FacetDefinition[],
): Promise<void> {
  for (const facet of facets) {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: facet.facetType,
          slug: facet.facetSlug,
          label: facet.label,
          uiType: 'CHECKBOX',
          selectionMode: 'MULTI',
          sources: [{ handle: facet.sourceSlug, name: facet.label }],
          valueCandidates: facet.values.map((value) => ({
            handle: facetSourceValueHandle(facet, value.handle),
            label: value.label,
            sourceHandle: facet.sourceSlug,
          })),
        },
      },
    });
    const createResult = data.listingMutation.facetCreate;
    expect(createResult.userErrors).toHaveLength(0);
    expect(createResult.facet).toBeTruthy();

    const sourceFacet = createResult.facet!;
    const sourceValues = new Map(sourceFacet.values.map((value) => [value.handle, value]));

    for (const [sortIndex, group] of (facet.groups ?? []).entries()) {
      const groupSourceValueIds = group.sourceValueHandles.map((valueHandle) => {
        const sourceHandle = facetSourceValueHandle(facet, valueHandle);
        const sourceValue = sourceValues.get(sourceHandle);
        if (!sourceValue) {
          throw new Error(`Missing source value ${sourceHandle}`);
        }
        return sourceValue.id;
      });

      const { data: valueData } = await api.admin.mutation('facet-api/FacetValueCreate', {
        variables: {
          input: {
            facetId: sourceFacet.id,
            kind: 'GROUP',
            handle: group.handle,
            label: group.label,
            sortIndex,
            sourceValueIds: groupSourceValueIds,
          },
        },
      });
      const valueResult = valueData.listingMutation.facetValueCreate;
      expect(valueResult.userErrors).toHaveLength(0);
      expect(valueResult.facetValue).toBeTruthy();
    }
  }
}

function facetSourceValueHandle(facet: FacetDefinition, valueHandle: string): string {
  return facet.facetType === 'OPTION'
    ? `${facet.sourceSlug}:${valueHandle}`
    : valueHandle;
}

function publicFacetValues(facet: FacetDefinition): PublicFacetValueDefinition[] {
  const groups = facet.groups ?? [];
  const groupedSourceValueHandles = new Set(
    groups.flatMap((group) => group.sourceValueHandles),
  );

  return [
    ...groups.map((group) => ({
      handle: group.handle,
      label: group.label,
      sourceValueHandles: group.sourceValueHandles,
    })),
    ...facet.values
      .filter((value) => !groupedSourceValueHandles.has(value.handle))
      .map((value) => ({
        handle: facetSourceValueHandle(facet, value.handle),
        label: value.label,
        sourceValueHandles: [value.handle],
      })),
  ];
}

function productMatchesFacetValue(
  product: PreviewProductDefinition,
  facet: FacetDefinition,
  valueHandle: string,
): boolean {
  const value = publicFacetValues(facet).find(
    (candidate) => candidate.handle === valueHandle,
  );
  if (!value) {
    throw new Error(`Missing selected value ${facet.facetSlug}:${valueHandle}`);
  }

  return value.sourceValueHandles.some((sourceValueHandle) =>
    product[facet.productField].includes(sourceValueHandle),
  );
}

function productMatchesSelectedFacetValues(
  product: PreviewProductDefinition,
  facets: FacetDefinition[],
  selectedFacetValues: Readonly<Record<string, string[]>>,
  excludedFacetSlug?: string,
): boolean {
  return Object.entries(selectedFacetValues).every(
    ([selectedFacetSlug, selectedValueHandles]) => {
      if (selectedFacetSlug === excludedFacetSlug) {
        return true;
      }

      const selectedFacet = facets.find(
        (candidate) => candidate.facetSlug === selectedFacetSlug,
      );
      if (!selectedFacet) {
        throw new Error(`Missing selected facet ${selectedFacetSlug}`);
      }

      return selectedValueHandles.some((selectedValueHandle) =>
        productMatchesFacetValue(product, selectedFacet, selectedValueHandle),
      );
    },
  );
}

async function setVariantStock(
  api: Api,
  input: { inventoryItemId: string; warehouseId: string; onHand: number },
): Promise<void> {
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
  categoryId: string,
  productId: string,
): Promise<void> {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: { categoryId, productId },
  });

  expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
}

async function createPreviewProduct(
  api: Api,
  input: {
    definition: PreviewProductDefinition;
    facets: FacetDefinition[];
    categoryId: string;
    warehouseId: string;
    tagsByHandle: ReadonlyMap<string, CatalogTag>;
  },
): Promise<ApiProduct> {
  const product = await api.admin.product.createWithOptions({
    title: input.definition.title,
    handle: input.definition.handle,
    status: 'PUBLISHED',
    price: input.definition.priceMinor,
    options: [
      {
        name: input.facets[0].label,
        slug: input.facets[0].sourceSlug,
        values: input.definition.colors,
      },
      {
        name: input.facets[1].label,
        slug: input.facets[1].sourceSlug,
        values: input.definition.sizes,
      },
    ],
  });
  const productTags = input.definition.tags.map((handle) => {
    const tag = input.tagsByHandle.get(handle);
    if (!tag) {
      throw new Error(`Missing catalog tag ${handle}`);
    }
    return tag;
  });
  const taggedProduct = await api.admin.product.update({
    productId: product.id,
    expectedRevision: product.revision,
    operations: {
      tags: productTags.map((tag) => ({ tagId: tag.id, action: 'ADD' })),
    },
  });
  expect(taggedProduct.tags.map((tag) => tag.id).sort()).toEqual(
    productTags.map((tag) => tag.id).sort(),
  );

  const expectedVariantCount =
    input.definition.colors.length * input.definition.sizes.length;
  const variants = taggedProduct.variants.edges.map((edge) => edge.node);
  expect(variants).toHaveLength(expectedVariantCount);
  expect([2, 4]).toContain(expectedVariantCount);

  for (const [variantIndex, variant] of variants.entries()) {
    const inventoryItemId = variant.inventoryItem?.id;
    if (!inventoryItemId) {
      throw new Error(`Variant ${variant.id} does not have an inventory item`);
    }

    await setVariantStock(api, {
      inventoryItemId,
      warehouseId: input.warehouseId,
      onHand: input.definition.inStock ? input.definition.stock + variantIndex : 0,
    });
  }

  await addProductToCategory(api, input.categoryId, taggedProduct.id);
  return taggedProduct;
}

function expectedFacetCounts(
  facet: FacetDefinition,
  facets: FacetDefinition[],
  products: PreviewProductDefinition[],
  selectedFacetValues: Readonly<Record<string, string[]>> = {},
  availableOnly = false,
): Record<string, number> {
  return Object.fromEntries(
    publicFacetValues(facet).map((value) => [
      value.handle,
      products.filter((product) => {
        return (
          (!availableOnly || product.inStock) &&
          value.sourceValueHandles.some((handle) =>
            product[facet.productField].includes(handle),
          ) &&
          productMatchesSelectedFacetValues(
            product,
            facets,
            selectedFacetValues,
            facet.facetSlug,
          )
        );
      }).length,
    ]),
  );
}

function expectedAvailableCount(
  facets: FacetDefinition[],
  products: PreviewProductDefinition[],
  selectedFacetValues: Readonly<Record<string, string[]>> = {},
): number {
  return products.filter((product) => {
    return (
      product.inStock &&
      productMatchesSelectedFacetValues(product, facets, selectedFacetValues)
    );
  }).length;
}

async function expectPreviewFacetCounts(
  preview: Locator,
  facets: FacetDefinition[],
  products: PreviewProductDefinition[],
  selectedFacetValues: Readonly<Record<string, string[]>> = {},
  availableOnly = false,
): Promise<void> {
  for (const facet of facets) {
    const expectedCounts = expectedFacetCounts(
      facet,
      facets,
      products,
      selectedFacetValues,
      availableOnly,
    );
    const facetGroup = preview
      .getByTestId(`category-listing-preview-facet-${facet.facetSlug}`)
      .filter({ visible: true });
    await expect(facetGroup).toBeVisible();

    for (const value of publicFacetValues(facet)) {
      const valueRow = facetGroup.getByTestId(
        `category-listing-preview-facet-value-${value.handle}`,
      );
      await expect(valueRow).toContainText(value.label);
      await expect(valueRow).toContainText(String(expectedCounts[value.handle]));
    }
  }

  const availableValue = preview
    .getByTestId('category-listing-preview-facet-available')
    .filter({ visible: true })
    .getByTestId('category-listing-preview-facet-value-true');
  await expect(availableValue).toContainText(
    String(expectedAvailableCount(facets, products, selectedFacetValues)),
  );
}

function listingFacetCounts(
  facets: ApiListingFacet[],
  facetSlug: string,
): Record<string, number> {
  const facet = facets.find((candidate) => candidate.id === facetSlug);
  return Object.fromEntries(facet?.values.map((value) => [value.id, value.count]) ?? []);
}

async function waitForListingIndex(
  api: Api,
  input: {
    category: CategoryData;
    facets: FacetDefinition[];
    products: SeededPreviewProduct[];
  },
): Promise<void> {
  const expectedProductIds = input.products.map(({ product }) => product.id).sort();
  const inStockProducts = input.products.filter(({ definition }) => definition.inStock);
  const outOfStockProducts = input.products.filter(({ definition }) => !definition.inStock);
  const expectedAvailableProductIds = inStockProducts.map(({ product }) => product.id).sort();
  const expectedNameDescProductIds = [inStockProducts, outOfStockProducts]
    .flatMap((group) =>
      [...group].sort((left, right) =>
        right.definition.title.localeCompare(left.definition.title),
      ),
    )
    .map(({ product }) => product.id);
  const definitions = input.products.map(({ definition }) => definition);
  const expectedCounts = Object.fromEntries(
    input.facets.map((facet) => [
      facet.facetSlug,
      expectedFacetCounts(facet, input.facets, definitions),
    ]),
  );

  await expect
    .poll(
      async () => {
        const { data } = await api.admin.query('listing-api/Listing', {
          variables: {
            first: PRODUCT_COUNT,
            locale: 'en',
            currency: 'USD',
            scope: { kind: 'CATEGORY', categoryId: input.category.id },
          },
        });
        const listing = data.listingQuery.listing;
        const { data: nameDescData } = await api.admin.query('listing-api/Listing', {
          variables: {
            first: PRODUCT_COUNT,
            locale: 'en',
            currency: 'USD',
            scope: { kind: 'CATEGORY', categoryId: input.category.id },
            orderBy: { by: 'NAME', direction: 'desc' },
          },
        });
        const { data: availableData } = await api.admin.query('listing-api/Listing', {
          variables: {
            first: PRODUCT_COUNT,
            locale: 'en',
            currency: 'USD',
            scope: { kind: 'CATEGORY', categoryId: input.category.id },
            facets: [{ available: true }],
          },
        });
        const availableFacet = listing.facets.find((facet) => facet.id === 'available');
        const selectedAvailableFacet = availableData.listingQuery.listing.facets.find(
          (facet) => facet.id === 'available',
        );

        return {
          totalCount: listing.totalCount,
          productIds: listing.edges.map((edge) => edge.node.id).sort(),
          availableCount: availableFacet?.values.find((value) => value.id === 'true')?.count,
          availableTotalCount: availableData.listingQuery.listing.totalCount,
          availableSelected:
            selectedAvailableFacet?.values.find((value) => value.id === 'true')?.selected,
          availableProductIds: availableData.listingQuery.listing.edges
            .map((edge) => edge.node.id)
            .sort(),
          nameDescProductIds: nameDescData.listingQuery.listing.edges.map(
            (edge) => edge.node.id,
          ),
          facetCounts: Object.fromEntries(
            input.facets.map((facet) => [
              facet.facetSlug,
              listingFacetCounts(listing.facets, facet.facetSlug),
            ]),
          ),
        };
      },
      {
        timeout: 90_000,
        intervals: [500, 1_000, 2_000, 5_000],
      },
    )
    .toEqual({
      totalCount: PRODUCT_COUNT,
      productIds: expectedProductIds,
      availableCount: IN_STOCK_PRODUCT_COUNT,
      availableTotalCount: IN_STOCK_PRODUCT_COUNT,
      availableSelected: true,
      availableProductIds: expectedAvailableProductIds,
      nameDescProductIds: expectedNameDescProductIds,
      facetCounts: expectedCounts,
    });
}

async function selectPreviewSort(page: Page, label: string): Promise<void> {
  await page.getByTestId('category-listing-preview-sort').click();
  await page.locator('.ant-select-item-option-content').getByText(label, { exact: true }).click();
}

test.describe('Admin category listing preview UI', () => {
  test.describe.configure({ timeout: 300_000 });

  test('renders automatically indexed products, facets, filtering, and name sorting', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });

    const unique = crypto.randomUUID().slice(0, 8);
    const facets = facetDefinitions(unique);
    const definitions = previewProductDefinitions(unique);
    const category = await api.admin.category.create({
      name: `Listing Preview Category ${unique}`,
      handle: `listing-preview-category-${unique}`,
    });
    const warehouseId = await createWarehouse(api, unique);
    const tagFacet = facets.find((facet) => facet.facetType === 'TAG');
    if (!tagFacet) {
      throw new Error('Tag facet definition is missing');
    }

    await createFacetSources(api, unique, facets);
    const tagsByHandle = await createCatalogTags(api, tagFacet);
    await createListingFacets(api, facets);

    const products: SeededPreviewProduct[] = [];
    for (const definition of definitions) {
      products.push({
        definition,
        product: await createPreviewProduct(api, {
          definition,
          facets,
          categoryId: category.id,
          warehouseId,
          tagsByHandle,
        }),
      });
    }

    await waitForListingIndex(api, { category, facets, products });

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(`/${organization.name}/${api.session.projectSlug}/categories`);
    await expect(page.getByTestId('page-title')).toHaveText('Categories');
    await page.getByTestId(`categories-table-name-cell-${category.handle}`).click();

    const categoryModal = page.getByTestId('category-modal');
    await expect(categoryModal).toBeVisible();
    await categoryModal.getByTestId('category-products-preview-button').click();

    const preview = page.getByTestId('category-listing-preview-modal');
    const cards = preview.locator(
      '[data-testid^="category-listing-preview-product-card-"]',
    );
    await expect(preview).toBeVisible();
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${PRODUCT_COUNT} products`,
    );
    await expect(cards).toHaveCount(PRODUCT_COUNT);
    await expect(
      preview.getByRole('heading', { name: category.name, exact: true }),
    ).toBeVisible();

    await expectPreviewFacetCounts(preview, facets, definitions);

    const searchedProduct = definitions[0];
    const searchInput = preview
      .getByTestId('category-listing-preview-search')
      .filter({ visible: true });
    const searchResponsePromise = page.waitForResponse((response) => {
      if (!response.url().includes('/graphql')) {
        return false;
      }

      const request = response.request();
      const body = request.postDataJSON() as {
        operationName?: string;
        variables?: { query?: string | null };
      } | null;

      return (
        body?.operationName === 'CategoryListingPreview' &&
        body.variables?.query === searchedProduct.title
      );
    });

    await searchInput.fill(searchedProduct.title);
    const searchResponse = await searchResponsePromise;
    expect(searchResponse.ok()).toBe(true);
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      '1 products',
    );
    await expect(cards).toHaveCount(1);
    await expect(
      preview.getByTestId(
        `category-listing-preview-product-card-${searchedProduct.handle}`,
      ),
    ).toBeVisible();
    for (const definition of definitions.slice(1)) {
      await expect(
        preview.getByTestId(`category-listing-preview-product-card-${definition.handle}`),
      ).toBeHidden();
    }

    await searchInput.clear();
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${PRODUCT_COUNT} products`,
    );
    await expect(cards).toHaveCount(PRODUCT_COUNT);

    await selectPreviewSort(page, 'Name Z to A');
    const nameDescDefinitions = [
      definitions.filter((definition) => definition.inStock),
      definitions.filter((definition) => !definition.inStock),
    ].flatMap((group) =>
      [...group].sort((left, right) => right.title.localeCompare(left.title)),
    );
    await expect(cards.first()).toContainText(nameDescDefinitions[0].title);
    await expect(cards.last()).toContainText(nameDescDefinitions.at(-1)!.title);

    const availableFacet = preview
      .getByTestId('category-listing-preview-facet-available')
      .filter({ visible: true });
    const availableValue = availableFacet.getByTestId(
      'category-listing-preview-facet-value-true',
    );
    await expect(availableValue).toContainText(String(IN_STOCK_PRODUCT_COUNT));
    const availableSwitch = availableValue.getByRole('switch', {
      name: `Available: Available, ${IN_STOCK_PRODUCT_COUNT} products`,
    });
    await expect(availableSwitch).toBeVisible();
    const inStockProducts = products.filter(({ definition }) => definition.inStock);
    const outOfStockProducts = products.filter(({ definition }) => !definition.inStock);
    for (const { definition } of outOfStockProducts) {
      await expect(
        preview.getByTestId(`category-listing-preview-product-card-${definition.handle}`),
      ).toBeVisible();
    }

    await availableSwitch.click();
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${IN_STOCK_PRODUCT_COUNT} products`,
    );
    await expect(cards).toHaveCount(IN_STOCK_PRODUCT_COUNT);
    await expect(preview.getByText('Available: Available', { exact: true })).toBeVisible();
    await expectPreviewFacetCounts(preview, facets, definitions, {}, true);

    for (const { definition } of inStockProducts) {
      await expect(
        preview.getByTestId(`category-listing-preview-product-card-${definition.handle}`),
      ).toBeVisible();
    }
    for (const { definition } of outOfStockProducts) {
      await expect(
        preview.getByTestId(`category-listing-preview-product-card-${definition.handle}`),
      ).toBeHidden();
    }

    await preview.getByRole('button', { name: 'Clear all' }).first().click();
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${PRODUCT_COUNT} products`,
    );
    await expect(cards).toHaveCount(PRODUCT_COUNT);
    await expect(preview.getByText('Available: Available', { exact: true })).toBeHidden();
    await expectPreviewFacetCounts(preview, facets, definitions);

    const colorFacet = preview
      .getByTestId(`category-listing-preview-facet-${facets[0].facetSlug}`)
      .filter({ visible: true });
    await colorFacet
      .getByTestId('category-listing-preview-facet-value-warm')
      .getByRole('checkbox')
      .click();

    const warmColors = new Set(['red', 'orange']);
    const warmProducts = products.filter(
      ({ definition }) => definition.colors.some((color) => warmColors.has(color)),
    );
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${warmProducts.length} products`,
    );
    await expect(cards).toHaveCount(warmProducts.length);
    await expect(preview.getByText('Color: Warm', { exact: true })).toBeVisible();
    await expectPreviewFacetCounts(preview, facets, definitions, {
      [facets[0].facetSlug]: ['warm'],
    });

    for (const { definition } of warmProducts) {
      await expect(
        preview.getByTestId(`category-listing-preview-product-card-${definition.handle}`),
      ).toBeVisible();
    }

    await preview.getByRole('button', { name: 'Clear all' }).first().click();
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${PRODUCT_COUNT} products`,
    );
    await expect(cards).toHaveCount(PRODUCT_COUNT);
    await expect(preview.getByText('Color: Warm', { exact: true })).toBeHidden();
    await expectPreviewFacetCounts(preview, facets, definitions);

    const saleTag = tagFacet.values.find((value) => value.label === 'Sale');
    if (!saleTag) {
      throw new Error('Sale tag definition is missing');
    }
    await availableSwitch.click();
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${IN_STOCK_PRODUCT_COUNT} products`,
    );
    await expectPreviewFacetCounts(preview, facets, definitions, {}, true);
    const tagsFacet = preview
      .getByTestId(`category-listing-preview-facet-${tagFacet.facetSlug}`)
      .filter({ visible: true });
    await tagsFacet
      .getByTestId(`category-listing-preview-facet-value-${saleTag.handle}`)
      .getByRole('checkbox')
      .click();

    const saleProducts = products.filter(
      ({ definition }) => definition.inStock && definition.tags.includes(saleTag.handle),
    );
    await expect(preview.getByTestId('category-listing-preview-total-count')).toHaveText(
      `${saleProducts.length} products`,
    );
    await expect(cards).toHaveCount(saleProducts.length);
    await expect(preview.getByText('Tags: Sale', { exact: true })).toBeVisible();
    await expectPreviewFacetCounts(preview, facets, definitions, {
      [tagFacet.facetSlug]: [saleTag.handle],
    }, true);

    for (const { definition } of saleProducts) {
      await expect(
        preview.getByTestId(`category-listing-preview-product-card-${definition.handle}`),
      ).toBeVisible();
    }

    await expect(preview.getByTestId('category-listing-preview-pagination-prev')).toBeDisabled();
    await expect(preview.getByTestId('category-listing-preview-pagination-next')).toBeDisabled();
  });
});
