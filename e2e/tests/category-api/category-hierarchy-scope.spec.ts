import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiCatalogQuery, ApiCategory, ApiProduct } from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';

const catalog = (data: unknown) => data as { catalogQuery: ApiCatalogQuery };

type CategoryTree = {
  prefix: string;
  root: ApiCategory;
  levelOne: ApiCategory[];
  levelTwo: ApiCategory[][];
  levelThree: ApiCategory[][][];
  outside: ApiCategory;
};

type ProductsScopeFixture = {
  prefix: string;
  productOne: ApiProduct;
  productTwo: ApiProduct;
  productOneCategories: ApiCategory[];
  productTwoCategories: ApiCategory[];
  unassignedCategory: ApiCategory;
};

async function createCategoryTree(api: ApiFixtures['api']): Promise<CategoryTree> {
  await api.session.setupUserAndStore();

  const prefix = `hierarchy-scope-${randomUUID().slice(0, 8)}`;
  const root = await api.admin.category.create({
    handle: `${prefix}-root`,
    name: 'Hierarchy Root',
  });
  const levelOne: ApiCategory[] = [];
  const levelTwo: ApiCategory[][] = [];
  const levelThree: ApiCategory[][][] = [];

  for (let levelOneIndex = 0; levelOneIndex < 5; levelOneIndex += 1) {
    const levelOneCategory = await api.admin.category.create({
      handle: `${prefix}-l1-${levelOneIndex + 1}`,
      name: `Hierarchy Level 1 ${levelOneIndex + 1}`,
      parentId: root.id,
    });
    const levelTwoCategories: ApiCategory[] = [];
    const levelThreeCategoriesByLevelTwo: ApiCategory[][] = [];

    for (let levelTwoIndex = 0; levelTwoIndex < 5; levelTwoIndex += 1) {
      const levelTwoCategory = await api.admin.category.create({
        handle: `${prefix}-l1-${levelOneIndex + 1}-l2-${levelTwoIndex + 1}`,
        name: `Hierarchy Level 2 ${levelOneIndex + 1}.${levelTwoIndex + 1}`,
        parentId: levelOneCategory.id,
      });
      const levelThreeCategories: ApiCategory[] = [];

      for (let levelThreeIndex = 0; levelThreeIndex < 5; levelThreeIndex += 1) {
        const levelThreeCategory = await api.admin.category.create({
          handle: `${prefix}-l1-${levelOneIndex + 1}-l2-${levelTwoIndex + 1}-l3-${
            levelThreeIndex + 1
          }`,
          name: `Hierarchy Level 3 ${levelOneIndex + 1}.${levelTwoIndex + 1}.${levelThreeIndex + 1}`,
          parentId: levelTwoCategory.id,
        });

        levelThreeCategories.push(levelThreeCategory as ApiCategory);
      }

      levelTwoCategories.push(levelTwoCategory as ApiCategory);
      levelThreeCategoriesByLevelTwo.push(levelThreeCategories);
    }

    levelOne.push(levelOneCategory as ApiCategory);
    levelTwo.push(levelTwoCategories);
    levelThree.push(levelThreeCategoriesByLevelTwo);
  }

  const outside = await api.admin.category.create({
    handle: `${prefix}-outside`,
    name: 'Outside Category',
  });

  return {
    prefix,
    root: root as ApiCategory,
    levelOne,
    levelTwo,
    levelThree,
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

async function createProduct(api: ApiFixtures['api'], title: string): Promise<ApiProduct> {
  const handle = `${title.toLowerCase().replace(/\s+/g, '-')}-${randomUUID().slice(0, 8)}`;
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: { title, handle },
    },
  });

  const result = data.catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);
  expect(result.product).toBeTruthy();

  return result.product as ApiProduct;
}

async function addProductToCategory(
  api: ApiFixtures['api'],
  categoryId: string,
  productId: string,
) {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: {
      input: { categoryId, productId },
    },
  });

  const result = data.catalogMutation.categoryAddProduct;
  expect(result.userErrors).toHaveLength(0);
}

