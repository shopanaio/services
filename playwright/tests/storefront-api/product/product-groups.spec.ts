import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  EntityStatus,
  WeightUnit,
  ProductGroupPriceType as AdminPriceType,
  DimensionUnit,
} from '@codegen/admin-gql';
import { ProductGroupPriceType as ClientPriceType } from '@codegen/client-gql';
import { randomUUID } from 'node:crypto';



test.describe('client product container groups – price overrides', () => {
  test('variant -> product -> groups -> items -> product price should be adjusted', async ({ api }) => {
    await api.session.setupUserAndProject();

    
    const basePriceCents = 1075; // 10.75
    const fixedAddCents = 299; // +2.99
    const percentValue = 7.5; // +7.5 %

    
    const componentSlug = `component-${randomUUID()}`;

    const createVariantInput = (title: string, sortIndex: number) => ({
      categories: [] as string[],
      costPrice: 0,
      coverId: null,
      features: [],
      gallery: [] as string[],
      inListing: true,
      oldPrice: 0,
      price: basePriceCents,
      sku: '',
      slug: randomUUID(),
      stockStatus: 'IN_STOCK',
      title,
      variantSortIndex: sortIndex,
      weight: 0,
      weightUnit: WeightUnit.Gr,
      width: 0,
      height: 0,
      length: 0,
      dimensionUnit: DimensionUnit.Mm,
    });

    const { data: componentResp } = await api.admin.mutation('admin/ProductCreate', {
      variables: {
        input: {
          description: null,
          excerpt: '',
          groups: [],
          requiresShipping: false,
          slug: componentSlug,
          status: EntityStatus.Published,
          tags: [],
          title: 'Component Product',
          variants: {
            create: [
              createVariantInput('Variant BASE', 0),
              createVariantInput('Variant FREE', 1),
              createVariantInput('Variant FIXED', 2),
              createVariantInput('Variant PERCENT', 3),
            ],
          },
        },
      },
    });

    const componentProduct = componentResp.productMutation.create;
    const variantIds = componentProduct.variants.map((v: { id: string }) => v.id);

    
    const boxSlug = `box-${randomUUID()}`;

    const boxProduct = await api.admin.product.create({
      input: {
        description: null,
        excerpt: '',
        requiresShipping: false,
        slug: boxSlug,
        status: EntityStatus.Published,
        tags: [],
        title: 'Box Product',
        variants: {
          create: [
            {
              categories: [],
              costPrice: 0,
              coverId: null,
              features: [],
              gallery: [],
              inListing: true,
              oldPrice: 0,
              price: 0,
              sku: '',
              slug: boxSlug,
              stockStatus: 'IN_STOCK',
              title: 'Main',
              variantSortIndex: 0,
              weight: 0,
              weightUnit: WeightUnit.Gr,
              width: 0,
              height: 0,
              length: 0,
              dimensionUnit: DimensionUnit.Mm,
            },
          ],
        },
        groups: [],
      },
    });

    
    await api.admin.product.update({
      input: {
        id: boxProduct.id,
        groups: {
          create: [
            {
              isMultiple: true,
              isRequired: true,
              sortIndex: 0,
              title: 'Components',
              items: [
                {
                  variantId: variantIds[0],
                  sortIndex: 0,
                  priceType: AdminPriceType.Base,
                },
                {
                  variantId: variantIds[1],
                  sortIndex: 1,
                  priceType: AdminPriceType.Free,
                },
                {
                  variantId: variantIds[2],
                  sortIndex: 2,
                  priceType: AdminPriceType.BaseAdjustAmount,
                  priceAmountValue: fixedAddCents,
                },
                {
                  variantId: variantIds[3],
                  sortIndex: 3,
                  priceType: AdminPriceType.BaseAdjustPercent,
                  pricePercentageValue: percentValue,
                },
              ],
            },
          ],
        },
      },
    });

    
    await api.session.setupApiKey();

    
    const { data } = await api.client.query('client/ProductContainerGroups', {
      variables: { handle: boxSlug },
    });

    const group = data.variant?.product?.groups[0];
    expect(group?.title).toBe('Components');
    expect(group?.isMultiple).toBe(true);
    expect(group?.isRequired).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const items = group!.items;
    expect(items.length).toBe(4);

    
    
    const expectedByType: Record<ClientPriceType, number> = {
      [ClientPriceType.Base]: Number((basePriceCents / 100).toFixed(2)),
      [ClientPriceType.Free]: 0,
      [ClientPriceType.Fixed]: Number(((basePriceCents + fixedAddCents) / 100).toFixed(2)),
      [ClientPriceType.Percent]: Number(
        ((basePriceCents + (basePriceCents * percentValue) / 100) / 100).toFixed(2),
      ),
    } as const;

    for (const item of items) {
      const priceType = item.price.type as unknown as ClientPriceType;
      const actual = item.node.price.amount;
      const expected = expectedByType[priceType];
      expect(actual).toBe(expected);
    }
  });
});
