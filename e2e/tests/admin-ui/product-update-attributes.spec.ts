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

async function expectProductDetailsAttributes(
  page: Page,
  input: {
    include: string[];
    exclude?: string[];
    textOrder?: string[];
  },
) {
  const section = page.getByTestId('product-attributes-section');
  await expect(section).toBeVisible();

  for (const text of input.include) {
    await expect(section).toContainText(text);
  }

  for (const text of input.exclude ?? []) {
    await expect(section).not.toContainText(text);
  }

  if (input.textOrder && input.textOrder.length > 0) {
    const sectionText = normalizeTextForOrder(await section.innerText());
    let previousIndex = -1;

    for (const text of input.textOrder) {
      const currentIndex = sectionText.indexOf(normalizeTextForOrder(text));
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  }
}

async function expectSavedAttributes(
  api: ApiFixture,
  page: Page,
  productId: string,
  input: {
    summary: string;
    include: string[];
    exclude?: string[];
    textOrder?: string[];
  },
) {
  await expect
    .poll(async () => featureSummary(await readProductFeatures(api, productId)))
    .toBe(input.summary);

  await expectProductDetailsAttributes(page, {
    include: input.include,
    exclude: input.exclude,
    textOrder: input.textOrder,
  });
}

async function dragRowTo(page: Page, modal: Locator, sourceName: string, targetName: string) {
  const targetBox = await attributeRow(modal, targetName).boundingBox();
  if (!targetBox) {
    throw new Error(`Target row "${targetName}" is not visible`);
  }

  await attributeRow(modal, sourceName)
    .locator('.ag-row-drag')
    .first()
    .dragTo(attributeRow(modal, targetName), {
      targetPosition: {
        x: targetBox.width / 2,
        y: 2,
      },
    });
  await page.waitForTimeout(400);
}

function normalizeTextForOrder(text: string) {
  return text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
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

async function seedGroupedFeatureTree(api: ApiFixture, productId: string) {
  await syncProductFeatures(api, productId, [
    {
      name: 'Technical',
      slug: 'technical',
      isGroup: true,
      index: [0],
    },
    {
      name: 'Weight',
      slug: 'weight',
      isGroup: false,
      index: [0, 0],
      values: [],
    },
    {
      name: 'Dimensions',
      slug: 'dimensions',
      isGroup: false,
      index: [0, 1],
      values: [],
    },
    {
      name: 'Materials',
      slug: 'materials',
      isGroup: true,
      index: [1],
    },
    {
      name: 'Fabric',
      slug: 'fabric',
      isGroup: false,
      index: [1, 0],
      values: [],
    },
  ]);
}

test.describe('Admin product details attributes update UI', () => {
  test.setTimeout(90_000);

  test('edits product attributes through the full modal lifecycle in one session', async ({
    api,
    page,
  }) => {
    const { productId } = await setupProductDetails(
      api,
      page,
      'Admin Attributes Lifecycle Product',
    );

    await expect(page.getByTestId('product-attributes-section')).toBeVisible();
    await expect(page.getByTestId('product-attributes-empty-state')).toBeVisible();

    let modal = await openAttributesModal(page);
    await clickAddMenuItem(page, modal, 'edit-attributes-add-attribute-item');
    await editAttributeName(page, modal, 'New Attribute', 'Material');
    await editAttributeValues(page, modal, 'Material', 'Cotton, Wool');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:attribute:Material:Cotton,Wool',
      include: ['Material', 'Cotton, Wool'],
      textOrder: ['Material', 'Cotton, Wool'],
    });
    const createdFeatures = await readProductFeatures(api, productId);
    const originalMaterial = createdFeatures.find((feature: any) => feature.name === 'Material');
    expect(originalMaterial).toBeTruthy();
    const originalMaterialFirstValue = originalMaterial.values.find(
      (value: any) => value.name === 'Cotton',
    );
    const originalMaterialSecondValue = originalMaterial.values.find(
      (value: any) => value.name === 'Wool',
    );
    expect(originalMaterialFirstValue).toBeTruthy();
    expect(originalMaterialSecondValue).toBeTruthy();

    modal = await openAttributesModal(page);
    await clickAddMenuItem(page, modal, 'edit-attributes-add-group-item');
    await editAttributeName(page, modal, 'New Group', 'Physical');
    await addChildAttribute(page, modal, 'Physical');
    await editAttributeName(page, modal, 'New Attribute', 'Weight');
    await editAttributeValues(page, modal, 'Weight', 'Light, Medium, Heavy');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:attribute:Material:Cotton,Wool|1:group:Physical:|1.0:attribute:Weight:Light,Medium,Heavy',
      include: ['Material', 'Cotton, Wool', 'Physical', 'Weight', 'Light, Medium, Heavy'],
      textOrder: ['Material', 'Cotton, Wool', 'Physical', 'Weight', 'Light, Medium, Heavy'],
    });

    modal = await openAttributesModal(page);
    await clickAddMenuItem(page, modal, 'edit-attributes-add-attribute-item');
    await editAttributeName(page, modal, 'New Attribute', 'Country');
    await editAttributeValues(page, modal, 'Country', 'Ukraine, Poland');
    await addChildAttribute(page, modal, 'Physical');
    await editAttributeName(page, modal, 'New Attribute', 'Dimensions');
    await editAttributeValues(page, modal, 'Dimensions', 'Small, Large');
    await dragRowTo(page, modal, 'Country', 'Material');
    await dragRowTo(page, modal, 'Dimensions', 'Weight');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:attribute:Country:Ukraine,Poland|1:attribute:Material:Cotton,Wool|2:group:Physical:|2.0:attribute:Dimensions:Small,Large|2.1:attribute:Weight:Light,Medium,Heavy',
      include: [
        'Country',
        'Ukraine, Poland',
        'Material',
        'Cotton, Wool',
        'Physical',
        'Dimensions',
        'Small, Large',
        'Weight',
        'Light, Medium, Heavy',
      ],
      textOrder: [
        'Country',
        'Ukraine, Poland',
        'Material',
        'Cotton, Wool',
        'Physical',
        'Dimensions',
        'Small, Large',
        'Weight',
        'Light, Medium, Heavy',
      ],
    });

    modal = await openAttributesModal(page);
    await editAttributeName(page, modal, 'Material', 'Fabric');
    await editAttributeValues(page, modal, 'Fabric', 'Linen, Wool, Silk');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:attribute:Country:Ukraine,Poland|1:attribute:Fabric:Linen,Wool,Silk|2:group:Physical:|2.0:attribute:Dimensions:Small,Large|2.1:attribute:Weight:Light,Medium,Heavy',
      include: ['Country', 'Ukraine, Poland', 'Fabric', 'Linen, Wool, Silk', 'Physical', 'Dimensions', 'Weight'],
      exclude: ['Material', 'Cotton, Wool'],
      textOrder: [
        'Country',
        'Ukraine, Poland',
        'Fabric',
        'Linen, Wool, Silk',
        'Physical',
        'Dimensions',
        'Small, Large',
        'Weight',
        'Light, Medium, Heavy',
      ],
    });
    const renamedFeatures = await readProductFeatures(api, productId);
    const renamedFabric = renamedFeatures.find((feature: any) => feature.name === 'Fabric');
    expect(renamedFabric.id).toBe(originalMaterial.id);
    const renamedValues = [...renamedFabric.values].sort(
      (left, right) => left.index - right.index,
    );
    expect(renamedValues.map((value: any) => value.name)).toEqual(['Linen', 'Wool', 'Silk']);
    expect(renamedValues[0].id).toBe(originalMaterialFirstValue.id);
    expect(renamedValues[1].id).toBe(originalMaterialSecondValue.id);

    modal = await openAttributesModal(page);
    await deleteAttributeRow(page, modal, 'Country');
    await deleteAttributeRow(page, modal, 'Physical');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:attribute:Fabric:Linen,Wool,Silk',
      include: ['Fabric', 'Linen, Wool, Silk'],
      exclude: ['Country', 'Ukraine, Poland', 'Physical', 'Dimensions', 'Weight'],
      textOrder: ['Fabric', 'Linen, Wool, Silk'],
    });
  });

  test('handles drag and drop edge cases in one product details session', async ({
    api,
    page,
  }) => {
    const { handle, productId, productsUrl } = await setupProductDetails(
      api,
      page,
      'Admin Attributes Dnd Edge Cases Product',
    );

    await seedGroupedFeatureTree(api, productId);

    await reopenProductDetails(page, productsUrl, handle);
    let modal = await openAttributesModal(page);
    await dragRowTo(page, modal, 'Materials', 'Technical');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:group:Materials:|0.0:attribute:Fabric:|1:group:Technical:|1.0:attribute:Weight:|1.1:attribute:Dimensions:',
      include: ['Materials', 'Fabric', 'Technical', 'Weight', 'Dimensions'],
      textOrder: ['Materials', 'Fabric', 'Technical', 'Weight', 'Dimensions'],
    });

    modal = await openAttributesModal(page);
    await dragRowTo(page, modal, 'Weight', 'Fabric');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:group:Materials:|0.0:attribute:Weight:|0.1:attribute:Fabric:|1:group:Technical:|1.0:attribute:Dimensions:',
      include: ['Materials', 'Weight', 'Fabric', 'Technical', 'Dimensions'],
      textOrder: ['Materials', 'Weight', 'Fabric', 'Technical', 'Dimensions'],
    });

    modal = await openAttributesModal(page);
    await dragRowTo(page, modal, 'Weight', 'Materials');
    await saveAttributes(page);

    await expectSavedAttributes(api, page, productId, {
      summary: '0:attribute:Weight:|1:group:Materials:|1.0:attribute:Fabric:|2:group:Technical:|2.0:attribute:Dimensions:',
      include: ['Weight', 'Materials', 'Fabric', 'Technical', 'Dimensions'],
      textOrder: ['Weight', 'Materials', 'Fabric', 'Technical', 'Dimensions'],
    });
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

});
