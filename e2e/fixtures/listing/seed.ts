import { expect } from '@playwright/test';
import type { ApiFacet, ApiProduct, ApiTag } from '@codegen/admin-gql';
import type { ApiFixtures } from '@fixtures/api/api';
import type { CategoryData } from '@fixtures/admin/category';
import { decodeGlobalId } from '@utils/globalid';
import { seedListingCategoryProducts } from '@utils/listingSeed';

export interface ListingCatalogFixture {
  category: CategoryData;
  products: ApiProduct[];
  facets: ApiFacet[];
  facetAssignments: ListingProductFacetAssignment[];
  expectedOrder: {
    manual: ApiProduct[];
    newest: ApiProduct[];
    created: ApiProduct[];
    name: ApiProduct[];
    priceAsc: ApiProduct[];
    priceDesc: ApiProduct[];
  };
}

export interface ListingProductFacetAssignment {
  productId: string;
  inStock: boolean;
  priceMinor: number;
  options: Record<string, string>;
  features: Record<string, string>;
  tags: string[];
}

const DEFAULT_IN_STOCK_COUNT = 20;

interface ListingFacetGroup {
  facetType: 'OPTION' | 'FEATURE' | 'TAG';
  slug: string;
  label: string;
  sourceHandle: string;
  sourceName: string;
  values: { handle: string; sourceValueHandle?: string; label: string; tag?: ApiTag }[];
}

const listingProductOptions: ListingFacetGroup[] = [
  optionFacetGroup('color', 'Color', [
    ['black', 'Black'],
    ['white', 'White'],
    ['red', 'Red'],
    ['blue', 'Blue'],
    ['green', 'Green'],
  ]),
  optionFacetGroup('material', 'Material', [
    ['cotton', 'Cotton'],
    ['linen', 'Linen'],
  ]),
  optionFacetGroup('size', 'Size', [
    ['xs', 'XS'],
    ['s', 'S'],
    ['m', 'M'],
    ['l', 'L'],
    ['xl', 'XL'],
  ]),
  optionFacetGroup('style', 'Style', [
    ['classic', 'Classic'],
    ['modern', 'Modern'],
  ]),
];

const listingFeatureGroups: ListingFacetGroup[] = Array.from({ length: 15 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {
    facetType: 'FEATURE',
    slug: `feature-${number}`,
    label: `Feature ${number}`,
    sourceHandle: `feature-${number}`,
    sourceName: `Feature ${number}`,
    values: [
      {
        handle: `feature-${number}-a`,
        sourceValueHandle: `feature-${number}:feature-${number}-a`,
        label: `Feature ${number} A`,
      },
      {
        handle: `feature-${number}-b`,
        sourceValueHandle: `feature-${number}:feature-${number}-b`,
        label: `Feature ${number} B`,
      },
    ],
  };
});

