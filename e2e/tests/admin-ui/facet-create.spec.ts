import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Locator, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface ProductSeedInput {
  title: string;
  handle: string;
  colors: Array<{ name: string; slug: string }>;
  brands: Array<{ name: string; slug: string }>;
  tagHandles: string[];
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
  await firstNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByTestId('complete-profile-last-name-input').fill('User');
  await page.getByTestId('complete-profile-submit-button').click();
  await expect(firstNameInput).toBeHidden();
}

async function createTag(api: Api, name: string, handle: string) {
  const { data } = await api.admin.mutation('inventory-api/TagCreate', {
    variables: { input: { name, handle } },
  });

  const result = data.catalogMutation.tagCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.tag?.id).toBeTruthy();

  return result.tag!;
}

async function createProduct(api: Api, input: ProductSeedInput) {
  const { data } = await api.admin.mutation('inventory-api/ProductCreate', {
    variables: {
      input: {
        title: input.title,
        handle: input.handle,
        options: [
          {
            name: 'Color',
            slug: 'color',
            displayType: 'BUTTONS',
            sortIndex: 0,
            values: input.colors.map((color, sortIndex) => ({
              ...color,
              sortIndex,
            })),
          },
        ],
        variants: input.colors.map((color) => ({ handle: color.slug })),
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.product?.id).toBeTruthy();
  expect(result.product?.variants.edges).toHaveLength(input.colors.length);

  return result.product!;
}

async function syncBrandFeature(
  api: Api,
  productId: string,
  brands: Array<{ name: string; slug: string }>,
) {
  const { data } = await api.admin.mutation('inventory-api/ProductFeaturesSync', {
    variables: {
      input: {
        productId,
        features: [
          {
            index: [0],
            isGroup: false,
            name: 'Brand',
            slug: 'brand',
            values: brands.map((brand, index) => ({
              ...brand,
              index,
            })),
          },
        ],
      },
    },
  });

  const result = data.catalogMutation.productFeaturesSync;
  expect(result.userErrors).toHaveLength(0);
  expect(result.features).toHaveLength(1);
}

async function addTagsToProduct(
  api: Api,
  product: { id: string; revision: number },
  tagIds: string[],
) {
  const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
    variables: {
      productId: product.id,
      expectedRevision: product.revision,
      operations: {
        tags: tagIds.map((tagId) => ({ tagId, action: 'ADD' })),
      },
    },
  });

  const result = data.catalogMutation.productUpdate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.product.tags.map((tag: { id: string }) => tag.id).sort()).toEqual(
    [...tagIds].sort(),
  );
}

async function seedFacetCandidates(api: Api, unique: string) {
  const tags = [
    { key: 'summer', name: `Summer ${unique}`, handle: `summer-${unique}` },
    { key: 'sale', name: `Sale ${unique}`, handle: `sale-${unique}` },
    { key: 'premium', name: `Premium ${unique}`, handle: `premium-${unique}` },
  ];
  const tagByKey = new Map<string, Awaited<ReturnType<typeof createTag>>>();

  for (const tag of tags) {
    tagByKey.set(tag.key, await createTag(api, tag.name, tag.handle));
  }

  const products: ProductSeedInput[] = [
    {
      title: `Facet Candidate Product A ${unique}`,
      handle: `facet-candidate-product-a-${unique}`,
      colors: [
        { name: 'Red', slug: 'red' },
        { name: 'Blue', slug: 'blue' },
      ],
      brands: [
        { name: 'Nike', slug: 'nike' },
        { name: 'Adidas', slug: 'adidas' },
      ],
      tagHandles: ['summer', 'sale'],
    },
    {
      title: `Facet Candidate Product B ${unique}`,
      handle: `facet-candidate-product-b-${unique}`,
      colors: [
        { name: 'Red', slug: 'red' },
        { name: 'Green', slug: 'green' },
      ],
      brands: [
        { name: 'Nike', slug: 'nike' },
        { name: 'Puma', slug: 'puma' },
      ],
      tagHandles: ['summer', 'premium'],
    },
    {
      title: `Facet Candidate Product C ${unique}`,
      handle: `facet-candidate-product-c-${unique}`,
      colors: [
        { name: 'Blue', slug: 'blue' },
        { name: 'Green', slug: 'green' },
      ],
      brands: [
        { name: 'Adidas', slug: 'adidas' },
        { name: 'Puma', slug: 'puma' },
      ],
      tagHandles: ['sale', 'premium'],
    },
  ];

  for (const productInput of products) {
    const product = await createProduct(api, productInput);
    await addTagsToProduct(
      api,
      product,
      productInput.tagHandles.map((key) => {
        const tag = tagByKey.get(key);
        if (!tag) throw new Error(`Missing tag ${key}`);
        return tag.id;
      }),
    );
    await syncBrandFeature(api, product.id, productInput.brands);
  }

  return tags;
}

function gridRows(grid: Locator) {
  return grid.locator('.ag-center-cols-container .ag-row');
}

