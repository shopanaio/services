import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Product Create API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should create a simple product without variants', async ({ api }) => {
    const input = {
      title: 'Test Product',
      handle: 'test-product',
    };

    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input },
    });

    const result = data.catalogMutation.productCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.product).toBeTruthy();

    const product = result.product;
    expect(product.id).toBeTruthy();
    expect(product.title).toBe(input.title);
    expect(product.handle).toBe(input.handle);
    expect(product.isPublished).toBe(false);

    // Should have default variant
    const variantEdges = product.variants?.edges ?? [];
    expect(variantEdges).toHaveLength(1);
    expect(variantEdges[0].node.isDefault).toBe(true);
  });

  test('should create a product with description', async ({ api }) => {
    const input = {
      title: 'Product With Description',
      handle: 'product-with-description',
      description: {
        html: '<p>This is a <strong>test</strong> product description</p>',
        text: 'This is a test product description',
        json: {
          blocks: [{ type: 'paragraph', data: { text: 'This is a test product description' } }],
        },
      },
    };

    const { data } = await api.admin.mutation('inventory-api/ProductCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.productCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.product).toBeTruthy();

    const product = result.product;
    expect(product.title).toBe(input.title);
    expect(product.handle).toBe(input.handle);
    expect(product.description.html).toBe(input.description.html);
    expect(product.description.text).toBe(input.description.text);
    expect(product.description.json).toEqual(input.description.json);
  });

  test('should create a product with options and variants', async ({ api }) => {
    const input = {
      title: 'T-Shirt with Options',
      handle: 't-shirt-with-options',
      options: [
        {
          name: 'Color',
          slug: 'color',
          displayType: 'SWATCH',
          values: [
            { name: 'Red', slug: 'red' },
            { name: 'Blue', slug: 'blue' },
          ],
        },
        {
          name: 'Size',
          slug: 'size',
          displayType: 'DROPDOWN',
          values: [
            { name: 'Small', slug: 's' },
            { name: 'Medium', slug: 'm' },
            { name: 'Large', slug: 'l' },
          ],
        },
      ],
      variants: [
        { handle: 'red-s' },
        { handle: 'red-m' },
        { handle: 'red-l' },
        { handle: 'blue-s' },
        { handle: 'blue-m' },
        { handle: 'blue-l' },
      ],
    };

    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input },
    });

    const result = data.catalogMutation.productCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.product).toBeTruthy();

    const product = result.product;
    expect(product.title).toBe(input.title);
    expect(product.handle).toBe(input.handle);

    // Verify options
    expect(product.options).toHaveLength(2);

    const colorOption = product.options.find((o: { slug: string }) => o.slug === 'color');
    expect(colorOption).toBeTruthy();
    expect(colorOption.name).toBe('Color');
    expect(colorOption.displayType).toBe('SWATCH');
    expect(colorOption.values).toHaveLength(2);
    expect(colorOption.values.map((v: { slug: string }) => v.slug)).toEqual(['red', 'blue']);

    const sizeOption = product.options.find((o: { slug: string }) => o.slug === 'size');
    expect(sizeOption).toBeTruthy();
    expect(sizeOption.name).toBe('Size');
    expect(sizeOption.displayType).toBe('DROPDOWN');
    expect(sizeOption.values).toHaveLength(3);
    expect(sizeOption.values.map((v: { slug: string }) => v.slug)).toEqual(['s', 'm', 'l']);

    // Verify variants
    const variantEdges = product.variants?.edges ?? [];
    expect(variantEdges).toHaveLength(6);

    const variantHandles = variantEdges.map((e: { node: { handle: string } }) => e.node.handle);
    expect(variantHandles).toContain('red-s');
    expect(variantHandles).toContain('red-m');
    expect(variantHandles).toContain('red-l');
    expect(variantHandles).toContain('blue-s');
    expect(variantHandles).toContain('blue-m');
    expect(variantHandles).toContain('blue-l');

    // First variant should be marked as default
    const defaultVariants = variantEdges.filter(
      (e: { node: { isDefault: boolean } }) => e.node.isDefault,
    );
    expect(defaultVariants).toHaveLength(1);
    expect(defaultVariants[0].node.handle).toBe('red-s');
  });

  test('should create a product with single option', async ({ api }) => {
    const input = {
      title: 'Product with Single Option',
      handle: 'product-single-option',
      options: [
        {
          name: 'Material',
          slug: 'material',
          values: [
            { name: 'Cotton', slug: 'cotton' },
            { name: 'Polyester', slug: 'polyester' },
          ],
        },
      ],
      variants: [{ handle: 'cotton' }, { handle: 'polyester' }],
    };

    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input },
    });

    const result = data.catalogMutation.productCreate;

    expect(result.userErrors).toHaveLength(0);

    const product = result.product;
    expect(product.title).toBe(input.title);
    expect(product.options).toHaveLength(1);
    expect(product.options[0].name).toBe('Material');
    expect(product.options[0].values).toHaveLength(2);

    const variantEdges = product.variants?.edges ?? [];
    expect(variantEdges).toHaveLength(2);
  });

  test('should create product with full data', async ({ api }) => {
    const input = {
      title: 'Complete Product',
      handle: 'complete-product',
      description: {
        html: '<p>Full featured product</p>',
        text: 'Full featured product',
        json: { blocks: [] },
      },
      options: [
        {
          name: 'Color',
          slug: 'color',
          displayType: 'SWATCH',
          values: [
            { name: 'Black', slug: 'black' },
            { name: 'White', slug: 'white' },
          ],
        },
      ],
      variants: [{ handle: 'black' }, { handle: 'white' }],
    };

    const { data } = await api.admin.mutation('inventory-api/ProductCreate', {
      variables: { input },
    });

    const result = data.catalogMutation.productCreate;

    expect(result.userErrors).toHaveLength(0);

    const product = result.product;

    // Verify all fields match input
    expect(product.title).toBe(input.title);
    expect(product.handle).toBe(input.handle);
    expect(product.description.html).toBe(input.description.html);
    expect(product.description.text).toBe(input.description.text);
    expect(product.options).toHaveLength(1);
    expect(product.options[0].name).toBe(input.options[0].name);
    expect(product.options[0].slug).toBe(input.options[0].slug);

    const variantEdges = product.variants?.edges ?? [];
    expect(variantEdges).toHaveLength(2);
  });
});
