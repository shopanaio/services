import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

import { randomUUID } from 'crypto';
import type { ApiFixtures } from '@fixtures/api/api';

type FeatureStyleType = 'RADIO' | 'DROPDOWN' | 'APPAREL_SIZE' | 'VARIANT_COVER' | 'SWATCH';

const prepareProductWithDisplayTypes = async (api: ApiFixtures['api']) => {

  await api.session.setupUserAndProject();

  type GroupSpec = {
    title: string;
    type: FeatureStyleType;
    values: string[];
    colors?: string[];
  };

  const specs: GroupSpec[] = [
    { title: 'Radio', type: 'RADIO', values: ['One', 'Two'] },
    { title: 'Dropdown', type: 'DROPDOWN', values: ['Red', 'Blue'] },
    { title: 'ApparelSize', type: 'APPAREL_SIZE', values: ['S', 'M'] },
    { title: 'VariantCover', type: 'VARIANT_COVER', values: ['Front', 'Back'] },
    {
      title: 'Color',
      type: 'SWATCH',
      values: ['Black', 'White'],
      colors: ['#000000', '#FFFFFF'],
    },
  ];

  type FeatureEntity = {
    slug: string;
    title: string;
    type: FeatureStyleType;
    groupSlug: string;
    groupTitle: string;
    color?: string;
  };

  const matrix: FeatureEntity[][] = specs.map((spec) => {
    const groupSlug = spec.title.toLowerCase().replace(/\s+/g, '-');
    return spec.values.map((value, idx) => ({
      slug: `${groupSlug}.${value.toLowerCase().replace(/\s+/g, '-')}`,
      title: value,
      type: spec.type,
      groupSlug,
      groupTitle: spec.title,
      color: spec.type === 'SWATCH' ? spec.colors?.[idx] : undefined,
    }));
  });

  const cartesianProduct = <T>(arr: T[][]): T[][] =>
    arr.reduce<T[][]>((acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])), [[]]);

  const combos = cartesianProduct(matrix);
  const containerSlug = `product-display-types-${randomUUID()}`;

  const variants = combos.map((combo, comboIdx) => ({
    categories: [],
    costPrice: 0,
    coverId: null,
    features: combo.map((feat, idx) => ({
      attributeSortIndex: idx,
      isAttribute: true,
      isOption: true,
      optionSortIndex: idx,
      slug: feat.slug,
      title: feat.title,
      group: {
        slug: feat.groupSlug,
        title: feat.groupTitle,
        featureStyleType: feat.type,
      },
      ...(feat.color
        ? {
            swatch: {
              type: 'COLOR',
              color1: feat.color,
            },
          }
        : {}),
    })),
    gallery: [],
    inListing: true,
    oldPrice: 0,
    price: 0,
    sku: '',
    slug: `${containerSlug}_${combo.map((f) => f.slug).join('_')}`,
    stockStatus: 'IN_STOCK',
    title: combo.map((f) => f.title).join(' '),
    variantSortIndex: comboIdx,
    weight: 0,
    weightUnit: 'g',
    width: 0,
    height: 0,
    length: 0,
    dimensionUnit: 'cm',
  }));

  const product = await api.admin.product.create({
    input: {
      description: null,
      excerpt: '',
      groups: [],
      requiresShipping: false,
      slug: containerSlug,
      status: 'PUBLISHED',
      tags: [],
      title: 'Product Display Types',
      variants: {
        create: variants,
      },
    },
  });

  await api.session.setupApiKey();

  const featureGroups = specs.map((spec) => ({
    slug: spec.title.toLowerCase().replace(/\s+/g, '-'),
    type: spec.type,
    features: spec.values.map((value, idx) => ({
      slug: `${spec.title.toLowerCase().replace(/\s+/g, '-')}.${value.toLowerCase().replace(/\s+/g, '-')}`,
      title: value,
      color: spec.type === 'SWATCH' ? spec.colors?.[idx] : undefined,
    })),
  }));

  return { product, featureGroups };
};

test.describe('product container options displayType & swatch', () => {
  test('should expose correct displayType and swatches through product field', async ({ api }) => {
    const { product: adminProduct, featureGroups } = await prepareProductWithDisplayTypes(api);
    const firstVariantSlug = adminProduct.variants[0].slug;

    const { data } = await api.client.query('client/ProductContainerOptionsDisplay', {
      variables: { handle: firstVariantSlug },
    });
    expect(data.variant).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const productData = data.variant!.product!;
    const options = productData.options;
    expect(options.length).toBe(featureGroups.length);

    featureGroups.forEach((group) => {
      const opt = options.find((o: { handle: string }) => o.handle === group.slug);
      expect(opt).toBeDefined();
      if (!opt) throw new Error('Option not found');
      expect(opt.displayType).toBe(group.type);
    });

    const swatchGroup = featureGroups.find((g) => g.type === 'SWATCH');
    if (swatchGroup) {
      const opt = options.find((o: { handle: string }) => o.handle === swatchGroup.slug);
      expect(opt).toBeDefined();
      if (!opt) throw new Error('Swatch option not found');
      opt.values.forEach((v) => {
        expect(v.swatch).not.toBeNull();

        const expectedColor = swatchGroup.features.find((f) => f.slug === v.handle)?.color;
        if (expectedColor) {
          expect(v.swatch?.color.toLowerCase()).toBe(expectedColor.toLowerCase());
        }
      });
    }
  });
});