async function selectFacetSource(
  page: Page,
  input: {
    search: string;
    rowText: string;
    buttonText: string;
  },
) {
  await page.getByTestId('create-facet-source-button').click();

  const picker = page.getByTestId('entity-picker-modal');
  await expect(picker).toBeVisible();
  await picker.getByTestId('search-input').fill(input.search);

  const row = gridRows(picker.getByTestId('facet-source-picker-grid'))
    .filter({ hasText: input.rowText })
    .first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(picker.getByRole('button', { name: 'Save' })).toBeEnabled();
  await picker.getByRole('button', { name: 'Save' }).click();
  await expect(picker).toBeHidden();
  await expect(page.getByTestId('create-facet-source-button')).toContainText(
    input.buttonText,
  );
}

async function selectAllFacetValueCandidates(page: Page, handles: string[]) {
  const grid = page.getByTestId('facet-value-candidates-grid');
  await expect(gridRows(grid)).toHaveCount(handles.length);

  for (const handle of handles) {
    const cell = page.getByTestId(`facet-value-candidate-cell-${handle}`);
    await expect(cell).toBeVisible();
    await cell.click();
  }
}

async function createFacetFromCandidates(
  page: Page,
  input: {
    label: string;
    sourceSearch: string;
    sourceRowText: string;
    sourceButtonText: string;
    candidateHandles: string[];
  },
) {
  await page.getByTestId('facets-create-button').click();
  const modal = page.getByTestId('create-facet-modal');
  await expect(modal).toBeVisible();

  await selectFacetSource(page, {
    search: input.sourceSearch,
    rowText: input.sourceRowText,
    buttonText: input.sourceButtonText,
  });
  await modal.getByTestId('create-facet-label-input').fill(input.label);
  await selectAllFacetValueCandidates(page, input.candidateHandles);

  await page.getByTestId('submit-create-facet-form-button').click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

async function expectFacetRow(
  page: Page,
  input: {
    slug: string;
    label: string;
    valueLabels: string[];
  },
) {
  const cell = page.getByTestId(`facets-table-name-cell-${input.slug}`);
  await expect(cell).toBeVisible();
  await expect(cell).toContainText(input.label);

  const row = page
    .getByTestId('facets-table')
    .locator('.ag-center-cols-container .ag-row')
    .filter({ has: cell })
    .first();

  for (const label of input.valueLabels) {
    await expect(row).toContainText(label);
  }
}

async function expectFacetModalValues(
  page: Page,
  input: {
    slug: string;
    label: string;
    valueLabels: string[];
  },
) {
  await page.getByTestId(`facets-table-name-cell-${input.slug}`).click();

  const modal = page.getByTestId('edit-facet-modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText(input.label);
  await expect(modal.getByTestId('edit-facet-values-list')).toBeVisible();

  const inputs = modal.getByTestId('edit-options-value-name-input');
  await expect(inputs).toHaveCount(input.valueLabels.length);
  await expect
    .poll(async () => {
      const count = await inputs.count();
      const values = await Promise.all(
        Array.from({ length: count }, (_, index) => inputs.nth(index).inputValue()),
      );
      return values.sort();
    })
    .toEqual([...input.valueLabels].sort());

  await modal.locator('button').first().click();
  await expect(modal).toBeHidden();
}

test.describe('Admin facets create UI', () => {
  test.setTimeout(120_000);

  test('creates option, feature, and tag facets from deduplicated value candidates', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    const tags = await seedFacetCandidates(api, unique);
    const facetsUrl = `/${organization.name}/${api.session.projectSlug}/facets`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(facetsUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Facets');
    await expect(page.getByTestId('facets-table')).toBeVisible();

    const optionFacet = {
      label: `Facet Color ${unique}`,
      slug: `facet-color-${unique}`,
      candidateHandles: ['color:blue', 'color:green', 'color:red'],
      valueLabels: ['Blue', 'Green', 'Red'],
    };
    const featureFacet = {
      label: `Facet Brand ${unique}`,
      slug: `facet-brand-${unique}`,
      candidateHandles: ['brand:adidas', 'brand:nike', 'brand:puma'],
      valueLabels: ['Adidas', 'Nike', 'Puma'],
    };
    const tagFacet = {
      label: `Facet Tags ${unique}`,
      slug: `facet-tags-${unique}`,
      candidateHandles: tags.map((tag) => tag.handle).sort(),
      valueLabels: tags
        .map((tag) => ({ handle: tag.handle, label: tag.name }))
        .sort((left, right) => left.handle.localeCompare(right.handle))
        .map((tag) => tag.label),
    };

    await createFacetFromCandidates(page, {
      label: optionFacet.label,
      sourceSearch: 'color',
      sourceRowText: 'Color',
      sourceButtonText: 'Color',
      candidateHandles: optionFacet.candidateHandles,
    });
    await createFacetFromCandidates(page, {
      label: featureFacet.label,
      sourceSearch: 'brand',
      sourceRowText: 'Brand',
      sourceButtonText: 'Brand',
      candidateHandles: featureFacet.candidateHandles,
    });
    await createFacetFromCandidates(page, {
      label: tagFacet.label,
      sourceSearch: 'tags',
      sourceRowText: 'tags',
      sourceButtonText: 'tags',
      candidateHandles: tagFacet.candidateHandles,
    });

    await expectFacetRow(page, optionFacet);
    await expectFacetRow(page, featureFacet);
    await expectFacetRow(page, tagFacet);

    await expectFacetModalValues(page, optionFacet);
    await expectFacetModalValues(page, featureFacet);
    await expectFacetModalValues(page, tagFacet);
  });
});
