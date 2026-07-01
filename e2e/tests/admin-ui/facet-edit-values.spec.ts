import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect, type Locator, type Page } from '@playwright/test';

type Api = ApiFixtures['api'];

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

async function createProductWithSizeOptions(api: Api, unique: string) {
  const { data } = await api.admin.mutation('inventory-api/ProductCreate', {
    variables: {
      input: {
        title: `Facet Edit Values Product ${unique}`,
        handle: `facet-edit-values-product-${unique}`,
        options: [
          {
            name: 'Size',
            slug: 'size',
            displayType: 'BUTTONS',
            sortIndex: 0,
            values: [
              { name: 'Small', slug: 's', sortIndex: 0 },
              { name: 'Medium', slug: 'm', sortIndex: 1 },
              { name: 'Large', slug: 'l', sortIndex: 2 },
              { name: 'XL', slug: 'xl', sortIndex: 3 },
            ],
          },
        ],
        variants: [
          { handle: `facet-edit-values-product-${unique}-s` },
          { handle: `facet-edit-values-product-${unique}-m` },
          { handle: `facet-edit-values-product-${unique}-l` },
          { handle: `facet-edit-values-product-${unique}-xl` },
        ],
      },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);
}

async function createOptionFacet(api: Api, unique: string) {
  const { data } = await api.admin.mutation('facet-api/FacetCreate', {
    variables: {
      input: {
        facetType: 'OPTION',
        slug: `facet-edit-size-${unique}`,
        label: `Facet Edit Size ${unique}`,
        uiType: 'CHECKBOX',
        selectionMode: 'MULTI',
        sources: [{ handle: 'size', name: 'Size' }],
        valueCandidates: [
          { sourceHandle: 'size', handle: 'size:s', label: 'Small' },
          { sourceHandle: 'size', handle: 'size:m', label: 'Medium' },
        ],
      },
    },
  });

  const result = data.catalogMutation.facetCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.facet?.id).toBeTruthy();

  return {
    id: result.facet!.id,
    label: result.facet!.label,
    slug: result.facet!.slug,
  };
}

function gridRows(grid: Locator) {
  return grid.locator('.ag-center-cols-container .ag-row');
}

async function openFacetEditModal(page: Page, slug: string) {
  const cell = page.getByTestId(`facets-table-name-cell-${slug}`);
  const row = page
    .getByTestId('facets-table')
    .locator('.ag-center-cols-container .ag-row')
    .filter({ has: cell })
    .first();

  await row.locator('button[data-testid^="facets-row-actions-"]').click();
  await page.getByTestId(`facets-row-action-edit-${slug}`).click();

  const modal = page.getByTestId('edit-facet-modal').filter({ visible: true }).first();
  await expect(modal).toBeVisible();
  await expect(modal.getByTestId('facet-values-grid')).toBeVisible();
  return modal;
}

async function addFacetValues(page: Page, handles: string[]) {
  await page.getByTestId('facet-values-add-button').click();

  const modal = page.getByTestId('facet-value-candidates-modal');
  await expect(modal).toBeVisible();

  for (const handle of handles) {
    const cell = modal.getByTestId(`facet-value-candidate-cell-${handle}`);
    await expect(cell).toBeVisible();
    await cell.click();
  }

  await page.getByTestId('submit-facet-value-candidates-form-button').click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

async function selectFacetValueRow(page: Page, handle: string) {
  const row = page.getByTestId(`facet-values-row-${handle}`);
  await expect(row).toBeVisible();
  await row.click();
}

async function removeValueFromGroupModal(page: Page, handle: string) {
  await page.getByTestId(`facet-value-group-remove-value-${handle}`).click();
  await expect(page.getByTestId(`facet-value-group-value-row-${handle}`)).toBeHidden();
}

async function addValueInGroupModal(page: Page, label: string, handle: string) {
  await page.getByTestId('facet-value-group-add-value-button').click();
  const autocomplete = page.getByTestId('facet-value-group-source-autocomplete');
  await autocomplete.locator('input').fill(label);
  await page
    .locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option')
    .filter({ hasText: label })
    .first()
    .click();
  await expect(page.getByTestId(`facet-value-group-value-row-${handle}`)).toBeVisible();
}

async function openCreateValueGroupModal(page: Page, handles: string[]) {
  for (const handle of handles) {
    await selectFacetValueRow(page, handle);
  }

  await expect(page.getByTestId('facet-values-bulk-panel')).toBeVisible();
  await page.getByTestId('facet-values-add-to-group-button').click();

  const modal = page.getByTestId('facet-value-group-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function openEditValueGroupModal(page: Page, groupHandle: string) {
  await page.getByTestId(`facet-values-row-actions-${groupHandle}`).click();
  await page.getByTestId(`facet-values-action-edit-${groupHandle}`).click();

  const modal = page.getByTestId('facet-value-group-modal');
  await expect(modal).toBeVisible();
  return modal;
}

async function submitValueGroupModal(page: Page, modal: Locator) {
  await page.getByTestId('submit-facet-value-group-form-button').click();
  await expect(modal).toBeHidden({ timeout: 20_000 });
}

async function ungroupValueGroup(page: Page, groupHandle: string) {
  await page.getByTestId(`facet-values-row-actions-${groupHandle}`).click();
  await page.getByTestId(`facet-values-action-ungroup-${groupHandle}`).click();
}

async function deleteFacetValue(page: Page, handle: string) {
  await page.getByTestId(`facet-values-row-actions-${handle}`).click();
  await page.getByTestId(`facet-values-action-delete-${handle}`).click();
  await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Delete' }).click();
}

test.describe('Admin facet values edit UI', () => {
  test.setTimeout(120_000);

  test('adds, deletes, groups, and ungroups option facet values in one edit session', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const unique = crypto.randomUUID().slice(0, 8);
    await createProductWithSizeOptions(api, unique);
    const facet = await createOptionFacet(api, unique);
    const facetsUrl = `/${organization.name}/${api.session.projectSlug}/facets`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(facetsUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Facets');

    const modal = await openFacetEditModal(page, facet.slug);
    const grid = modal.getByTestId('facet-values-grid');
    await expect(gridRows(grid)).toHaveCount(2);
    await expect(page.getByTestId('facet-values-row-size:s')).toBeVisible();
    await expect(page.getByTestId('facet-values-row-size:m')).toBeVisible();

    await addFacetValues(page, ['size:l', 'size:xl']);
    await expect(page.getByTestId('facet-values-row-size:l')).toBeVisible();
    await expect(page.getByTestId('facet-values-row-size:xl')).toBeVisible();

    const createGroupModal = await openCreateValueGroupModal(page, ['size:s', 'size:m']);
    await createGroupModal.getByTestId('facet-value-group-name-input').fill('Compact');
    await removeValueFromGroupModal(page, 'size:m');
    await addValueInGroupModal(page, 'Medium', 'size:m');
    await submitValueGroupModal(page, createGroupModal);

    await expect(page.getByTestId('facet-values-row-compact')).toBeVisible();
    await expect(page.getByTestId('facet-values-grouped-cell-compact')).toContainText(
      'Small',
    );
    await expect(page.getByTestId('facet-values-grouped-cell-compact')).toContainText(
      'Medium',
    );

    const editGroupModal = await openEditValueGroupModal(page, 'compact');
    await removeValueFromGroupModal(page, 'size:s');
    await addValueInGroupModal(page, 'Large', 'size:l');
    await submitValueGroupModal(page, editGroupModal);

    await expect(page.getByTestId('facet-values-grouped-cell-compact')).toContainText(
      'Medium',
    );
    await expect(page.getByTestId('facet-values-grouped-cell-compact')).toContainText(
      'Large',
    );
    await expect(page.getByTestId('facet-values-grouped-cell-compact')).not.toContainText(
      'Small',
    );

    await ungroupValueGroup(page, 'compact');
    await expect(page.getByTestId('facet-values-grouped-cell-compact')).not.toContainText(
      'Medium',
    );
    await expect(page.getByTestId('facet-values-grouped-cell-compact')).not.toContainText(
      'Large',
    );
    await expect(page.getByTestId('facet-values-row-size:s')).toBeVisible();
    await expect(page.getByTestId('facet-values-row-size:m')).toBeVisible();
    await expect(page.getByTestId('facet-values-row-size:l')).toBeVisible();

    await deleteFacetValue(page, 'size:xl');
    await expect(page.getByTestId('facet-values-row-size:xl')).toBeHidden({
      timeout: 20_000,
    });
    await expect(page.getByTestId('facet-values-row-size:l')).toBeVisible();
  });
});
