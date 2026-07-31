import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Locator, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

interface ProductFixture {
  id: string;
  handle: string;
  title: string;
}

const UAH = 'UAH';

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

  if (!(await firstNameInput.isVisible().catch(() => false))) return;

  await firstNameInput.fill('Test');
  await page.getByTestId('complete-profile-last-name-input').fill('User');
  await page.getByTestId('complete-profile-submit-button').click();
  await expect(firstNameInput).toBeHidden();
}

async function createProduct(api: Api, title: string, handle: string): Promise<ProductFixture> {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title,
        handle,
        inventoryItem: { tracked: false },
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.product?.id).toBeTruthy();

  return {
    id: result.product!.id,
    title,
    handle,
  };
}

async function setupAdmin(api: Api, page: Page) {
  api.session.user.data.password = 'StrongPassword123!';
  await api.session.setupUser();
  const organization = await api.session.setupOrganization();
  await api.session.setupProject({ currencyCode: UAH });

  await signIn(page, api.session.user.data.email, api.session.user.data.password);
  await completeProfileIfNeeded(page);

  return `/${organization.name}/${api.session.projectSlug}/products`;
}

async function openProductDetails(page: Page, productsUrl: string, product: ProductFixture) {
  await page.setViewportSize({ width: 1920, height: 1400 });
  await page.goto(productsUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
  await page.getByTestId(`products-table-title-cell-${product.handle}`).click();
  await expect(page.getByTestId('product-modal')).toBeVisible();
  await expect(page.getByTestId('product-detail-title')).toHaveText(product.title);
}

function groupRow(modal: Locator, title: string) {
  return modal
    .getByTestId('component-groups-grid')
    .locator('.ag-center-cols-container .ag-row')
    .filter({ hasText: title })
    .first();
}

async function editGridCell(page: Page, cell: Locator, value: string) {
  await cell.dblclick();
  const input = page.locator('.ag-cell-inline-editing input').first();
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press('Enter');
}

async function addGroup(
  page: Page,
  modal: Locator,
  title: string,
  minSelection: number,
  maxSelection: number,
) {
  await modal.getByTestId('component-groups-add-button').click();
  await page.getByTestId('component-groups-add-group-menu-item').click();

  const newRow = groupRow(modal, 'New Group');
  await expect(newRow).toBeVisible();
  await editGridCell(page, newRow.locator('.ag-cell[col-id="name"]'), title);

  const renamedRow = groupRow(modal, title);
  await editGridCell(
    page,
    renamedRow.locator('.ag-cell[col-id="minSelection"]'),
    String(minSelection),
  );
  await editGridCell(
    page,
    renamedRow.locator('.ag-cell[col-id="maxSelection"]'),
    String(maxSelection),
  );
}

async function addProductsToGroup(
  page: Page,
  modal: Locator,
  groupTitle: string,
  productTitles: string[],
) {
  const row = groupRow(modal, groupTitle);
  const rowId = await row.getAttribute('row-id');
  if (!rowId) throw new Error(`AG Grid row id for group "${groupTitle}" was not found`);

  await modal
    .getByTestId('component-groups-grid')
    .locator(`.ag-pinned-right-cols-container .ag-row[row-id="${rowId}"]`)
    .getByTestId('component-groups-row-actions-button')
    .click();
  await page.getByTestId('component-groups-add-item-menu-item').click();

  const picker = page.getByTestId('product-picker-modal');
  await expect(picker).toBeVisible();

  for (const productTitle of productTitles) {
    const pickerRow = picker
      .getByTestId('product-picker-grid')
      .locator('.ag-center-cols-container .ag-row')
      .filter({ hasText: productTitle });
    await expect(pickerRow).toHaveCount(1);
    await pickerRow.click();
  }

  await page.getByTestId('submit-product-picker-form-button').click();
  await expect(picker).toBeHidden();

  const collapsedGroup = groupRow(modal, groupTitle).locator('.ag-group-contracted');
  if (await collapsedGroup.isVisible()) {
    await collapsedGroup.click();
  }

  for (const productTitle of productTitles) {
    await expect(groupRow(modal, productTitle)).toBeVisible();
  }
}

async function selectNavigableOption(
  page: Page,
  trigger: Locator,
  menuTestId: string,
  parentKey: string,
  childLabel?: string,
) {
  await trigger.click();
  await page.getByTestId(`${menuTestId}-option-${parentKey}`).click();

  if (childLabel) {
    await page.getByTestId(`${menuTestId}-children`).getByText(childLabel, { exact: true }).click();
  }
}

async function configureDiscountRule(
  page: Page,
  input: {
    name: string;
    priority: number;
    conditionTargetType: 'GROUP' | 'ITEM';
    conditionTargetLabel: string;
    conditionSubject: 'GROUP_TOTAL_QTY' | 'ITEM_SELECTED';
    conditionOperatorLabel: 'is at least' | 'is selected';
    conditionValue?: number;
    discountPercent: number;
  },
) {
  const inspector = page.getByTestId('dependency-rule-inspector');
  await expect(inspector).toBeVisible();

  await inspector.getByTestId('dependency-rule-name-input').fill(input.name);
  await inspector
    .getByTestId('dependency-rule-priority-input')
    .fill(String(input.priority));

  await inspector.getByTestId('dependency-rule-add-condition-button').click();
  const condition = inspector.getByTestId('dependency-rule-condition').last();
  await selectNavigableOption(
    page,
    condition.getByTestId('dependency-rule-condition-target-button'),
    'dependency-rule-condition-target-menu',
    input.conditionTargetType,
    input.conditionTargetLabel,
  );
  await selectNavigableOption(
    page,
    condition.getByTestId('dependency-rule-condition-operator-button'),
    'dependency-rule-condition-operator-menu',
    input.conditionSubject,
    input.conditionOperatorLabel,
  );

  if (input.conditionValue !== undefined) {
    await condition
      .getByTestId('dependency-rule-condition-value-input')
      .fill(String(input.conditionValue));
  }

  await inspector.getByTestId('dependency-rule-add-action-button').click();
  const action = inspector.getByTestId('dependency-rule-action').last();
  await selectNavigableOption(
    page,
    action.getByTestId('dependency-rule-action-target-button'),
    'dependency-rule-action-target-menu',
    'CONFIGURATION',
  );
  await selectNavigableOption(
    page,
    action.getByTestId('dependency-rule-action-type-button'),
    'dependency-rule-action-type-menu',
    'PRICE',
    'price adjust',
  );

  await action.getByTestId('dependency-rule-price-type-select').click();
  await page
    .locator('.ant-select-dropdown:visible')
    .getByText('Discount %', { exact: true })
    .click();
  await action
    .getByTestId('dependency-rule-price-value-input')
    .fill(String(input.discountPercent));
}

async function addAnotherRule(page: Page) {
  await page.getByTestId('dependency-chart-rules-button').click();
  await page.getByTestId('dependency-chart-add-rule-menu-item').click();
  await expect(page.getByTestId('dependency-rule-inspector')).toBeVisible();
}

test.describe('Admin product component UI', () => {
  test('configures mix-and-match groups, items, and tiered pricing rules in the graph', async ({
    api,
    page,
  }) => {
    test.setTimeout(120_000);

    const productsUrl = await setupAdmin(api, page);
    const unique = crypto.randomUUID().slice(0, 8);

    const componentProduct = await createProduct(
      api,
      `Game Night Components ${unique}`,
      `game-night-components-${unique}`,
    );
    const componentProducts = {
      burger: await createProduct(api, `Classic Burger ${unique}`, `classic-burger-${unique}`),
      wrap: await createProduct(api, `Chicken Wrap ${unique}`, `chicken-wrap-${unique}`),
      fries: await createProduct(api, `Loaded Fries ${unique}`, `loaded-fries-${unique}`),
      salad: await createProduct(api, `Garden Salad ${unique}`, `garden-salad-${unique}`),
      wings: await createProduct(api, `Spicy Wings ${unique}`, `spicy-wings-${unique}`),
      cola: await createProduct(api, `Craft Cola ${unique}`, `craft-cola-${unique}`),
      lemonade: await createProduct(api, `Fresh Lemonade ${unique}`, `fresh-lemonade-${unique}`),
    };

    await openProductDetails(page, productsUrl, componentProduct);

    await page.getByTestId('product-components-add-configuration-button').first().click();
    const configurationModal = page.getByTestId('edit-component-configuration-modal');
    await expect(configurationModal).toBeVisible();
    await configurationModal.getByTestId('component-configuration-name-input').fill('Game Night Mix');
    await page.getByTestId('submit-edit-component-configuration-form-button').click();
    await expect(configurationModal).toBeHidden();
    await expect(page.getByTestId('product-components-configurations-tabs')).toContainText(
      'Game Night Mix',
    );

    await page.getByTestId('product-components-groups-actions-button').click();
    await page.getByTestId('product-components-groups-actions-button-menu-item').click();
    const groupsModal = page.getByTestId('edit-component-groups-modal');
    await expect(groupsModal).toBeVisible();

    await addGroup(page, groupsModal, 'Mains', 1, 1);
    await addGroup(page, groupsModal, 'Sides', 0, 5);
    await addGroup(page, groupsModal, 'Drinks', 0, 3);

    await addProductsToGroup(page, groupsModal, 'Mains', [
      componentProducts.burger.title,
      componentProducts.wrap.title,
    ]);
    await addProductsToGroup(page, groupsModal, 'Sides', [
      componentProducts.fries.title,
      componentProducts.salad.title,
      componentProducts.wings.title,
    ]);
    await addProductsToGroup(page, groupsModal, 'Drinks', [
      componentProducts.cola.title,
      componentProducts.lemonade.title,
    ]);

    await page.getByTestId('submit-edit-component-groups-form-button').click();
    await expect(groupsModal).toBeHidden();

    let configuration: Awaited<ReturnType<typeof readConfiguration>> | null = null;
    await expect
      .poll(async () => {
        configuration = await readConfiguration(api, componentProduct.id);
        return configuration.groups.map((group) => `${group.title}:${group.items.length}`);
      })
      .toEqual(['Mains:2', 'Sides:3', 'Drinks:2']);

    await page.getByTestId('product-components-pricing-actions-button').click();
    await page.getByTestId('product-components-add-rule-menu-item').click();
    const chartModal = page.getByTestId('dependency-chart-modal');
    await expect(chartModal).toBeVisible();
    await page.getByTestId('dependency-chart-rule-node').click();

    await configureDiscountRule(page, {
      name: 'Pick any 3 sides — 10% off',
      priority: 10,
      conditionTargetType: 'GROUP',
      conditionTargetLabel: 'Sides',
      conditionSubject: 'GROUP_TOTAL_QTY',
      conditionOperatorLabel: 'is at least',
      conditionValue: 3,
      discountPercent: 10,
    });

    await addAnotherRule(page);
    await configureDiscountRule(page, {
      name: 'Pick any 5 sides — 20% off',
      priority: 20,
      conditionTargetType: 'GROUP',
      conditionTargetLabel: 'Sides',
      conditionSubject: 'GROUP_TOTAL_QTY',
      conditionOperatorLabel: 'is at least',
      conditionValue: 5,
      discountPercent: 20,
    });

    await addAnotherRule(page);
    await configureDiscountRule(page, {
      name: 'Classic burger combo — 15% off',
      priority: 30,
      conditionTargetType: 'ITEM',
      conditionTargetLabel: componentProducts.burger.title,
      conditionSubject: 'ITEM_SELECTED',
      conditionOperatorLabel: 'is selected',
      discountPercent: 15,
    });

    await page.getByTestId('submit-dependency-chart-form-button').click();
    await expect(chartModal).toBeHidden();

    await expect
      .poll(async () => {
        configuration = await readConfiguration(api, componentProduct.id);
        return configuration.dependencyRules.map((rule) => rule.name);
      })
      .toEqual([
        'Pick any 3 sides — 10% off',
        'Pick any 5 sides — 20% off',
        'Classic burger combo — 15% off',
      ]);

    const groupsByTitle = new Map(configuration!.groups.map((group) => [group.title, group]));
    expect(groupsByTitle.get('Mains')).toMatchObject({ minSelection: 1, maxSelection: 1 });
    expect(groupsByTitle.get('Sides')).toMatchObject({ minSelection: 0, maxSelection: 5 });
    expect(groupsByTitle.get('Drinks')).toMatchObject({ minSelection: 0, maxSelection: 3 });
    expect(
      configuration!.groups.flatMap((group) => group.items.map((item) => item.refProduct?.id)),
    ).toEqual([
      componentProducts.burger.id,
      componentProducts.wrap.id,
      componentProducts.fries.id,
      componentProducts.salad.id,
      componentProducts.wings.id,
      componentProducts.cola.id,
      componentProducts.lemonade.id,
    ]);

    const sides = groupsByTitle.get('Sides')!;
    const burgerItem = groupsByTitle
      .get('Mains')!
      .items.find((item) => item.refProduct?.id === componentProducts.burger.id)!;
    const [threeSidesRule, fiveSidesRule, burgerRule] = configuration!.dependencyRules;

    expect(threeSidesRule).toMatchObject({ enabled: true, priority: 10 });
    expect(threeSidesRule.conditionGroups[0].conditions[0]).toMatchObject({
      targetType: 'GROUP',
      targetId: sides.id,
      subject: 'GROUP_TOTAL_QTY',
      operator: 'GTE',
      value: 3,
    });
    expect(fiveSidesRule.conditionGroups[0].conditions[0]).toMatchObject({
      targetType: 'GROUP',
      targetId: sides.id,
      subject: 'GROUP_TOTAL_QTY',
      operator: 'GTE',
      value: 5,
    });
    expect(burgerRule.conditionGroups[0].conditions[0]).toMatchObject({
      targetType: 'ITEM',
      targetId: burgerItem.id,
      subject: 'ITEM_SELECTED',
      operator: 'IS_SELECTED',
      value: null,
    });

    expect(configuration!.dependencyRules.map((rule) => rule.actions[0])).toEqual([
      expect.objectContaining({
        actionType: 'ADJUST_PRICE',
        targetType: 'CONFIGURATION',
        priceRule: expect.objectContaining({
          strategy: 'ADJUSTMENT',
          operation: 'DECREASE',
          valueType: 'PERCENTAGE',
          percentageBps: 1000,
        }),
      }),
      expect.objectContaining({
        actionType: 'ADJUST_PRICE',
        targetType: 'CONFIGURATION',
        priceRule: expect.objectContaining({ percentageBps: 2000 }),
      }),
      expect.objectContaining({
        actionType: 'ADJUST_PRICE',
        targetType: 'CONFIGURATION',
        priceRule: expect.objectContaining({ percentageBps: 1500 }),
      }),
    ]);

    await expect(page.getByTestId('product-components-pricing-rule')).toHaveCount(3);
  });
});

async function readConfiguration(api: Api, productId: string) {
  const { data } = await api.admin.query('inventory-api/ProductComponentFindOne', {
    variables: { id: productId },
  });
  const configurations = data.catalogQuery.product?.productComponent?.configurations ?? [];
  if (configurations.length !== 1) {
    throw new Error(`Expected one component configuration, received ${configurations.length}`);
  }
  return configurations[0];
}