export async function seedCategoryListingProducts(
  api: ApiFixtures['api'],
  count = 30,
  inStockCount = DEFAULT_IN_STOCK_COUNT,
): Promise<ListingCatalogFixture> {
  const now = Date.now();
  const unique = crypto.randomUUID().slice(0, 8);
  const category = await api.admin.category.create({
    handle: `listing-category-${unique}`,
    name: 'Listing Category',
  });
  const tagGroups = await createTagFacetGroups(api, unique);

  const products: ApiProduct[] = [];
  for (let productIndex = 0; productIndex < count; productIndex += 1) {
    const titleRank = count - productIndex;
    const createdProduct = await api.admin.product.createWithOptions({
      title: `Sortable Listing Product ${String(titleRank).padStart(2, '0')}`,
      handle: `listing-product-${productIndex + 1}-${crypto.randomUUID().slice(0, 8)}`,
      status: 'PUBLISHED',
      price: (count - productIndex) * 100,
      options: listingProductOptions.map((group) => ({
        name: group.label,
        slug: group.slug,
        values: group.values.map((value) => value.label),
      })),
    });
    const taggedProduct = await addProductTags(api, createdProduct, selectedTags(tagGroups, productIndex));
    await syncProductFeatures(api, taggedProduct.id, selectedFeatureValues(productIndex));

    const { data: addProductData } = await api.admin.mutation('category-api/CategoryAddProduct', {
      variables: {
        categoryId: category.id,
        productId: taggedProduct.id,
      },
    });

    expect(addProductData.catalogMutation.productUpdate.userErrors).toHaveLength(0);
    products.push(taggedProduct);
  }

  const facets = await createListingFacets(api, [...listingProductOptions, ...listingFeatureGroups, ...tagGroups]);
  const facetValueKeys = mapFacetValueKeys(facets);
  const facetAssignments = products.map((product, productIndex) =>
    productFacetAssignment({
      productId: product.id,
      productIndex,
      tagGroups,
      inStock: productIndex < inStockCount,
      priceMinor: (count - productIndex) * 100,
    }),
  );

  await seedListingCategoryProducts({
    storeId: api.session.project.id,
    category,
    products: products.map((product, productIndex) => ({
      id: product.id,
      variantId: selectedVariantId(product, selectedOptionValues(productIndex)),
      handle: product.handle,
      title: product.title,
      publishedAt: new Date(now - productIndex * 1000).toISOString(),
      createdAt: new Date(now - (count - productIndex) * 1000).toISOString(),
      revision: product.revision,
      priceMinor: (count - productIndex) * 100,
      manualSortKey: String(productIndex).padStart(4, '0'),
      inStock: productIndex < inStockCount,
      productFacetValueKeys: [
        ...selectedFeatureValues(productIndex).map((value) => requiredValueKey(facetValueKeys, value.handle)),
        ...selectedTags(tagGroups, productIndex).map((tag) => requiredValueKey(facetValueKeys, tag.handle)),
      ],
      variantFacetValueKeys: selectedOptionValues(productIndex).map((value) =>
        requiredValueKey(facetValueKeys, value.handle),
      ),
    })),
  });

  const reversedProducts = [...products].reverse();
  const inStockProducts = products.slice(0, inStockCount);
  const outOfStockProducts = products.slice(inStockCount);
  const inStockReversedProducts = [...inStockProducts].reverse();
  const outOfStockReversedProducts = [...outOfStockProducts].reverse();

  return {
    category,
    products,
    facets,
    facetAssignments,
    expectedOrder: {
      manual: products,
      newest: products,
      created: [...inStockReversedProducts, ...outOfStockReversedProducts],
      name: [...inStockReversedProducts, ...outOfStockReversedProducts],
      priceAsc: [...inStockReversedProducts, ...outOfStockReversedProducts],
      priceDesc: products,
    },
  };
}

function optionFacetGroup(slug: string, label: string, values: [string, string][]): ListingFacetGroup {
  return {
    facetType: 'OPTION',
    slug,
    label,
    sourceHandle: slug,
    sourceName: label,
    values: values.map(([valueSlug, valueLabel]) => ({
      handle: valueSlug,
      sourceValueHandle: `${slug}:${valueSlug}`,
      label: valueLabel,
    })),
  };
}

async function createTagFacetGroups(api: ApiFixtures['api'], unique: string): Promise<ListingFacetGroup[]> {
  const values = [];

  for (let tagIndex = 0; tagIndex < 16; tagIndex += 1) {
    const number = String(tagIndex + 1).padStart(2, '0');
    const tag = await api.admin.tag.create({
      handle: `tag-${number}-${unique}`,
      name: `Tag ${number}`,
    });
    values.push({ handle: tag.handle, label: tag.name, tag });
  }

  return [
    {
      facetType: 'TAG',
      slug: 'tag',
      label: 'Tags',
      sourceHandle: 'tags',
      sourceName: 'Tags',
      values,
    },
  ];
}

async function addProductTags(
  api: ApiFixtures['api'],
  product: ApiProduct,
  tags: ApiTag[],
): Promise<ApiProduct> {
  return api.admin.product.update({
    productId: product.id,
    expectedRevision: product.revision,
    operations: {
      tags: tags.map((tag) => ({ tagId: tag.id, action: 'ADD' })),
    },
  });
}

async function syncProductFeatures(
  api: ApiFixtures['api'],
  productId: string,
  values: { group: ListingFacetGroup; handle: string; label: string }[],
) {
  const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
    variables: {
      productId,
      operations: {
        features: values.map((value, index) => ({
          index: [index],
          isGroup: false,
          name: value.group.label,
          slug: value.group.slug,
          values: [
            {
              index: 0,
              name: value.label,
              slug: value.handle,
            },
          ],
        })),
      },
    },
  });

  expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
}

