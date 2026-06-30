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

async function readProductOptions(api: ApiFixture, productId: string) {
  const { data } = await api.admin.query('inventory-api/ProductFindOne', {
    variables: { id: productId },
  });

  return data.catalogQuery.product?.options ?? [];
}

async function openOptionsModal(page: Page) {
  await page.getByTestId('product-options-actions-button').click();
  await page.getByTestId('product-options-actions-button-menu-item').click();

  const modal = page.getByTestId('edit-options-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function optionCard(modal: Locator, text: string) {
  const cards = modal.getByTestId('edit-options-option-card');

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const count = await cards.count();

    for (let i = 0; i < count; i += 1) {
      const value = await cards
        .nth(i)
        .getByTestId('edit-options-option-name-input')
        .inputValue()
        .catch(() => null);

      if (value === text) {
        return cards.nth(i);
      }
    }

    await modal.page().waitForTimeout(100);
  }

  throw new Error(`Option card "${text}" was not found`);
}

async function valueRow(card: Locator, text: string) {
  const rows = card.getByTestId('edit-options-value-row');

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const count = await rows.count();

    for (let i = 0; i < count; i += 1) {
      const value = await rows
        .nth(i)
        .getByTestId('edit-options-value-name-input')
        .inputValue()
        .catch(() => null);

      if (value === text) {
        return rows.nth(i);
      }
    }

    await card.page().waitForTimeout(100);
  }

  throw new Error(`Value row "${text}" was not found`);
}

async function selectDisplayType(page: Page, card: Locator, label: string) {
  await card.getByTestId('edit-options-display-type-trigger').click();
  await page.getByTestId(`edit-options-display-type-menu-item-${label.toUpperCase()}`).click();
}

async function saveOptions(page: Page) {
  await page.getByTestId('submit-edit-options-form-button').click();
  await expect(page.getByTestId('edit-options-modal')).toBeHidden();
}

async function dragOptionTo(page: Page, modal: Locator, sourceName: string, targetName: string) {
  const sourceHandle = (await optionCard(modal, sourceName)).getByTestId(
    'edit-options-option-drag-handle',
  );

  await optionCard(modal, targetName);
  await sourceHandle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
}

async function dragValueTo(page: Page, card: Locator, sourceName: string, targetName: string) {
  const target = await valueRow(card, targetName);
  const sourceHandle = (await valueRow(card, sourceName)).getByTestId(
    'edit-options-value-drag-handle',
  );
  const sourceBox = await sourceHandle.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox) {
    throw new Error(`Source value "${sourceName}" drag handle is not visible`);
  }
  if (!targetBox) {
    throw new Error(`Target value "${targetName}" is not visible`);
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 4, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
}

function swatchSummary(swatch: any) {
  if (!swatch) {
    return 'none';
  }

  if (swatch.swatchType === 'COLOR') {
    return `color:${swatch.colorOne}`;
  }

  if (swatch.swatchType === 'GRADIENT') {
    return `gradient:${swatch.colorOne}:${swatch.colorTwo}`;
  }

  return `image:${swatch.file?.id ?? 'none'}`;
}

function optionSummary(options: any[]) {
  return options
    .map((option) => {
      const values = option.values
        .map(
          (value: any) =>
            `${value.sortIndex}:${value.name}:${swatchSummary(value.swatch)}`,
        )
        .join(',');

      return `${option.sortIndex}:${option.displayType}:${option.name}:${values}`;
    })
    .join('|');
}

