import { test } from '@fixtures/base.extend';
import { expect, type Locator, type Page } from '@playwright/test';

type ApiFixture = Parameters<Parameters<typeof test>[1]>[0]['api'];

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.getByTestId('sign-in-email-input').fill(email);
  await page.getByTestId('sign-in-password-input').fill(password);
  await page.getByTestId('sign-in-submit-button').click();

  await page.waitForFunction(() => localStorage.getItem('auth_access_token') !== null);
}

async function completeProfileIfNeeded(page: Page) {
  const firstNameInput = page.getByPlaceholder('First name');
  await firstNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByPlaceholder('Last name').fill('User');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(firstNameInput).toBeHidden();
}

async function createProduct(api: ApiFixture, title: string, handle: string) {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  const productId = result.product?.id;
  if (!productId) {
    throw new Error('Created product id was not returned');
  }

  return productId;
}

async function setupProductDetails(api: ApiFixture, page: Page, prefix: string) {
  api.session.user.data.password = 'StrongPassword123!';
  await api.session.setupUser();
  const organization = await api.session.setupOrganization();
  await api.session.setupProject();

  const unique = crypto.randomUUID().slice(0, 8);
  const title = `${prefix} ${unique}`;
  const handle = `${prefix.toLowerCase().replace(/\s+/g, '-')}-${unique}`;
  const productId = await createProduct(api, title, handle);
  const productsUrl = `/${organization.name}/${api.session.projectSlug}/products`;

  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${handle}`).click();
  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(title);

  return {
    handle,
    productId,
    productsUrl,
    title,
  };
}

async function reopenProductDetails(page: Page, productsUrl: string, handle: string) {
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${handle}`).click();
  await expect(page.getByTestId('product-modal')).toBeVisible();
}

async function readProductFeatures(api: ApiFixture, productId: string) {
  const { data } = await api.admin.query('inventory-api/ProductFindOne', {
    variables: { id: productId },
  });

  return data.catalogQuery.product?.features ?? [];
}

async function syncProductFeatures(
  api: ApiFixture,
  productId: string,
  features: unknown[],
) {
  const { data } = await api.admin.mutation('inventory-api/ProductFeaturesSync', {
    variables: {
      input: {
        productId,
        features,
      },
    },
  });

  const result = data.catalogMutation.productFeaturesSync;
  expect(result.userErrors).toHaveLength(0);

  return result.features;
}

