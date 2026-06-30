import { test } from '@fixtures/base.extend';
import { seedProject } from '@data/seed-project';
import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

interface SeedProductFile {
  title: string;
  slug: string;
}

function readSeedProducts(dataDir: string): SeedProductFile[] {
  const productsDir = path.join(dataDir, 'products');
  const files = fs.readdirSync(productsDir).filter((file) => file.endsWith('.json'));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(productsDir, file), 'utf-8');
    return JSON.parse(raw) as SeedProductFile;
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
  await firstNameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);

  if (!(await firstNameInput.isVisible().catch(() => false))) {
    return;
  }

  await firstNameInput.fill('Test');
  await page.getByTestId('complete-profile-last-name-input').fill('User');
  await page.getByTestId('complete-profile-submit-button').click();
  await expect(firstNameInput).toBeHidden();
}

async function openProductsPage(
  page: Page,
  organizationName: string,
  projectSlug: string,
  email: string,
  password: string,
) {
  await signIn(page, email, password);
  await completeProfileIfNeeded(page);
  await page.goto(`/${organizationName}/${projectSlug}/products`);
  await expect(page.getByTestId('page-title')).toHaveText('Products');
}

async function expectProductPagesLoaded(page: Page, totalCount: number, pageSize: number) {
  const rows = page.getByTestId('products-table').locator('.ag-center-cols-container .ag-row');
  const nextButton = page.getByTestId('products-pagination-next-button');

  for (let pageIndex = 0; pageIndex * pageSize < totalCount; pageIndex += 1) {
    const from = pageIndex * pageSize + 1;
    const to = Math.min((pageIndex + 1) * pageSize, totalCount);
    const expectedRows = to - from + 1;

    await expect(page.getByTestId('products-pagination-range')).toHaveText(
      `${from}–${to} of ${totalCount}`,
    );
    await expect(rows).toHaveCount(expectedRows);

    if (to === totalCount) {
      break;
    }

    await nextButton.click();
  }
}

test.describe('Seed project products UI', () => {
  test.setTimeout(300_000);

  test('seeds catalog data on the test runtime and shows every product row', async ({
    api,
    page,
  }) => {
    api.session.user.data.password = 'StrongPassword123!';
    await api.session.setupUser();
    const organization = await api.session.setupOrganization();
    await api.session.setupProject();

    const boxingDataDir = path.resolve(process.cwd(), 'data', 'seed-boxing');
    const jsonDataDir = path.resolve(process.cwd(), 'data', 'seed-json');
    const expectedProducts = [
      ...readSeedProducts(boxingDataDir),
      ...readSeedProducts(jsonDataDir),
    ];

    await seedProject(api.admin, boxingDataDir, {
      seedReviews: false,
      seedCustomers: false,
    });
    await seedProject(api.admin, jsonDataDir, {
      seedReviews: false,
      seedCustomers: false,
    });

    await expect
      .poll(async () => {
        const { data } = await api.admin.query('inventory-api/ProductFindMany', {
          variables: { first: 1 },
        });

        return data.catalogQuery.products.totalCount;
      })
      .toBe(expectedProducts.length);

    await openProductsPage(
      page,
      organization.name,
      api.session.projectSlug,
      api.session.user.data.email,
      api.session.user.data.password,
    );

    const firstPageSize = Math.min(20, expectedProducts.length);
    await expect(page.getByTestId('products-pagination-range')).toHaveText(
      `1–${firstPageSize} of ${expectedProducts.length}`,
    );

    await expectProductPagesLoaded(page, expectedProducts.length, firstPageSize);
  });
});