async function createListingFacets(
  api: ApiFixtures['api'],
  groups: ListingFacetGroup[],
): Promise<ApiFacet[]> {
  const facets: ApiFacet[] = [];

  for (const group of groups) {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: group.facetType,
          slug: group.slug,
          label: group.label,
          uiType: 'CHECKBOX',
          selectionMode: 'MULTI',
          sources: [
            {
              handle: group.sourceHandle,
              name: group.sourceName,
            },
          ],
          valueCandidates: group.values.map((value) => ({
            handle: value.sourceValueHandle ?? value.handle,
            label: value.label,
            sourceHandle: group.sourceHandle,
          })),
        },
      },
    });

    const result = data.listingMutation.facetCreate;
    expect(result.userErrors).toHaveLength(0);
    const facet = result.facet;
    expect(facet).toBeTruthy();
    if (!facet) {
      throw new Error(`Failed to create facet ${group.slug}`);
    }

    const sourceValueByHandle = new Map(facet.values.map((value) => [value.handle, value]));
    const groupValues = [];

    for (const [index, value] of group.values.entries()) {
      const sourceValue = sourceValueByHandle.get(value.sourceValueHandle ?? value.handle);
      if (!sourceValue) {
        const missingHandle = value.sourceValueHandle ?? value.handle;
        throw new Error(`Missing source facet value for ${group.slug}:${missingHandle}`);
      }

      const { data: valueData } = await api.admin.mutation('facet-api/FacetValueCreate', {
        variables: {
          input: {
            facetId: facet.id,
            kind: 'GROUP',
            handle: value.handle,
            label: value.label,
            sortIndex: index,
            sourceValueIds: [sourceValue.id],
          },
        },
      });
      const valueResult = valueData.listingMutation.facetValueCreate;
      expect(valueResult.userErrors).toHaveLength(0);
      expect(valueResult.facetValue).toBeTruthy();
      groupValues.push({ ...valueResult.facetValue, handle: value.handle, label: value.label });
    }

    facets.push({ ...facet, values: groupValues as ApiFacet['values'] });
  }

  return facets;
}

function selectedFeatureValues(productIndex: number): { group: ListingFacetGroup; handle: string; label: string }[] {
  return listingFeatureGroups.map((group, groupIndex) => {
    const value = group.values[(productIndex + groupIndex) % group.values.length];
    return { group, handle: value.handle, label: value.label };
  });
}

function selectedOptionValues(productIndex: number): { group: ListingFacetGroup; handle: string; label: string }[] {
  return listingProductOptions.map((group, groupIndex) => {
    const value = group.values[(productIndex + groupIndex) % group.values.length];
    return { group, handle: value.handle, label: value.label };
  });
}

function selectedVariantId(product: ApiProduct, selectedOptions: { handle: string }[]): string | null | undefined {
  const selectedVariantHandle = selectedOptions.map((option) => option.handle).join('-');
  return (
    product.variants.edges.find((edge) => edge.node.handle === selectedVariantHandle)?.node.id ??
    product.variants.edges[0]?.node.id
  );
}

function productFacetAssignment(input: {
  productId: string;
  productIndex: number;
  tagGroups: ListingFacetGroup[];
  inStock: boolean;
  priceMinor: number;
}): ListingProductFacetAssignment {
  return {
    productId: input.productId,
    inStock: input.inStock,
    priceMinor: input.priceMinor,
    options: Object.fromEntries(
      selectedOptionValues(input.productIndex).map((value) => [value.group.slug, value.handle]),
    ),
    features: Object.fromEntries(
      selectedFeatureValues(input.productIndex).map((value) => [value.group.slug, value.handle]),
    ),
    tags: selectedTags(input.tagGroups, input.productIndex).map((tag) => tag.handle),
  };
}

function selectedTags(groups: ListingFacetGroup[], productIndex: number): ApiTag[] {
  return groups.map((group, groupIndex) => {
    const value = group.values[(productIndex + groupIndex) % group.values.length];
    if (!value.tag) {
      throw new Error(`Missing tag for ${group.slug}:${value.handle}`);
    }
    return value.tag;
  });
}

function mapFacetValueKeys(facets: ApiFacet[]): Map<string, string> {
  const keys = new Map<string, string>();

  for (const facet of facets) {
    const facetUuid = decodeGlobalId(facet.id).id;
    for (const value of facet.values) {
      keys.set(value.handle, `${facetUuid}:${decodeGlobalId(value.id).id}`);
    }
  }

  return keys;
}

function requiredValueKey(keys: Map<string, string>, handle: string): string {
  const valueKey = keys.get(handle);
  if (!valueKey) {
    throw new Error(`Missing listing facet value key for ${handle}`);
  }
  return valueKey;
}