async function createProductsScopeFixture(
  api: ApiFixtures['api'],
): Promise<ProductsScopeFixture> {
  await api.session.setupUserAndStore();

  const prefix = `products-scope-${randomUUID().slice(0, 8)}`;
  const categories = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      api.admin.category.create({
        handle: `${prefix}-category-${index + 1}`,
        name: `Products Scope Category ${index + 1}`,
      }),
    ),
  );
  const [categoryOne, categoryTwo, categoryThree, categoryFour, unassignedCategory] =
    categories as ApiCategory[];

  const productOne = await createProduct(api, `${prefix} Product One`);
  const productTwo = await createProduct(api, `${prefix} Product Two`);

  await addProductToCategory(api, categoryOne.id, productOne.id);
  await addProductToCategory(api, categoryTwo.id, productOne.id);
  await addProductToCategory(api, categoryThree.id, productTwo.id);
  await addProductToCategory(api, categoryFour.id, productTwo.id);

  return {
    prefix,
    productOne,
    productTwo,
    productOneCategories: [categoryOne, categoryTwo],
    productTwoCategories: [categoryThree, categoryFour],
    unassignedCategory,
  };
}

async function queryAllCategories(
  api: ApiFixtures['api'],
  variables: Record<string, unknown>,
  pageSize = 50,
) {
  const nodes: ApiCategory[] = [];
  let after: string | null | undefined;
  let totalCount = 0;

  do {
    const page = await queryCategories(api, {
      ...variables,
      first: pageSize,
      after,
    });

    nodes.push(...page.nodes);
    totalCount = page.totalCount;
    after = page.pageInfo.endCursor;

    if (!page.pageInfo.hasNextPage) {
      break;
    }
  } while (after);

  return { nodes, totalCount };
}

function expectHandles(nodes: ApiCategory[], expectedHandles: string[]) {
  expect(nodes.map((node) => node.handle).sort()).toEqual([...expectedHandles].sort());
}

function getTreeCategories(tree: CategoryTree) {
  return [
    tree.root,
    ...tree.levelOne,
    ...tree.levelTwo.flat(),
    ...tree.levelThree.flat(2),
    tree.outside,
  ];
}

function getExpectedParentIds(tree: CategoryTree) {
  const parentIdsByHandle = new Map<string, string | null>([
    [tree.root.handle, null],
    [tree.outside.handle, null],
  ]);

  tree.levelOne.forEach((category) => {
    parentIdsByHandle.set(category.handle, tree.root.id);
  });

  tree.levelTwo.forEach((levelTwoCategories, levelOneIndex) => {
    levelTwoCategories.forEach((category) => {
      parentIdsByHandle.set(category.handle, tree.levelOne[levelOneIndex].id);
    });
  });

  tree.levelThree.forEach((levelThreeCategoriesByLevelTwo, levelOneIndex) => {
    levelThreeCategoriesByLevelTwo.forEach((levelThreeCategories, levelTwoIndex) => {
      levelThreeCategories.forEach((category) => {
        parentIdsByHandle.set(
          category.handle,
          tree.levelTwo[levelOneIndex][levelTwoIndex].id,
        );
      });
    });
  });

  return parentIdsByHandle;
}

function expectParentIds(
  nodes: ApiCategory[],
  expectedParentIdsByHandle: Map<string, string | null>,
) {
  for (const node of nodes) {
    expect(node.parent?.id ?? null).toBe(expectedParentIdsByHandle.get(node.handle));
  }
}

