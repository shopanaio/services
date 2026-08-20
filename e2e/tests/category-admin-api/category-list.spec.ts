import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiCatalogMutation, ApiCatalogQuery, ApiCategory } from '@codegen/admin-gql';
import { createConnectionPaginationTests } from '@utils/connectionPaginationBuilder';

const catalog = (data: unknown) =>
  data as { catalogMutation: ApiCatalogMutation; catalogQuery: ApiCatalogQuery };

async function prepareCategories(api: ApiFixtures['api']) {
  const prefix = `category-page-${randomUUID().slice(0, 8)}`;
  const expectedItems: ApiCategory[] = [];

  await api.session.setupUserAndStore();

  const categoryData = [
    { suffix: 'alpha', name: 'Alpha Category', publish: true },
    { suffix: 'bravo', name: 'Bravo Category', publish: false },
    { suffix: 'charlie', name: 'Charlie Category', publish: true },
    { suffix: 'delta', name: 'Delta Category', publish: false },
    { suffix: 'echo', name: 'Echo Category', publish: true },
    { suffix: 'foxtrot', name: 'Foxtrot Category', publish: false },
    { suffix: 'golf', name: 'Golf Category', publish: true },
  ];

  for (const item of categoryData) {
    const { data } = await api.admin.mutation('category-api/CategoryCreate', {
      variables: {
        input: {
          handle: `${prefix}-${item.suffix}`,
          name: item.name,
          publish: item.publish,
        },
      },
    });

    const result = catalog(data).catalogMutation.categoryCreate;
    if (result.userErrors.length > 0 || !result.category) {
      throw new Error(`Failed to create category: ${JSON.stringify(result.userErrors)}`);
    }

    expectedItems.push(result.category);
  }

  return {
    expectedItems,
    whereFilter: { handle: { _startsWith: prefix } },
  };
}

createConnectionPaginationTests<ApiCategory>({
  queryName: 'category-api/CategoryFindMany',
  suiteName: 'Category cursor pagination',
  prepare: prepareCategories,
  sortCases: [
    {
      name: 'handle ASC',
      orderBy: [{ field: 'handle', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.handle.localeCompare(b.handle)),
    },
    {
      name: 'handle DESC',
      orderBy: [{ field: 'handle', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.handle.localeCompare(a.handle)),
    },
  ],
  filterCases: [
    {
      name: 'by handle with _containsi',
      where: { handle: { _containsi: 'CHARLIE' } },
      filterExpected: (items) => items.filter((i) => i.handle.toLowerCase().includes('charlie')),
    },
    {
      name: 'with _or condition',
      where: {
        _or: [{ handle: { _contains: 'alpha' } }, { handle: { _contains: 'golf' } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.handle.includes('alpha') || i.handle.includes('golf')),
    },
    {
      name: 'with _not condition',
      where: {
        _not: { handle: { _contains: 'bravo' } },
      },
      filterExpected: (items) => items.filter((i) => !i.handle.includes('bravo')),
    },
  ],
  getConnection: (data) => catalog(data).catalogQuery.categories,
  getNodeIdentifier: (node) => node.id,
  pageSize: 2,
  apiClient: 'admin',
  emptyWhere: { handle: { _eq: '__missing_category_handle__' } },
});
