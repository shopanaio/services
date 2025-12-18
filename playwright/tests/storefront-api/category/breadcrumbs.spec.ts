/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { EntityStatus, ListingSort, ListingType } from '@codegen/admin-gql';
import { CategorySort } from '@codegen/client-gql';
import { expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type { GraphQLFileName } from '@queries/filenames';

// Helpers ------------------------------------------------------------------

type Prepared = {
  root: {
    id: string;
    handle: string;
    title: string;
  };
  child: {
    id: string;
    handle: string;
    title: string;
  };
  grandchild: {
    id: string;
    handle: string;
    title: string;
  };
};

async function prepareNestedCategories(api: ApiFixtures['api']): Promise<Prepared> {
  await api.session.setupUserAndProject();

  // Root category (level 1)
  const rootTitle = `Root Cat ${randomUUID()}`;
  const rootSlug = `root-cat-${randomUUID()}`;
  const root = await api.admin.category.create({
    input: {
      title: rootTitle,
      slug: rootSlug,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: ListingSort.CreatedAtAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
      excerpt: 'Root excerpt',
      description: {
        json: JSON.stringify({
          blocks: [{ type: 'paragraph', data: { text: 'Root desc' } }],
        }),
        text: 'Root desc',
        html: '<p>Root desc</p>',
      },
      seo: {
        title: 'Root SEO',
        description: 'Root SEO',
      },
      gallery: [],
      listingFilters: [],
    },
  });

  // Child category (level 2)
  const childTitle = `Child Cat ${randomUUID()}`;
  const childSlug = `child-cat-${randomUUID()}`;
  const child = await api.admin.category.create({
    input: {
      title: childTitle,
      slug: childSlug,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: ListingSort.CreatedAtAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
      excerpt: 'Child excerpt',
      description: {
        json: JSON.stringify({
          blocks: [{ type: 'paragraph', data: { text: 'Child desc' } }],
        }),
        text: 'Child desc',
        html: '<p>Child desc</p>',
      },
      seo: {
        title: 'Child SEO',
        description: 'Child SEO',
      },
      parentId: root.id,
      gallery: [],
      listingFilters: [],
    },
  });

  // Grandchild category (level 3)
  const grandchildTitle = `Grandchild Cat ${randomUUID()}`;
  const grandchildSlug = `grandchild-cat-${randomUUID()}`;
  const grandchild = await api.admin.category.create({
    input: {
      title: grandchildTitle,
      slug: grandchildSlug,
      status: EntityStatus.Published,
      includeChildrenProducts: true,
      listingOrderBy: ListingSort.CreatedAtAsc,
      listingOrderByStatus: true,
      listingType: ListingType.Manual,
      excerpt: 'Grandchild excerpt',
      description: {
        json: JSON.stringify({
          blocks: [{ type: 'paragraph', data: { text: 'Grandchild desc' } }],
        }),
        text: 'Grandchild desc',
        html: '<p>Grandchild desc</p>',
      },
      seo: {
        title: 'Grandchild SEO',
        description: 'Grandchild SEO',
      },
      parentId: child.id,
      gallery: [],
      listingFilters: [],
    },
  });

  await api.session.setupApiKey();

  return {
    root: { id: root.id, handle: rootSlug, title: rootTitle },
    child: { id: child.id, handle: childSlug, title: childTitle },
    grandchild: { id: grandchild.id, handle: grandchildSlug, title: grandchildTitle },
  };
}

// Tests --------------------------------------------------------------------

test.describe('client category breadcrumbs, source is not included', () => {
  test('category query returns full breadcrumbs chain', async ({ api }) => {
    const { root, child, grandchild } = await prepareNestedCategories(api);

    const { data } = await api.client.query(
      'client/CategoryBreadcrumbs' as unknown as GraphQLFileName,
      {
        variables: {
          handle: grandchild.handle,
        },
      },
    );

    expect(data.category).toBeDefined();

    const category = data.category as any;

    
    expect(category.handle).toBe(grandchild.handle);
    const breadcrumbs = category.breadcrumbs as any[];
    expect(breadcrumbs.map((b: any) => b.title)).toEqual([root.title, child.title]);

    
    const [rootBreadcrumb, childBreadcrumb] = breadcrumbs;

    // Root
    expect(rootBreadcrumb.handle).toBe(root.handle);
    expect(rootBreadcrumb.title).toBe(root.title);
    expect(JSON.stringify(rootBreadcrumb.description).includes('Root desc')).toBe(true);
    expect(rootBreadcrumb.excerpt).toBe('Root excerpt');
    expect(rootBreadcrumb.listingType).toBe('MANUAL');
    expect(rootBreadcrumb.seoTitle).toBe('Root SEO');
    expect(rootBreadcrumb.seoDescription).toBe('Root SEO');

    // Child
    expect(childBreadcrumb.handle).toBe(child.handle);
    expect(childBreadcrumb.title).toBe(child.title);
    expect(JSON.stringify(childBreadcrumb.description).includes('Child desc')).toBe(true);
    expect(childBreadcrumb.excerpt).toBe('Child excerpt');
    expect(childBreadcrumb.listingType).toBe(ListingType.Manual);
    expect(childBreadcrumb.seoTitle).toBe('Child SEO');
    expect(childBreadcrumb.seoDescription).toBe('Child SEO');
  });

  test('categories query returns correct breadcrumbs for all levels', async ({ api }) => {
    const { root, child, grandchild } = await prepareNestedCategories(api);

    const { data } = await api.client.query(
      'client/CategoriesBreadcrumbs' as unknown as GraphQLFileName,
      {
        variables: {
          first: 100,
          sort: CategorySort.CreatedAtAsc,
        },
      },
    );

    const edges = data.categories.edges;

    // Helper to find node by handle
    const findNode = (handle: string) => edges.find((e: any) => e.node.handle === handle)?.node;

    const rootNode = findNode(root.handle) as any;
    const childNode = findNode(child.handle) as any;
    const grandchildNode = findNode(grandchild.handle) as any;

    expect(rootNode).toBeDefined();
    expect(childNode).toBeDefined();
    expect(grandchildNode).toBeDefined();

    
    expect(rootNode.handle).toBe(root.handle);
    expect(rootNode.breadcrumbs).toHaveLength(0);

    
    expect(childNode.handle).toBe(child.handle);
    expect(childNode.title).toBe(child.title);

    expect(childNode.breadcrumbs.map((b: any) => b.title)).toEqual([root.title]);

    
    expect(grandchildNode.handle).toBe(grandchild.handle);
    expect(grandchildNode.title).toBe(grandchild.title);

    expect(grandchildNode.breadcrumbs.map((b: any) => b.title)).toEqual([root.title, child.title]);
  });
});
