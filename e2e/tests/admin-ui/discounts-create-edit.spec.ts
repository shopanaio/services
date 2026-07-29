import { test } from '@fixtures/base.extend';
import { expect, type Locator, type Page } from '@playwright/test';

const UAH = 'UAH';

const DISCOUNT_KINDS = [
  {
    value: 'AMOUNT_OFF_PRODUCTS',
    label: 'Amount off products',
    testId: 'discount-type-amount_off_products',
  },
  {
    value: 'BUY_X_GET_Y',
    label: 'Buy X get Y',
    testId: 'discount-type-buy_x_get_y',
  },
  {
    value: 'AMOUNT_OFF_ORDER',
    label: 'Amount off order',
    testId: 'discount-type-amount_off_order',
  },
  {
    value: 'FREE_SHIPPING',
    label: 'Free shipping',
    testId: 'discount-type-free_shipping',
  },
] as const;

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

function discountRows(page: Page) {
  return page.getByTestId('discounts-table').locator('.ag-center-cols-container .ag-row');
}

async function fillControl(control: Locator, value: string) {
  const nestedInput = control.locator('input');
  if ((await nestedInput.count()) > 0) {
    await nestedInput.fill(value);
    return;
  }

  await control.fill(value);
}

async function selectOption(
  page: Page,
  container: Locator,
  testId: string,
  option: string,
) {
  await container.getByTestId(testId).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

async function openGeneralEditor(page: Page) {
  await page.getByTestId('discount-summary-actions').click();
  await page.getByTestId('discount-edit-general-settings-menu-item').click();
  const modal = page.getByTestId('discount-general-edit-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function openValueEditor(page: Page) {
  await page.getByTestId('discount-summary-actions').click();
  await page.getByTestId('discount-edit-value-targets-menu-item').click();
  const modal = page.getByTestId('discount-value-targets-edit-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function saveEditor(page: Page, modal: Locator, name: string) {
  await page.getByTestId(`submit-${name}-form-button`).click();
  await expect(modal).toBeHidden();
  await expect(page.getByTestId('discount-details-card')).toBeVisible();
}

async function closeDiscountDetails(page: Page) {
  await page.getByTestId('close-discount-modal-button').click();
  await expect(page.getByTestId('discount-modal')).toBeHidden();
}

async function openDiscountByTitle(page: Page, title: string) {
  await page.getByTestId('discounts-table').getByText(title, { exact: true }).click();
  await expect(page.getByTestId('discount-modal')).toBeVisible();
  await expect(page.getByTestId('discount-detail-title')).toHaveText(title);
}

async function createDiscount(
  page: Page,
  kind: (typeof DISCOUNT_KINDS)[number],
  method: 'AUTOMATIC' | 'CODE',
  title: string,
  code: string,
) {
  const rowCount = await discountRows(page).count();
  await page.getByTestId('discounts-create-button').click();

  const modal = page.getByTestId('create-discount-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId(kind.testId).click();
  await modal
    .getByTestId(method === 'AUTOMATIC' ? 'discount-method-automatic' : 'discount-method-code')
    .click();

  if (method === 'AUTOMATIC') {
    await modal.getByTestId('discount-create-title-input').fill(title);
  } else {
    await expect(modal.getByTestId('discount-create-title-input')).toHaveCount(0);
  }

  await page.getByTestId('submit-create-discount-form-button').click();
  await expect(modal).toBeHidden();
  await expect(discountRows(page)).toHaveCount(rowCount + 1);

  if (method === 'AUTOMATIC') {
    await expect(page.getByTestId('discounts-table').getByText(title, { exact: true })).toBeVisible();
    return;
  }

  await discountRows(page).first().click();
  await expect(page.getByTestId('discount-modal')).toBeVisible();
  const generalModal = await openGeneralEditor(page);
  await generalModal.getByTestId('discount-general-title-input').fill(title);
  await fillControl(generalModal.getByTestId('discount-general-priority-input'), '10');
  await generalModal.getByTestId('discount-code-add-button').click();

  const codeGrid = generalModal.getByTestId('discount-codes-grid');
  await codeGrid.getByLabel('Discount code', { exact: true }).fill(code);
  await fillControl(
    codeGrid.getByLabel('Discount code usage limit', { exact: true }),
    '50',
  );
  await saveEditor(page, generalModal, 'discount-general-edit');
  await expect(page.getByTestId('discount-detail-title')).toHaveText(title);
  await expect(page.getByTestId('discount-codes-section')).toContainText(code);
  await closeDiscountDetails(page);
}

async function exerciseTargetTypes(modal: Locator, prefix: string) {
  await modal.getByTestId(`${prefix}-products`).click();
  await expect(modal.getByTestId(`${prefix}-selection-section`)).toBeVisible();
  await modal.getByTestId(`${prefix}-variants`).click();
  await expect(modal.getByTestId(`${prefix}-selection-section`)).toBeVisible();
  await modal.getByTestId(`${prefix}-categories`).click();
  await expect(modal.getByTestId(`${prefix}-selection-section`)).toBeVisible();
  await modal.getByTestId(`${prefix}-all_products`).click();
  await expect(modal.getByTestId(`${prefix}-selection-section`)).toHaveCount(0);
}

async function editAmountOffProducts(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  const modal = await openValueEditor(page);

  await selectOption(page, modal, 'discount-value-type', 'Fixed amount');
  await modal.getByTestId('discount-fixed-amount-input').fill('12.34');
  await selectOption(page, modal, 'discount-value-type', 'Percentage');
  await fillControl(modal.getByTestId('discount-percentage-input'), '15.5');
  await modal.getByTestId('discount-allocation-each-checkbox').click();
  await modal.getByTestId('discount-maximum-input').fill('75');
  await exerciseTargetTypes(modal, 'discount-benefit-target');

  await selectOption(page, modal, 'discount-minimum-requirement-type', 'Minimum subtotal');
  await modal.getByTestId('discount-minimum-subtotal-input').fill('100');
  await selectOption(page, modal, 'discount-minimum-requirement-type', 'Minimum quantity');
  await fillControl(modal.getByTestId('discount-minimum-quantity-input'), '3');

  await saveEditor(page, modal, 'discount-value-targets-edit');
  await expect(page.getByTestId('discount-value-usage-section')).toContainText('15.5%');
  await expect(page.getByTestId('discount-value-usage-section')).toContainText('3 items');
  await expect(page.getByTestId('discount-applies-to-section')).toContainText('All products');
  await closeDiscountDetails(page);
}

async function editAmountOffOrder(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  const modal = await openValueEditor(page);

  await selectOption(page, modal, 'discount-value-type', 'Percentage');
  await expect(modal.getByTestId('discount-percentage-input')).toBeVisible();
  await selectOption(page, modal, 'discount-value-type', 'Fixed amount');
  await modal.getByTestId('discount-fixed-amount-input').fill('25');
  await modal.getByTestId('discount-allocation-each-checkbox').click();
  await selectOption(page, modal, 'discount-minimum-requirement-type', 'None');
  await selectOption(page, modal, 'discount-minimum-requirement-type', 'Minimum subtotal');
  await modal.getByTestId('discount-minimum-subtotal-input').fill('200');

  await saveEditor(page, modal, 'discount-value-targets-edit');
  await expect(page.getByTestId('discount-value-usage-section')).toContainText('25');
  await expect(page.getByTestId('discount-applies-to-section')).toContainText('entire order');
  await closeDiscountDetails(page);
}

async function editBuyXGetY(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  const modal = await openValueEditor(page);

  await selectOption(page, modal, 'discount-buy-requirement-type', 'Minimum subtotal');
  await modal.getByTestId('discount-required-subtotal-input').fill('150');
  await selectOption(page, modal, 'discount-buy-requirement-type', 'Minimum quantity');
  await fillControl(modal.getByTestId('discount-required-quantity-input'), '2');
  await fillControl(modal.getByTestId('discount-benefit-quantity-input'), '1');

  await selectOption(page, modal, 'discount-benefit-value-type', 'Percentage');
  await fillControl(modal.getByTestId('discount-benefit-percentage-input'), '20');
  await selectOption(page, modal, 'discount-benefit-value-type', 'Fixed amount');
  await modal.getByTestId('discount-benefit-amount-input').fill('7.5');
  await selectOption(page, modal, 'discount-benefit-value-type', 'Free');
  await fillControl(modal.getByTestId('discount-uses-per-order-input'), '2');

  await exerciseTargetTypes(modal, 'discount-qualifier-target');
  await exerciseTargetTypes(modal, 'discount-benefit-target');

  await saveEditor(page, modal, 'discount-value-targets-edit');
  await expect(page.getByTestId('discount-value-usage-section')).toContainText('Buy 2');
  await expect(page.getByTestId('discount-value-usage-section')).toContainText('Free');
  await closeDiscountDetails(page);
}

async function editFreeShipping(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  const modal = await openValueEditor(page);

  await modal.getByTestId('discount-maximum-shipping-price-input').fill('30');
  await selectOption(page, modal, 'discount-minimum-requirement-type', 'Minimum quantity');
  await fillControl(modal.getByTestId('discount-minimum-quantity-input'), '4');
  await selectOption(page, modal, 'discount-minimum-requirement-type', 'None');
  await selectOption(page, modal, 'discount-minimum-requirement-type', 'Minimum subtotal');
  await modal.getByTestId('discount-minimum-subtotal-input').fill('75');

  await saveEditor(page, modal, 'discount-value-targets-edit');
  await expect(page.getByTestId('discount-value-usage-section')).toContainText('30');
  await expect(page.getByTestId('discount-applies-to-section')).toContainText(
    'eligible shipping rates',
  );
  await closeDiscountDetails(page);
}

async function editGeneralSettingsAndCodes(page: Page, title: string, unique: string) {
  await openDiscountByTitle(page, title);
  let modal = await openGeneralEditor(page);
  await fillControl(modal.getByTestId('discount-general-priority-input'), '25');
  await modal.getByTestId('discount-code-add-button').click();

  let grid = modal.getByTestId('discount-codes-grid');
  await grid.getByLabel('Discount code', { exact: true }).last().fill(`SECOND-${unique}`);
  await fillControl(
    grid.getByLabel('Discount code usage limit', { exact: true }).last(),
    '5',
  );
  await saveEditor(page, modal, 'discount-general-edit');
  await expect(page.getByTestId('discount-codes-section')).toContainText(`SECOND-${unique}`);

  modal = await openGeneralEditor(page);
  grid = modal.getByTestId('discount-codes-grid');
  await grid
    .getByLabel('Discount code', { exact: true })
    .first()
    .fill(`UPDATED-${unique}`);
  await grid.getByLabel('Discount code status', { exact: true }).first().click();
  await page.getByRole('option', { name: 'Disabled', exact: true }).click();
  await grid.getByRole('button', { name: /Actions for SECOND-/ }).click();
  await page.getByTestId('discount-code-delete-menu-item').click();
  await saveEditor(page, modal, 'discount-general-edit');

  await expect(page.getByTestId('discount-codes-section')).toContainText(`UPDATED-${unique}`);
  await expect(page.getByTestId('discount-codes-section')).toContainText('Disabled');
  await expect(page.getByTestId('discount-codes-section')).not.toContainText(`SECOND-${unique}`);
  await closeDiscountDetails(page);
}

async function editAutomaticGeneralSettings(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  const modal = await openGeneralEditor(page);
  await expect(modal.getByTestId('discount-codes-grid')).toHaveCount(0);
  await fillControl(modal.getByTestId('discount-general-priority-input'), '7');
  await saveEditor(page, modal, 'discount-general-edit');
  await closeDiscountDetails(page);
}

async function editEligibilityAndChannels(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  await page.getByTestId('discount-channels-actions').click();
  await page.getByTestId('discount-channels-edit-menu-item').click();

  const modal = page.getByTestId('discount-eligibility-channels-edit-modal');
  await expect(modal).toBeVisible();
  const buyerContext = modal.getByTestId('discount-buyer-context');
  await buyerContext.getByText('Customers', { exact: true }).click();
  await expect(modal.getByTestId('discount-customers-select-button')).toBeVisible();
  await buyerContext.getByText('Segments', { exact: true }).click();
  await expect(modal.getByTestId('discount-segments-select-button')).toBeVisible();
  await buyerContext.getByText('All customers', { exact: true }).click();

  await modal.getByTestId('discount-channel-enabled-online-store').click();
  await modal.getByTestId('discount-channel-featured-online-store').click();
  await modal.getByTestId('discount-channel-enabled-mobile-app').click();
  await modal.getByTestId('discount-channel-enabled-point-of-sale').click();
  await modal.getByTestId('discount-channel-enabled-point-of-sale').click();

  await saveEditor(page, modal, 'discount-eligibility-channels-edit');
  await expect(page.getByTestId('discount-customer-eligibility-section')).toContainText(
    'All customers',
  );
  await expect(page.getByTestId('discount-channels-section')).toContainText('2 of 3 active');
  await closeDiscountDetails(page);
}

async function editAvailability(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  await page.getByTestId('discount-availability-actions').click();
  await page.getByTestId('discount-availability-edit-menu-item').click();

  const modal = page.getByTestId('discount-availability-edit-modal');
  await expect(modal).toBeVisible();
  await modal.getByTestId('discount-purchase-subscription').click();
  await fillControl(modal.getByTestId('discount-total-usage-limit'), '100');
  await modal.getByTestId('discount-once-per-customer').click();
  await modal.getByTestId('discount-combination-product').click();
  await modal.getByTestId('discount-combination-order').click();
  await modal.getByTestId('discount-combination-shipping').click();
  await modal.getByTestId('discount-starts-at').fill('2030-01-01T09:00');
  await modal.getByTestId('discount-ends-at').fill('2030-12-31T18:00');

  await saveEditor(page, modal, 'discount-availability-edit');
  await expect(page.getByTestId('discount-availability-limits-section')).toContainText(
    'One-time purchase',
  );
  await expect(page.getByTestId('discount-availability-limits-section')).toContainText(
    'Subscription',
  );
  await expect(page.getByTestId('discount-combinations-section')).toContainText(
    '3 of 3 enabled',
  );
  await closeDiscountDetails(page);
}

async function assertEveryDetailsSection(page: Page, title: string) {
  await openDiscountByTitle(page, title);
  for (const testId of [
    'discount-summary-section',
    'discount-value-usage-section',
    'discount-applies-to-section',
    'discount-customer-eligibility-section',
    'discount-channels-section',
    'discount-combinations-section',
    'discount-availability-limits-section',
    'discount-tags-section',
    'discount-codes-section',
    'discount-external-references-section',
  ]) {
    await expect(page.getByTestId(testId)).toBeVisible();
  }
  await closeDiscountDetails(page);
}

function getDiscountTitle(titles: Map<string, string>, key: string) {
  const title = titles.get(key);
  if (!title) {
    throw new Error(`Missing discount fixture title for ${key}`);
  }
  return title;
}

test.describe('Admin discounts create and edit UI', () => {
  test('creates every kind and method, then edits every modal section and subtype', async ({
    api,
    page,
  }) => {
    test.setTimeout(600_000);

    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject({
      currencies: [UAH],
      defaultCurrency: UAH,
    });

    const unique = crypto.randomUUID().slice(0, 8);
    const titles = new Map<string, string>();
    const discountsUrl = `/${organization.name}/${api.session.projectSlug}/discounts`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(discountsUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Discounts');

    for (const kind of DISCOUNT_KINDS) {
      for (const method of ['AUTOMATIC', 'CODE'] as const) {
        const title = `${kind.label} ${method.toLowerCase()} ${unique}`;
        const key = `${kind.value}:${method}`;
        titles.set(key, title);
        await createDiscount(page, kind, method, title, `${kind.value}-${unique}`);
      }
    }

    await page.reload();
    await expect(page.getByTestId('page-title')).toHaveText('Discounts');
    await expect(discountRows(page)).toHaveCount(8);

    for (const kind of DISCOUNT_KINDS) {
      for (const method of ['AUTOMATIC', 'CODE'] as const) {
        const title = getDiscountTitle(titles, `${kind.value}:${method}`);
        const cell = page.getByTestId('discounts-table').getByText(title, { exact: true });
        const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
        await expect(cell).toBeVisible();
        await expect(row).toContainText(method === 'AUTOMATIC' ? 'Automatic' : 'Code');
        await expect(row).toContainText(
          kind.value === 'BUY_X_GET_Y' ? 'Buy x get y' : kind.label,
        );
      }
    }

    await editAmountOffProducts(
      page,
      getDiscountTitle(titles, 'AMOUNT_OFF_PRODUCTS:AUTOMATIC'),
    );
    await editBuyXGetY(page, getDiscountTitle(titles, 'BUY_X_GET_Y:AUTOMATIC'));
    await editAmountOffOrder(
      page,
      getDiscountTitle(titles, 'AMOUNT_OFF_ORDER:AUTOMATIC'),
    );
    await editFreeShipping(page, getDiscountTitle(titles, 'FREE_SHIPPING:CODE'));
    await editGeneralSettingsAndCodes(
      page,
      getDiscountTitle(titles, 'AMOUNT_OFF_PRODUCTS:CODE'),
      unique,
    );
    await editAutomaticGeneralSettings(
      page,
      getDiscountTitle(titles, 'AMOUNT_OFF_ORDER:AUTOMATIC'),
    );
    await editEligibilityAndChannels(
      page,
      getDiscountTitle(titles, 'BUY_X_GET_Y:CODE'),
    );
    await editAvailability(page, getDiscountTitle(titles, 'FREE_SHIPPING:CODE'));
    await assertEveryDetailsSection(
      page,
      getDiscountTitle(titles, 'AMOUNT_OFF_PRODUCTS:CODE'),
    );
  });
});
