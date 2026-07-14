import { test } from '@fixtures/base.extend';
import { expect, type Locator, type Page } from '@playwright/test';

interface SynonymGroupFixture {
  name: string;
  locale: 'en' | 'uk';
  enabled: boolean;
  values: string[];
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

function synonymRows(page: Page) {
  return page.getByTestId('synonyms-table').locator('.ag-center-cols-container .ag-row');
}

function synonymRow(page: Page, name: string) {
  return synonymRows(page).filter({ hasText: name });
}

async function visibleSynonymNames(page: Page) {
  const rows = synonymRows(page);
  const count = await rows.count();
  const names = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const row = rows.nth(index);
      return {
        rowIndex: Number(await row.getAttribute('row-index')),
        name: ((await row.locator('[col-id="name"]').textContent()) ?? '').trim(),
      };
    }),
  );

  return names.sort((left, right) => left.rowIndex - right.rowIndex).map(({ name }) => name);
}

async function expectVisibleSynonymNames(page: Page, expected: string[]) {
  await expect(synonymRows(page)).toHaveCount(expected.length);
  await expect.poll(() => visibleSynonymNames(page)).toEqual(expected);
}

async function expectVisibleSynonymNamesUnordered(page: Page, expected: string[]) {
  await expect(synonymRows(page)).toHaveCount(expected.length);
  await expect
    .poll(async () => (await visibleSynonymNames(page)).sort())
    .toEqual([...expected].sort());
}

async function selectLocale(page: Page, modal: Locator, locale: 'en' | 'uk') {
  const label = locale === 'en' ? 'English (en)' : 'Ukrainian (uk)';

  await modal.locator('#synonym-group-locale').click();
  await page
    .locator('.ant-select-dropdown:visible')
    .locator('.ant-select-item-option')
    .filter({ hasText: label })
    .click();
}

async function fillSynonymValue(modal: Locator, index: number, value: string) {
  const cell = modal
    .getByTestId('synonym-group-values-grid')
    .locator('.ag-center-cols-container .ag-row')
    .nth(index)
    .locator('[col-id="value"]');

  await cell.dblclick();
  const input = cell.locator('input');
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.press('Tab');
  await expect(cell).toContainText(value);
}

async function fillSynonymValues(modal: Locator, values: string[]) {
  const rows = modal
    .getByTestId('synonym-group-values-grid')
    .locator('.ag-center-cols-container .ag-row');

  while ((await rows.count()) < values.length) {
    await modal.getByRole('button', { name: 'Add synonym' }).click();
  }

  for (const [index, value] of values.entries()) {
    await fillSynonymValue(modal, index, value);
  }
}

async function createSynonymGroupThroughUi(page: Page, group: SynonymGroupFixture) {
  await page.getByRole('button', { name: 'Create synonym group' }).click();
  const modal = page.getByTestId('synonym-group-modal');

  await expect(modal).toBeVisible();
  await modal.locator('#synonym-group-name').fill(group.name);
  await selectLocale(page, modal, group.locale);
  if (!group.enabled) {
    await modal.getByRole('switch', { name: 'Enabled' }).click();
  }
  await fillSynonymValues(modal, group.values);

  await expect(page.getByTestId('submit-synonym-group-form-button')).toBeEnabled();
  await page.getByTestId('submit-synonym-group-form-button').click();
  await expect(modal).toBeHidden();
  await expect(synonymRow(page, group.name)).toHaveCount(1);
}

async function expectSynonymRowValues(page: Page, group: SynonymGroupFixture) {
  const row = synonymRow(page, group.name);

  await expect(row).toHaveCount(1);
  await expect(row.locator('[col-id="name"]')).toHaveText(group.name);
  await expect(row.locator('[col-id="valuesCount"]')).toContainText(String(group.values.length));
  for (const value of group.values) {
    await expect(row.locator('[col-id="valuesCount"]')).toContainText(value);
  }
  await expect(row.locator('[col-id="locale"]')).toHaveText(group.locale.toUpperCase());
  await expect(row.locator('[col-id="enabled"]')).toHaveText(
    group.enabled ? 'Enabled' : 'Disabled',
  );
  await expect(row.locator('[col-id="updatedAt"]')).not.toHaveText('');
}

async function expectSynonymEditorValues(modal: Locator, expected: string[]) {
  const rows = modal
    .getByTestId('synonym-group-values-grid')
    .locator('.ag-center-cols-container .ag-row');

  await expect(rows).toHaveCount(expected.length);
  for (const [index, value] of expected.entries()) {
    await expect(rows.nth(index).locator('[col-id="value"]')).toHaveText(value);
  }
}

