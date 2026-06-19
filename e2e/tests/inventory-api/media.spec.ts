import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId, TypeName } from '../../utils/globalid';

const TEST_IMAGE_1 = 'https://picsum.photos/seed/test1/200/200';
const TEST_IMAGE_2 = 'https://picsum.photos/seed/test2/200/200';
const TEST_IMAGE_3 = 'https://picsum.photos/seed/test3/200/200';

type MediaItem = { file: { id: string }; sortIndex: number };

test.describe('Product Media Registry API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  async function createProduct(
    api: any,
    title = 'Media Test Product',
    mediaFileIds?: string[],
  ) {
    const handle = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle, mediaFileIds } },
    });

    const product = data.catalogMutation.productCreate.product;
    expect(data.catalogMutation.productCreate.userErrors).toHaveLength(0);
    expect(product).toBeTruthy();

    const variantEdges = product?.variants?.edges ?? [];
    const variant = variantEdges[0]?.node ?? null;

    return {
      product,
      productId: product.id as string,
      revision: product.revision as number,
      variant,
      variantId: variant?.id as string,
    };
  }

  async function registerProductMedia(
    api: any,
    productId: string,
    expectedRevision: number,
    fileIds: string[],
  ): Promise<number> {
    const { data } = await api.admin.mutation('inventory-api/ProductUpdate', {
      variables: {
        productId,
        expectedRevision,
        operations: { media: { fileIds } },
      },
    });

    const result = data.catalogMutation.productUpdate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.product.media).toHaveLength(fileIds.length);
    return result.product.revision as number;
  }

  async function productMediaByVariant(api: any, productId: string, variantId: string) {
    const { data } = await api.admin.query('inventory-api/ProductFindOne', {
      variables: { id: productId },
    });
    const product = data.catalogQuery.product;
    const variant = product.variants.edges.find(
      (edge: { node: { id: string } }) => edge.node.id === variantId,
    )?.node;
    return {
      productMedia: sortMedia(product.media),
      variantMedia: sortMedia(variant?.media ?? []),
    };
  }

  function sortMedia(media: MediaItem[]): MediaItem[] {
    return [...media].sort((a, b) => a.sortIndex - b.sortIndex);
  }

  function mediaFileIds(media: MediaItem[]): string[] {
    return sortMedia(media).map((item) => item.file.id);
  }

  test('productCreate registers product media without attaching it to variants', async ({ api }) => {
    const file1 = await api.admin.file.uploadFromUrl(TEST_IMAGE_1, 'Product image 1');
    const file2 = await api.admin.file.uploadFromUrl(TEST_IMAGE_2, 'Product image 2');

    const { product, variant } = await createProduct(
      api,
      'Product Create Media',
      [file1.id, file2.id],
    );

    expect(mediaFileIds(product.media)).toEqual([file1.id, file2.id]);
    expect(variant.media).toHaveLength(0);
  });

  test('variantUpdateMedia attaches registered product media', async ({ api }) => {
    const { productId, revision, variantId } = await createProduct(api);
    const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_1, 'Variant image');
    await registerProductMedia(api, productId, revision, [file.id]);

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: {
        input: {
          variantId,
          fileIds: [file.id],
        },
      },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(0);
    expect(result.variant.id).toBe(variantId);
    expect(mediaFileIds(result.variant.media)).toEqual([file.id]);
  });

  test('variantUpdateMedia dedupes duplicate files and preserves first occurrence order', async ({ api }) => {
    const { productId, revision, variantId } = await createProduct(api, 'Ordered Media Product');
    const file1 = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
    const file2 = await api.admin.file.uploadFromUrl(TEST_IMAGE_2);
    await registerProductMedia(api, productId, revision, [file1.id, file2.id]);

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: {
        input: {
          variantId,
          fileIds: [file2.id, file1.id, file2.id],
        },
      },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(0);
    expect(mediaFileIds(result.variant.media)).toEqual([file2.id, file1.id]);
  });

  test('variantUpdateMedia clears only the variant link and keeps product media registered', async ({ api }) => {
    const { productId, revision, variantId } = await createProduct(api, 'Clear Media Product');
    const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
    await registerProductMedia(api, productId, revision, [file.id]);

    await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: {
        input: {
          variantId,
          fileIds: [file.id],
        },
      },
    });

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: {
        input: {
          variantId,
          fileIds: [],
        },
      },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(0);
    expect(result.variant.media).toHaveLength(0);

    const { productMedia, variantMedia } = await productMediaByVariant(api, productId, variantId);
    expect(mediaFileIds(productMedia)).toEqual([file.id]);
    expect(variantMedia).toHaveLength(0);
  });

  test('variantUpdateMedia replaces existing variant media links', async ({ api }) => {
    const { productId, revision, variantId } = await createProduct(api, 'Replace Media Product');
    const file1 = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
    const file2 = await api.admin.file.uploadFromUrl(TEST_IMAGE_2);
    await registerProductMedia(api, productId, revision, [file1.id, file2.id]);

    await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: { input: { variantId, fileIds: [file1.id] } },
    });

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: { input: { variantId, fileIds: [file2.id] } },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(0);
    expect(mediaFileIds(result.variant.media)).toEqual([file2.id]);
  });

  test('variantUpdateMedia returns NOT_FOUND for a valid global ID that does not exist', async ({ api }) => {
    const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
    const missingVariantId = encodeGlobalId(
      TypeName.Variant,
      '00000000-0000-0000-0000-000000000000',
    );

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: {
        input: {
          variantId: missingVariantId,
          fileIds: [file.id],
        },
      },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(1);
    expect(result.userErrors[0].code).toBe('NOT_FOUND');
    expect(result.variant).toBeNull();
  });

  test('variantUpdateMedia rejects unregistered files atomically', async ({ api }) => {
    const { productId, revision, variantId } = await createProduct(api, 'Unregistered Media Product');
    const registeredFile = await api.admin.file.uploadFromUrl(TEST_IMAGE_1);
    const unregisteredFile = await api.admin.file.uploadFromUrl(TEST_IMAGE_2);
    await registerProductMedia(api, productId, revision, [registeredFile.id]);

    await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: { input: { variantId, fileIds: [registeredFile.id] } },
    });

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: { input: { variantId, fileIds: [unregisteredFile.id] } },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(1);
    expect(result.userErrors[0].code).toBe('PRODUCT_MEDIA_NOT_REGISTERED');
    expect(result.variant).toBeNull();

    const { variantMedia } = await productMediaByVariant(api, productId, variantId);
    expect(mediaFileIds(variantMedia)).toEqual([registeredFile.id]);
  });

  test('variantUpdateMedia rejects media registered on another product', async ({ api }) => {
    const productA = await createProduct(api, 'Product A Media');
    const productB = await createProduct(api, 'Product B Media');
    const file = await api.admin.file.uploadFromUrl(TEST_IMAGE_3);
    await registerProductMedia(api, productA.productId, productA.revision, [file.id]);

    const { data } = await api.admin.mutation('inventory-api/VariantSetMedia', {
      variables: {
        input: {
          variantId: productB.variantId,
          fileIds: [file.id],
        },
      },
    });

    const result = data.catalogMutation.variantUpdateMedia;
    expect(result.userErrors).toHaveLength(1);
    expect(result.userErrors[0].code).toBe('PRODUCT_MEDIA_NOT_REGISTERED');
    expect(result.variant).toBeNull();
  });
});