test.describe('Category hierarchy scope API', () => {
  test('filters categories by descendants across a three-level tree', async ({ api }) => {
    const tree = await createCategoryTree(api);
    const ownCategoriesWhere = { handle: { _startsWith: tree.prefix } };
    const allTreeDescendants = [
      ...tree.levelOne,
      ...tree.levelTwo.flat(),
      ...tree.levelThree.flat(2),
    ];
    const secondLevelNode = tree.levelTwo[1][2];
    const secondLevelLeaves = tree.levelThree[1][2];
    const thirdLevelLeaf = tree.levelThree[1][2][3];

    const rootDescendants = await queryAllCategories(api, {
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: tree.root.id,
          direction: 'DESCENDANTS',
          mode: 'INCLUDE',
        },
      },
    });

    expect(rootDescendants.totalCount).toBe(155);
    expectHandles(
      rootDescendants.nodes,
      allTreeDescendants.map((category) => category.handle),
    );
    expect(rootDescendants.nodes.map((category) => category.handle)).not.toContain(
      tree.outside.handle,
    );

    const secondLevelDescendants = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: secondLevelNode.id,
          direction: 'DESCENDANTS',
          mode: 'INCLUDE',
        },
      },
    });

    expect(secondLevelDescendants.totalCount).toBe(5);
    expectHandles(
      secondLevelDescendants.nodes,
      secondLevelLeaves.map((category) => category.handle),
    );

    const thirdLevelDescendants = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: thirdLevelLeaf.id,
          direction: 'DESCENDANTS',
          mode: 'INCLUDE',
        },
      },
    });

    expect(thirdLevelDescendants.totalCount).toBe(0);
    expect(thirdLevelDescendants.nodes).toHaveLength(0);
  });

  test('returns parent category for every level in a three-level tree', async ({ api }) => {
    const tree = await createCategoryTree(api);
    const expectedParentIdsByHandle = getExpectedParentIds(tree);

    const categories = await queryAllCategories(api, {
      where: { handle: { _startsWith: tree.prefix } },
      orderBy: [{ field: 'handle', direction: 'asc' }],
    });

    expect(categories.totalCount).toBe(157);
    expectHandles(
      categories.nodes,
      getTreeCategories(tree).map((category) => category.handle),
    );
    expectParentIds(categories.nodes, expectedParentIdsByHandle);
  });

  test('returns safe parent candidates without the current category subtree', async ({ api }) => {
    const tree = await createCategoryTree(api);
    const currentCategory = tree.levelOne[1];
    const currentCategorySubtree = [
      currentCategory,
      ...tree.levelTwo[1],
      ...tree.levelThree[1].flat(),
    ];
    const safeParentCandidates = getTreeCategories(tree).filter(
      (category) =>
        !currentCategorySubtree.some(
          (subtreeCategory) => subtreeCategory.id === category.id,
        ),
    );

    const candidates = await queryAllCategories(api, {
      where: { handle: { _startsWith: tree.prefix } },
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        hierarchyScope: {
          referenceId: currentCategory.id,
          direction: 'DESCENDANTS',
          includeReference: true,
          mode: 'EXCLUDE',
        },
      },
    });

    expect(candidates.totalCount).toBe(126);
    expectHandles(
      candidates.nodes,
      safeParentCandidates.map((category) => category.handle),
    );
    expect(candidates.nodes.map((category) => category.handle)).not.toEqual(
      expect.arrayContaining(
        currentCategorySubtree.map((category) => category.handle),
      ),
    );
  });

  test('filters category candidates by assigned products scope', async ({ api }) => {
    const fixture = await createProductsScopeFixture(api);
    const ownCategoriesWhere = { handle: { _startsWith: fixture.prefix } };
    const productOneCategoryHandles = fixture.productOneCategories.map(
      (category) => category.handle,
    );
    const productTwoCategoryHandles = fixture.productTwoCategories.map(
      (category) => category.handle,
    );

    const productOneExcluded = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        productsScope: {
          referenceIds: [fixture.productOne.id],
          mode: 'EXCLUDE',
        },
      },
    });

    expect(productOneExcluded.totalCount).toBe(3);
    expectHandles(productOneExcluded.nodes, [
      ...productTwoCategoryHandles,
      fixture.unassignedCategory.handle,
    ]);
    expect(productOneExcluded.nodes.map((category) => category.handle)).not.toEqual(
      expect.arrayContaining(productOneCategoryHandles),
    );

    const productOneIncluded = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        productsScope: {
          referenceIds: [fixture.productOne.id],
          mode: 'INCLUDE',
        },
      },
    });

    expect(productOneIncluded.totalCount).toBe(2);
    expectHandles(productOneIncluded.nodes, productOneCategoryHandles);

    const bothProductsExcluded = await queryCategories(api, {
      first: 10,
      where: ownCategoriesWhere,
      orderBy: [{ field: 'handle', direction: 'asc' }],
      meta: {
        productsScope: {
          referenceIds: [fixture.productOne.id, fixture.productTwo.id],
          mode: 'EXCLUDE',
        },
      },
    });

    expect(bothProductsExcluded.totalCount).toBe(1);
    expectHandles(bothProductsExcluded.nodes, [fixture.unassignedCategory.handle]);
  });
});