test.describe('Admin search synonym groups UI', () => {
  test.describe.configure({ timeout: 45_000 });

  test('creates, searches, sorts, updates, and deletes synonym groups', async ({ api, page }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject({ locales: ['en', 'uk'] });

    const unique = crypto.randomUUID().slice(0, 8);
    const groups: SynonymGroupFixture[] = [
      {
        name: `Gamma Synonyms ${unique}`,
        locale: 'en',
        enabled: true,
        values: [`sneakers ${unique}`, `trainers ${unique}`],
      },
      {
        name: `Alpha Synonyms ${unique}`,
        locale: 'en',
        enabled: true,
        values: [`phone ${unique}`, `mobile ${unique}`, `smartphone ${unique}`],
      },
      {
        name: `Bravo Synonyms ${unique}`,
        locale: 'uk',
        enabled: false,
        values: [`ноутбук ${unique}`, `лептоп ${unique}`],
      },
    ];
    const synonymsUrl = `/${organization.name}/${api.session.projectSlug}/search/synonyms`;

    await signIn(page, api.session.user.data.email, api.session.user.data.password);
    await completeProfileIfNeeded(page);
    await page.goto(synonymsUrl);
    await expect(page.getByTestId('page-title')).toHaveText('Synonyms');

    for (const group of groups) {
      await createSynonymGroupThroughUi(page, group);
    }

    await expectVisibleSynonymNamesUnordered(
      page,
      groups.map(({ name }) => name),
    );
    for (const group of groups) {
      await expectSynonymRowValues(page, group);
    }

    await page.getByTestId('search-input').fill(`alpha synonyms ${unique}`);
    await expectVisibleSynonymNames(page, [groups[1].name]);
    await page.getByTestId('search-input').fill('');
    await expectVisibleSynonymNamesUnordered(
      page,
      groups.map(({ name }) => name),
    );

    const table = page.getByTestId('synonyms-table');
    const ascendingNames = groups.map(({ name }) => name).sort();
    await table.getByRole('columnheader', { name: 'Group' }).click();
    await expectVisibleSynonymNames(page, ascendingNames);
    await table.getByRole('columnheader', { name: 'Group' }).click();
    await expectVisibleSynonymNames(page, [...ascendingNames].reverse());

    const updatedGroup: SynonymGroupFixture = {
      name: `Updated Alpha Synonyms ${unique}`,
      locale: 'uk',
      enabled: false,
      values: [`оновлений ${unique}`, `актуальний ${unique}`, `свіжий ${unique}`],
    };
    await synonymRow(page, groups[1].name).click();
    const editModal = page.getByTestId('synonym-group-modal');
    await expect(editModal).toBeVisible();
    await editModal.locator('#synonym-group-name').fill(updatedGroup.name);
    await selectLocale(page, editModal, updatedGroup.locale);
    await editModal.getByRole('switch', { name: 'Enabled' }).click();
    await fillSynonymValues(editModal, updatedGroup.values);
    await page.getByTestId('submit-synonym-group-form-button').click();
    await expect(editModal).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('page-title')).toHaveText('Synonyms');
    await expectSynonymRowValues(page, updatedGroup);
    await synonymRow(page, updatedGroup.name).click();
    await expect(editModal).toBeVisible();
    await expect(editModal.locator('#synonym-group-name')).toHaveValue(updatedGroup.name);
    await expect(editModal.getByText('Ukrainian (uk)', { exact: true })).toBeVisible();
    await expect(editModal.getByRole('switch', { name: 'Enabled' })).not.toBeChecked();
    await expectSynonymEditorValues(editModal, updatedGroup.values);
    await page.keyboard.press('Escape');
    await expect(editModal).toBeHidden();

    const lastGroup = groups.at(-1)!;
    await synonymRow(page, lastGroup.name).click();
    await expect(editModal).toBeVisible();
    await page.getByTestId('synonym-group-delete-button').click();
    const deleteConfirmation = page.locator('.ant-modal-confirm');
    await expect(deleteConfirmation).toContainText(lastGroup.name);
    await deleteConfirmation.getByRole('button', { name: 'Delete' }).click();
    await expect(editModal).toBeHidden();

    await page.reload();
    await expect(page.getByTestId('page-title')).toHaveText('Synonyms');
    await expect(synonymRow(page, lastGroup.name)).toHaveCount(0);
    await expectVisibleSynonymNamesUnordered(page, [groups[0].name, updatedGroup.name]);
  });
});
