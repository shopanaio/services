import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { EntityStatus } from '@codegen/admin-gql';
import { randomUUID } from 'node:crypto';
import { ApiFixtures } from '@fixtures/api/api';
import { ApiProduct, ApiProductVariant } from '@codegen/client-gql';

/* eslint-disable @typescript-eslint/no-explicit-any */

const checkProductInSearch = async (
  api: ApiFixtures['api'],
  query: string,
  expectedTitle: string,
): Promise<void> => {
  const { data } = await api.client.query('client/PredictiveSearchProducts', {
    variables: { query },
  });
  const titles: string[] = data.predictiveSearch.products.map((e: ApiProduct) => e.title);
  expect(titles).toContain(expectedTitle);
};

test.describe('storefront predictive products search', () => {
  test('title prefix match', async ({ api }) => {
    const slug = `macbook-pro-${randomUUID()}`;

    await api.session.setupUserAndProject();
    const product = await api.admin.product.createWithOptions({
      title: 'MacBook Pro',
      slug,
      status: EntityStatus.Published,
      options: [
        { title: 'Model', values: ['Pro', 'Air', 'Mini', 'Max'] },
        { title: 'RAM', values: ['16GB', '32GB'] },
      ],
    });

    const variantWithMax = product.variants.find((v: any) => v.title.includes('Max'));
    expect(variantWithMax).toBeDefined();
    const expectedVariantTitle = (variantWithMax as any).title;

    await api.session.setupApiKey();
    const { data } = await api.client.query('client/PredictiveSearchProducts', {
      variables: { query: 'max' },
    });
    const foundTitles: string[] = data.predictiveSearch.products.map(
      (e: ApiProductVariant) => e.title,
    );
    expect(foundTitles).toContain(expectedVariantTitle);
  });

  test('keyword match (full + prefix)', async ({ api }) => {
    await api.session.setupUserAndProject();
    const product = await api.admin.product.createWithOptions({
      title: 'UltraBook X',
      slug: `ultrabook-${randomUUID()}`,
      status: EntityStatus.Published,
      options: [{ title: 'Edition', values: ['Ultra Performance X'] }],
    });

    const groupId = await api.admin.search.keywordGroupCreate({ title: 'SEO' });
    await api.admin.search.keywordCreate({ groupId, keyword: 'laptop', localeCode: 'en' });
    await api.admin.search.linkGroupToProduct({ groupId, productId: product.id });

    const expectedVariantTitle = product.variants[0].title;
    await api.session.setupApiKey();
    await checkProductInSearch(api, 'laptop', expectedVariantTitle);
  });

  test('synonym expansion', async ({ api }) => {
    await api.session.setupUserAndProject();
    const product = await api.admin.product.createWithOptions({
      title: 'Notebook 13',
      slug: `notebook-${randomUUID()}`,
      status: EntityStatus.Published,
      options: [
        {
          title: 'Edition',
          values: ['Thirteen Inch Edition'],
        },
      ],
    });

    await api.admin.search.synonymUpsert({
      term: 'inch',
      synonym: 'laptop',
      localeCode: 'en',
      weight: 1,
    });

    await api.session.setupApiKey();
    const expectedVariantTitle = product.variants[0].title;
    await checkProductInSearch(api, 'laptop', expectedVariantTitle);
  });

  test.skip('locale specific search', async ({ api: _api }) => {
    void _api;
  });

  test('draft products not returned', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.createWithOptions({
      title: 'Draft Gizmo',
      slug: `draft-${randomUUID()}`,
      status: EntityStatus.Draft,
      options: [{ title: 'Edition', values: ['DraftAlpha'] }],
    });

    const variantTitle = product.variants[0].title;

    await api.session.setupApiKey();
    const { data } = await api.client.query('client/PredictiveSearchProducts', {
      variables: { query: 'Draft' },
    });
    const titles: string[] = data.predictiveSearch.products.map((e: ApiProduct) => e.title);
    expect(titles).not.toContain(variantTitle);
  });

  test('relevance sort order', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.createWithOptions({
      title: 'Test Camera',
      slug: `camera-${randomUUID()}`,
      status: EntityStatus.Published,
      options: [{ title: 'Model', values: ['Canon', 'Canon XR', 'Canonite'] }],
    });

    const exactVariant = product.variants.find((v: any) => v.title === 'Canon');
    const prefixVariant = product.variants.find((v: any) => v.title === 'Canon XR');

    expect(exactVariant).toBeDefined();
    expect(prefixVariant).toBeDefined();

    const exactMatchTitle = (exactVariant as any).title;
    const prefixMatchTitle = (prefixVariant as any).title;

    await api.session.setupApiKey();

    await checkProductInSearch(api, 'Canon', exactMatchTitle);
    await checkProductInSearch(api, 'Canon', prefixMatchTitle);

    const { data } = await api.client.query('client/PredictiveSearchProducts', {
      variables: { query: 'Canon' },
    });
    const products: ApiProduct[] = data.predictiveSearch.products;

    expect(products.length).toBeGreaterThanOrEqual(2);

    const titles: string[] = products.map((it) => it.title);

    expect(titles[0]).toBe(exactMatchTitle);

    const prefixIndex = titles.indexOf(prefixMatchTitle);
    expect(prefixIndex).toBeGreaterThan(0);
  });

  test('2-char prefix only query (no fuzzy)', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.createWithOptions({
      title: 'Television',
      slug: `television-${randomUUID()}`,
      status: EntityStatus.Published,
      options: [{ title: 'Series', values: ['Ultra HD'] }],
    });

    const expectedVariantTitle = product.variants[0].title;
    await api.session.setupApiKey();
    await checkProductInSearch(api, 'ul', expectedVariantTitle);
  });
});
