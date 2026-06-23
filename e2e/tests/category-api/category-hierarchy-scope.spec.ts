import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiCatalogQuery, ApiCategory } from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';

const catalog = (data: unknown) => data as { catalogQuery: ApiCatalogQuery };

type CategoryTree = {
  prefix: string;
  root: ApiCategory;
  childA: ApiCategory;
  childB: ApiCategory;
  grandchild: ApiCategory;
  outside: ApiCategory;
};

async function createCategoryTree(api: ApiFixtures['api']): Promise<CategoryTree> {
  await api.session.setupUserAndStore();

  const prefix = `hierarchy-scope-${randomUUID().slice(0, 8)}`;
  const root = await api.admin.category.create({
    handle: `${prefix}-root`,
    name: 'Hierarchy Root',
  });
  const childA = await api.admin.category.create({
    handle: `${prefix}-child-a`,
    name: 'Hierarchy Child A',
    parentId: root.id,
  });
  const childB = await api.admin.category.create({
    handle: `${prefix}-child-b`,
    name: 'Hierarchy Child B',
    parentId: root.id,
  });
  const grandchild = await api.admin.category.create({
    handle: `${prefix}-grandchild`,
    name: 'Hierarchy Grandchild',
    parentId: childA.id,
  });
  const outside = await api.admin.category.create({
    handle: `${prefix}-outside`,
    name: 'Outside Category',
  });

  return {
    prefix,
    root: root as ApiCategory,
    childA: childA as ApiCategory,
    childB: childB as ApiCategory,
    grandchild: grandchild as ApiCategory,
    outside: outside as ApiCategory,
  };
}

async function queryCategories(
  api: ApiFixtures['api'],
  variables: Record<string, unknown>,
) {
  const { data } = await api.admin.query('category-api/CategoryFindMany', {
    variables,
  });

  const connection = catalog(data).catalogQuery.categories;

  return {
    ...connection,
    nodes: connection.edges.map((edge) => edge.node),
  };
}

function expectHandles(nodes: ApiCategory[], expectedHandles: string[]) {
  expect(nodes.map((node) => node.handle).sort()).toEqual([...expectedHandles].sort());
}

test.describe('Category hierarchy scope API', () => {
  test('filters categories by descendants and ancestors hierarchy scope', async ({ api }) => {
    const tree = await createCategoryTree(api);
    const ownCategoriesWhere = { handle: { _startsWith: tree.prefix } };

    const descendants = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.root.id,
          direction: 'DESCENDANTS',
        },
      },
    });

    expect(descendants.totalCount).toBe(3);
    expectHandles(descendants.nodes, [
      tree.childA.handle,
      tree.childB.handle,
      tree.grandchild.handle,
    ]);

    const descendantsFirstPage = await queryCategories(api, {
      first: 2,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.root.id,
          direction: 'DESCENDANTS',
        },
      },
    });

    expect(descendantsFirstPage.totalCount).toBe(3);
    expect(descendantsFirstPage.nodes).toHaveLength(2);
    expect(descendantsFirstPage.pageInfo.hasNextPage).toBe(true);
    expect(descendantsFirstPage.pageInfo.endCursor).toBeTruthy();

    const descendantsSecondPage = await queryCategories(api, {
      first: 2,
      after: descendantsFirstPage.pageInfo.endCursor,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.root.id,
          direction: 'DESCENDANTS',
        },
      },
    });

    expect(descendantsSecondPage.totalCount).toBe(3);
    expect(descendantsSecondPage.nodes).toHaveLength(1);
    expect(descendantsSecondPage.pageInfo.hasNextPage).toBe(false);
    expectHandles([...descendantsFirstPage.nodes, ...descendantsSecondPage.nodes], [
      tree.childA.handle,
      tree.childB.handle,
      tree.grandchild.handle,
    ]);

    const subtreeExcluded = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.root.id,
          direction: 'DESCENDANTS',
          includeReference: true,
          mode: 'EXCLUDE',
        },
      },
    });

    expect(subtreeExcluded.totalCount).toBe(1);
    expectHandles(subtreeExcluded.nodes, [tree.outside.handle]);

    const ancestorsWithReference = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'depth', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.grandchild.id,
          direction: 'ANCESTORS',
          includeReference: true,
        },
      },
    });

    expect(ancestorsWithReference.totalCount).toBe(3);
    expectHandles(ancestorsWithReference.nodes, [
      tree.root.handle,
      tree.childA.handle,
      tree.grandchild.handle,
    ]);

    const eligibleSubcategories = await queryCategories(api, {
      first: 10,
      where: {
        _and: [
          ownCategoriesWhere,
          {
            id: {
              _notIn: [tree.childA.id],
            },
          },
        ],
      },
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.grandchild.id,
          direction: 'ANCESTORS',
          includeReference: true,
          mode: 'EXCLUDE',
        },
      },
    });

    expect(eligibleSubcategories.totalCount).toBe(2);
    expectHandles(eligibleSubcategories.nodes, [tree.childB.handle, tree.outside.handle]);

    const invalidReference = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      meta: {
        hierarchyScope: {
          referenceId: 'not-a-category-global-id',
          direction: 'DESCENDANTS',
          includeReference: true,
          mode: 'EXCLUDE',
        },
      },
    });

    expect(invalidReference.totalCount).toBe(0);
    expect(invalidReference.nodes).toHaveLength(0);
  });
});