async function expectProductDetailsOptions(
  page: Page,
  input: {
    include: string[];
    exclude?: string[];
    textOrder?: string[];
  },
) {
  const section = page.getByTestId('product-options-section');
  await expect(section).toBeVisible();

  for (const text of input.include) {
    await expect(section).toContainText(text);
  }

  for (const text of input.exclude ?? []) {
    await expect(section).not.toContainText(text);
  }

  if (input.textOrder && input.textOrder.length > 0) {
    const sectionText = (await section.innerText()).replace(/\s+/g, ' ').trim();
    let previousIndex = -1;

    for (const text of input.textOrder) {
      const currentIndex = sectionText.indexOf(text);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  }
}

async function expectSavedOptions(
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
    .poll(async () => optionSummary(await readProductOptions(api, productId)))
    .toBe(input.summary);

  await expectProductDetailsOptions(page, {
    include: input.include,
    exclude: input.exclude,
    textOrder: input.textOrder,
  });
}

test.describe('Admin product details options update UI', () => {
  test.setTimeout(90_000);

  test('edits product options through the API-backed modal lifecycle', async ({
    api,
    page,
  }) => {
    const { productId } = await setupProductDetails(
      api,
      page,
      'Admin Options Lifecycle Product',
    );

    await expect(page.getByTestId('product-options-section')).toBeVisible();
    await expect(page.getByTestId('product-options-empty-state')).toBeVisible();

    let modal = await openOptionsModal(page);
    await modal.getByTestId('edit-options-add-button').click();

    let card = await optionCard(modal, 'New Option');
    await card.getByTestId('edit-options-option-name-input').fill('Color');
    await card.getByTestId('edit-options-value-name-input').nth(0).fill('Black');
    await card.getByTestId('edit-options-add-value-button').click();
    await card.getByTestId('edit-options-value-name-input').nth(1).fill('White');
    await saveOptions(page);

    await expectSavedOptions(api, page, productId, {
      summary: '0:BUTTONS:Color:0:Black:none,1:White:none',
      include: ['Color', 'Black', 'White'],
      textOrder: ['Color', 'Black', 'White'],
    });

    const createdOptions = await readProductOptions(api, productId);
    const originalColor = createdOptions.find((option: any) => option.name === 'Color');
    const originalBlack = originalColor.values.find((value: any) => value.name === 'Black');
    const originalWhite = originalColor.values.find((value: any) => value.name === 'White');

    modal = await openOptionsModal(page);
    card = await optionCard(modal, 'Color');
    await card.getByTestId('edit-options-option-name-input').fill('Shade');
    await card.getByTestId('edit-options-value-name-input').nth(0).fill('Carbon');
    await card.getByTestId('edit-options-value-name-input').nth(1).fill('Snow');
    await selectDisplayType(page, card, 'Dropdown');

    await modal.getByTestId('edit-options-add-button').click();
    const finishCard = await optionCard(modal, 'New Option');
    await finishCard.getByTestId('edit-options-option-name-input').fill('Finish');
    await selectDisplayType(page, finishCard, 'Swatch');
    await finishCard.getByTestId('edit-options-value-name-input').nth(0).fill('Matte');
    await finishCard.getByTestId('edit-options-add-value-button').click();
    await finishCard.getByTestId('edit-options-value-name-input').nth(1).fill('Gloss');
    await saveOptions(page);

    await expectSavedOptions(api, page, productId, {
      summary:
        '0:DROPDOWN:Shade:0:Carbon:none,1:Snow:none|1:SWATCH:Finish:0:Matte:color:#1677ff,1:Gloss:color:#1677ff',
      include: ['Shade', 'Carbon', 'Snow', 'Finish', 'Matte', 'Gloss'],
      exclude: ['Color', 'Black', 'White'],
      textOrder: ['Shade', 'Carbon', 'Snow', 'Finish', 'Matte', 'Gloss'],
    });

    const editedOptions = await readProductOptions(api, productId);
    const shade = editedOptions.find((option: any) => option.name === 'Shade');
    expect(shade.id).toBe(originalColor.id);
    expect(shade.values[0].id).toBe(originalBlack.id);
    expect(shade.values[1].id).toBe(originalWhite.id);

    modal = await openOptionsModal(page);
    await dragOptionTo(page, modal, 'Finish', 'Shade');
    card = await optionCard(modal, 'Finish');
    await dragValueTo(page, card, 'Gloss', 'Matte');
    await saveOptions(page);

    await expectSavedOptions(api, page, productId, {
      summary:
        '0:SWATCH:Finish:0:Gloss:color:#1677ff,1:Matte:color:#1677ff|1:DROPDOWN:Shade:0:Carbon:none,1:Snow:none',
      include: ['Finish', 'Gloss', 'Matte', 'Shade', 'Carbon', 'Snow'],
      textOrder: ['Finish', 'Gloss', 'Matte', 'Shade', 'Carbon', 'Snow'],
    });

    modal = await openOptionsModal(page);
    card = await optionCard(modal, 'Finish');
    await (await valueRow(card, 'Matte')).getByTestId('edit-options-delete-value-button').click();
    const shadeCard = await optionCard(modal, 'Shade');
    await shadeCard.getByTestId('edit-options-delete-option-button').click();
    await page.getByTestId('edit-options-delete-option-menu-item').click();
    await saveOptions(page);

    await expectSavedOptions(api, page, productId, {
      summary: '0:SWATCH:Finish:0:Gloss:color:#1677ff',
      include: ['Finish', 'Gloss'],
      exclude: ['Shade', 'Carbon', 'Snow', 'Matte'],
      textOrder: ['Finish', 'Gloss'],
    });

    modal = await openOptionsModal(page);
    card = await optionCard(modal, 'Finish');
    await selectDisplayType(page, card, 'Dropdown');
    await saveOptions(page);

    await expectSavedOptions(api, page, productId, {
      summary: '0:DROPDOWN:Finish:0:Gloss:none',
      include: ['Finish', 'Gloss', 'Dropdown'],
      exclude: ['Swatch'],
      textOrder: ['Finish', 'Gloss'],
    });
  });

  test('shows client validation errors without closing the modal', async ({
    api,
    page,
  }) => {
    await setupProductDetails(api, page, 'Admin Invalid Options Product');

    const modal = await openOptionsModal(page);
    await modal.getByTestId('edit-options-add-button').click();
    await page.getByTestId('submit-edit-options-form-button').click();

    await expect(page.getByTestId('edit-options-modal')).toBeVisible();
    await expect(page.getByTestId('edit-options-error-alert')).toContainText(
      'Value name is required',
    );
  });
});