async function openAttributesModal(page: Page) {
  await page.getByTestId('product-attributes-actions-button').click();
  await page.getByRole('menuitem', { name: 'Edit attributes' }).click();

  const modal = page.getByTestId('edit-attributes-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function clickAddMenuItem(page: Page, modal: Locator, testId: string) {
  await modal.getByTestId('edit-attributes-add-button').click();
  await page.getByTestId(testId).click();
}

function attributeRow(modal: Locator, text: string) {
  return modal
    .getByTestId('edit-attributes-grid')
    .locator('.ag-center-cols-container .ag-row')
    .filter({ hasText: text })
    .first();
}

async function editGridCell(page: Page, cell: Locator, value: string) {
  await cell.dblclick();
  const editor = page.locator('.ag-cell-inline-editing input').first();
  await expect(editor).toBeVisible();
  await editor.fill(value);
  await page.keyboard.press('Enter');
}

async function editAttributeName(
  page: Page,
  modal: Locator,
  currentName: string,
  nextName: string,
) {
  const row = attributeRow(modal, currentName);
  await editGridCell(page, row.locator('.ag-cell[col-id="name"]').first(), nextName);
}

async function editAttributeValues(
  page: Page,
  modal: Locator,
  rowName: string,
  valuesText: string,
) {
  const row = attributeRow(modal, rowName);
  await editGridCell(page, row.locator('.ag-cell[col-id="valuesText"]').first(), valuesText);
}

async function addChildAttribute(page: Page, modal: Locator, groupName: string) {
  await attributeRow(modal, groupName)
    .locator('button[data-testid^="edit-attributes-row-actions-"]')
    .click();
  await page.getByRole('menuitem', { name: 'Add Attribute' }).click();
}

async function deleteAttributeRow(page: Page, modal: Locator, rowName: string) {
  await attributeRow(modal, rowName)
    .locator('button[data-testid^="edit-attributes-row-actions-"]')
    .click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
}

async function saveAttributes(page: Page) {
  await page.getByTestId('submit-edit-attributes-form-button').click();
  await expect(page.getByTestId('edit-attributes-modal')).toBeHidden();
}

async function dragRowTo(page: Page, modal: Locator, sourceName: string, targetName: string) {
  await attributeRow(modal, sourceName)
    .locator('.ag-row-drag')
    .first()
    .dragTo(attributeRow(modal, targetName));
  await page.waitForTimeout(250);
}

function featureSummary(features: any[]) {
  return [...features]
    .sort((left, right) => left.index.join('.').localeCompare(right.index.join('.')))
    .map((feature) => {
      const values = [...feature.values]
        .sort((left, right) => left.index - right.index)
        .map((value) => value.name)
        .join(',');
      return `${feature.index.join('.')}:${feature.isGroup ? 'group' : 'attribute'}:${feature.name}:${values}`;
    })
    .join('|');
}

test.describe('Admin product details attributes update UI', () => {
  test.setTimeout(90_000);

  test('creates the first standalone attribute from an empty attributes section', async ({
    api,
    page,
  }) => {
    const { productId, productsUrl, handle } = await setupProductDetails(
      api,
      page,
      'Admin Attributes Product',
    );

    await expect(page.getByTestId('product-attributes-section')).toBeVisible();
    await expect(page.getByTestId('product-attributes-empty-state')).toBeVisible();

    const modal = await openAttributesModal(page);
    await clickAddMenuItem(page, modal, 'edit-attributes-add-attribute-item');
    await editAttributeName(page, modal, 'New Attribute', 'Material');
    await editAttributeValues(page, modal, 'Material', 'Cotton, Wool');
    await saveAttributes(page);

    await expect
      .poll(async () => featureSummary(await readProductFeatures(api, productId)))
      .toBe('0:attribute:Material:Cotton,Wool');

    await page.goto(productsUrl);
    await page.getByTestId(`products-table-title-cell-${handle}`).click();
    await expect(page.getByTestId('product-attributes-section')).toContainText('Material');
    await expect(page.getByTestId('product-attributes-section')).toContainText('Cotton, Wool');
  });

  test('adds a group with child attributes and persists comma-separated values', async ({
    api,
    page,
  }) => {
    const { productId } = await setupProductDetails(
      api,
      page,
      'Admin Grouped Attributes Product',
    );

    const modal = await openAttributesModal(page);
    await clickAddMenuItem(page, modal, 'edit-attributes-add-group-item');
    await editAttributeName(page, modal, 'New Group', 'Physical');
    await addChildAttribute(page, modal, 'Physical');
    await editAttributeName(page, modal, 'New Attribute', 'Weight');
    await editAttributeValues(page, modal, 'Weight', 'Light, Medium, Heavy');
    await saveAttributes(page);

    await expect
      .poll(async () => featureSummary(await readProductFeatures(api, productId)))
      .toBe('0:group:Physical:|0.0:attribute:Weight:Light,Medium,Heavy');

    await expect(page.getByTestId('product-attributes-section')).toContainText('Physical');
    await expect(page.getByTestId('product-attributes-section')).toContainText('Weight');
    await expect(page.getByTestId('product-attributes-section')).toContainText(
      'Light, Medium, Heavy',
    );
  });

  test('reorders root attributes and child attributes from the modal', async ({
    api,
    page,
  }) => {
    const { handle, productId, productsUrl } = await setupProductDetails(
      api,
      page,
      'Admin Reorder Attributes Product',
    );

    await syncProductFeatures(api, productId, [
      {
        name: 'Feature A',
        slug: 'feature-a',
        isGroup: false,
        index: [0],
        values: [],
      },
      {
        name: 'Feature B',
        slug: 'feature-b',
        isGroup: false,
        index: [1],
        values: [],
      },
      {
        name: 'Specs',
        slug: 'specs',
        isGroup: true,
        index: [2],
      },
      {
        name: 'First',
        slug: 'first',
        isGroup: false,
        index: [2, 0],
        values: [],
      },
      {
        name: 'Second',
        slug: 'second',
        isGroup: false,
        index: [2, 1],
        values: [],
      },
    ]);

    await reopenProductDetails(page, productsUrl, handle);
    const modal = await openAttributesModal(page);
    await dragRowTo(page, modal, 'Feature B', 'Feature A');
    await dragRowTo(page, modal, 'Second', 'First');
    await saveAttributes(page);

    await expect
      .poll(async () => featureSummary(await readProductFeatures(api, productId)))
      .toBe(
        '0:attribute:Feature B:|1:attribute:Feature A:|2:group:Specs:|2.0:attribute:Second:|2.1:attribute:First:',
      );
  });

  test('deletes an attribute and a group by omitting them from the sync snapshot', async ({
    api,
    page,
  }) => {
    const { handle, productId, productsUrl } = await setupProductDetails(
      api,
      page,
      'Admin Delete Attributes Product',
    );

    await syncProductFeatures(api, productId, [
      {
        name: 'Keep',
        slug: 'keep',
        isGroup: false,
        index: [0],
        values: [],
      },
      {
        name: 'Remove',
        slug: 'remove',
        isGroup: false,
        index: [1],
        values: [],
      },
      {
        name: 'Group To Remove',
        slug: 'group-to-remove',
        isGroup: true,
        index: [2],
      },
      {
        name: 'Grouped Attribute',
        slug: 'grouped-attribute',
        isGroup: false,
        index: [2, 0],
        values: [],
      },
    ]);

    await reopenProductDetails(page, productsUrl, handle);
    const modal = await openAttributesModal(page);
    await deleteAttributeRow(page, modal, 'Remove');
    await deleteAttributeRow(page, modal, 'Group To Remove');
    await saveAttributes(page);

    await expect
      .poll(async () => featureSummary(await readProductFeatures(api, productId)))
      .toBe('0:attribute:Keep:');
  });

  test('shows client validation errors without closing the modal', async ({ api, page }) => {
    await setupProductDetails(api, page, 'Admin Invalid Attributes Product');

    const modal = await openAttributesModal(page);
    await clickAddMenuItem(page, modal, 'edit-attributes-add-attribute-item');
    await editAttributeName(page, modal, 'New Attribute', '');
    await page.getByTestId('submit-edit-attributes-form-button').click();

    await expect(page.getByTestId('edit-attributes-modal')).toBeVisible();
    await expect(page.getByTestId('edit-attributes-error-alert')).toContainText(
      'Feature name is required',
    );
  });

  test('preserves existing feature and value IDs while editing names and values', async ({
    api,
    page,
  }) => {
    const { handle, productId, productsUrl } = await setupProductDetails(
      api,
      page,
      'Admin Preserve Attribute IDs Product',
    );

    const createdFeatures = await syncProductFeatures(api, productId, [
      {
        name: 'Material',
        slug: 'material',
        isGroup: false,
        index: [0],
        values: [
          { name: 'Cotton', slug: 'cotton', index: 0 },
          { name: 'Wool', slug: 'wool', index: 1 },
        ],
      },
    ]);
    const originalFeature = createdFeatures[0];
    const originalFirstValue = originalFeature.values[0];
    const originalSecondValue = originalFeature.values[1];

    await reopenProductDetails(page, productsUrl, handle);
    const modal = await openAttributesModal(page);
    await editAttributeName(page, modal, 'Material', 'Fabric');
    await editAttributeValues(page, modal, 'Fabric', 'Linen, Wool, Silk');
    await saveAttributes(page);

    const updatedFeatures = await readProductFeatures(api, productId);
    expect(updatedFeatures).toHaveLength(1);
    const updatedValues = [...updatedFeatures[0].values].sort(
      (left, right) => left.index - right.index,
    );
    expect(updatedFeatures[0].id).toBe(originalFeature.id);
    expect(updatedFeatures[0].name).toBe('Fabric');
    expect(updatedValues.map((value: any) => value.name)).toEqual(['Linen', 'Wool', 'Silk']);
    expect(updatedValues[0].id).toBe(originalFirstValue.id);
    expect(updatedValues[1].id).toBe(originalSecondValue.id);
  });
});
