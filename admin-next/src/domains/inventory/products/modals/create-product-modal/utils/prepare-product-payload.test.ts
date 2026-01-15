import { describe, it, expect } from 'vitest';
import {
  prepareDescription,
  prepareMediaFileIds,
  prepareOptions,
  prepareVariants,
  prepareProductPayload,
  type CreateProductInput,
  type IOptionInput,
  type IGeneratedVariant,
} from './prepare-product-payload';
import type { ApiFile } from '@/graphql/types';

// ============================================
// Test Helpers
// ============================================

const createMockApiFile = (id: string): ApiFile =>
  ({
    id,
    url: `https://example.com/files/${id}`,
  }) as ApiFile;

const createMockOption = (
  id: string,
  name: string,
  values: Array<{ value: string; slug: string }>
): IOptionInput => ({
  id,
  name,
  values,
});

const createMockVariant = (
  id: string,
  title: string,
  options: Array<{ name: string; value: string; slug: string }>,
  enabled = true
): IGeneratedVariant => ({
  id,
  title,
  options,
  enabled,
});

// ============================================
// prepareDescription tests
// ============================================

describe('prepareDescription', () => {
  it('returns undefined for empty string', () => {
    expect(prepareDescription('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(prepareDescription('   ')).toBeUndefined();
    expect(prepareDescription('\n\t')).toBeUndefined();
  });

  it('formats description correctly', () => {
    const result = prepareDescription('Test description');

    expect(result).toEqual({
      text: 'Test description',
      html: '<p>Test description</p>',
      json: {},
    });
  });

  it('preserves whitespace in description text', () => {
    const result = prepareDescription('  Test with spaces  ');

    expect(result?.text).toBe('  Test with spaces  ');
    expect(result?.html).toBe('<p>  Test with spaces  </p>');
  });

  it('handles special characters', () => {
    const result = prepareDescription('Test <script>alert("xss")</script>');

    expect(result?.text).toBe('Test <script>alert("xss")</script>');
  });

  it('handles multiline description', () => {
    const result = prepareDescription('Line 1\nLine 2');

    expect(result?.text).toBe('Line 1\nLine 2');
  });
});

// ============================================
// prepareMediaFileIds tests
// ============================================

describe('prepareMediaFileIds', () => {
  it('returns undefined for empty array', () => {
    expect(prepareMediaFileIds([])).toBeUndefined();
  });

  it('returns undefined for null/undefined', () => {
    expect(prepareMediaFileIds(null as unknown as ApiFile[])).toBeUndefined();
    expect(prepareMediaFileIds(undefined as unknown as ApiFile[])).toBeUndefined();
  });

  it('extracts single file ID', () => {
    const files = [createMockApiFile('file-1')];

    expect(prepareMediaFileIds(files)).toEqual(['file-1']);
  });

  it('extracts multiple file IDs in order', () => {
    const files = [
      createMockApiFile('file-1'),
      createMockApiFile('file-2'),
      createMockApiFile('file-3'),
    ];

    expect(prepareMediaFileIds(files)).toEqual(['file-1', 'file-2', 'file-3']);
  });

  it('handles files with various ID formats', () => {
    const files = [
      createMockApiFile('uuid-123-456'),
      createMockApiFile('12345'),
      createMockApiFile('file_with_underscore'),
    ];

    expect(prepareMediaFileIds(files)).toEqual([
      'uuid-123-456',
      '12345',
      'file_with_underscore',
    ]);
  });
});

// ============================================
// prepareOptions tests
// ============================================

describe('prepareOptions', () => {
  it('returns undefined when hasVariants is false', () => {
    const options = [createMockOption('1', 'Color', [{ value: 'Red', slug: 'red' }])];

    expect(prepareOptions(false, options)).toBeUndefined();
  });

  it('returns undefined for empty options array', () => {
    expect(prepareOptions(true, [])).toBeUndefined();
  });

  it('returns undefined for null/undefined options', () => {
    expect(prepareOptions(true, null as unknown as IOptionInput[])).toBeUndefined();
    expect(prepareOptions(true, undefined as unknown as IOptionInput[])).toBeUndefined();
  });

  it('filters out options with empty name', () => {
    const options = [
      createMockOption('1', '', [{ value: 'Red', slug: 'red' }]),
      createMockOption('2', 'Size', [{ value: 'S', slug: 's' }]),
    ];

    const result = prepareOptions(true, options);

    expect(result).toHaveLength(1);
    expect(result?.[0].name).toBe('Size');
  });

  it('filters out options with whitespace-only name', () => {
    const options = [
      createMockOption('1', '   ', [{ value: 'Red', slug: 'red' }]),
      createMockOption('2', 'Size', [{ value: 'S', slug: 's' }]),
    ];

    const result = prepareOptions(true, options);

    expect(result).toHaveLength(1);
    expect(result?.[0].name).toBe('Size');
  });

  it('filters out options with empty values array', () => {
    const options = [
      createMockOption('1', 'Color', []),
      createMockOption('2', 'Size', [{ value: 'S', slug: 's' }]),
    ];

    const result = prepareOptions(true, options);

    expect(result).toHaveLength(1);
    expect(result?.[0].name).toBe('Size');
  });

  it('returns undefined when all options are invalid', () => {
    const options = [
      createMockOption('1', '', [{ value: 'Red', slug: 'red' }]),
      createMockOption('2', 'Size', []),
    ];

    expect(prepareOptions(true, options)).toBeUndefined();
  });

  it('transforms options correctly', () => {
    const options = [
      createMockOption('1', 'Color', [
        { value: 'Red', slug: 'red' },
        { value: 'Blue', slug: 'blue' },
      ]),
    ];

    const result = prepareOptions(true, options);

    expect(result).toEqual([
      {
        name: 'Color',
        slug: 'color',
        values: [
          { name: 'Red', slug: 'red' },
          { name: 'Blue', slug: 'blue' },
        ],
      },
    ]);
  });

  it('generates correct slugs for option names with spaces', () => {
    const options = [
      createMockOption('1', 'T-Shirt Size', [{ value: 'S', slug: 's' }]),
    ];

    const result = prepareOptions(true, options);

    expect(result?.[0].slug).toBe('t-shirt-size');
  });

  it('generates correct slugs for cyrillic option names', () => {
    const options = [
      createMockOption('1', 'Цвет', [{ value: 'Красный', slug: 'krasnyi' }]),
    ];

    const result = prepareOptions(true, options);

    expect(result?.[0].slug).toBe('cvet');
  });

  it('handles multiple options', () => {
    const options = [
      createMockOption('1', 'Color', [{ value: 'Red', slug: 'red' }]),
      createMockOption('2', 'Size', [{ value: 'S', slug: 's' }]),
    ];

    const result = prepareOptions(true, options);

    expect(result).toHaveLength(2);
    expect(result?.[0].name).toBe('Color');
    expect(result?.[1].name).toBe('Size');
  });
});

// ============================================
// prepareVariants tests
// ============================================

describe('prepareVariants', () => {
  it('returns undefined when hasVariants is false', () => {
    const variants = [createMockVariant('red-s', 'Red / S', [], true)];

    expect(prepareVariants(false, variants)).toBeUndefined();
  });

  it('returns undefined for empty variants array', () => {
    expect(prepareVariants(true, [])).toBeUndefined();
  });

  it('returns undefined for null/undefined variants', () => {
    expect(prepareVariants(true, null as unknown as IGeneratedVariant[])).toBeUndefined();
    expect(prepareVariants(true, undefined as unknown as IGeneratedVariant[])).toBeUndefined();
  });

  it('filters out disabled variants', () => {
    const variants = [
      createMockVariant('red-s', 'Red / S', [], true),
      createMockVariant('blue-s', 'Blue / S', [], false),
      createMockVariant('red-m', 'Red / M', [], true),
    ];

    const result = prepareVariants(true, variants);

    expect(result).toHaveLength(2);
    expect(result?.[0].handle).toBe('red-s');
    expect(result?.[1].handle).toBe('red-m');
  });

  it('returns undefined when all variants are disabled', () => {
    const variants = [
      createMockVariant('red-s', 'Red / S', [], false),
      createMockVariant('blue-s', 'Blue / S', [], false),
    ];

    expect(prepareVariants(true, variants)).toBeUndefined();
  });

  it('uses variant id as handle', () => {
    const variants = [
      createMockVariant('red-small-cotton', 'Red / Small / Cotton', [], true),
    ];

    const result = prepareVariants(true, variants);

    expect(result?.[0].handle).toBe('red-small-cotton');
  });

  it('transforms multiple enabled variants', () => {
    const variants = [
      createMockVariant('red-s', 'Red / S', [], true),
      createMockVariant('red-m', 'Red / M', [], true),
      createMockVariant('blue-s', 'Blue / S', [], true),
    ];

    const result = prepareVariants(true, variants);

    expect(result).toEqual([
      { handle: 'red-s' },
      { handle: 'red-m' },
      { handle: 'blue-s' },
    ]);
  });
});

// ============================================
// prepareProductPayload tests
// ============================================

describe('prepareProductPayload', () => {
  const createBaseInput = (overrides: Partial<CreateProductInput> = {}): CreateProductInput => ({
    title: 'Test Product',
    handle: 'test-product',
    description: '',
    media: [],
    hasVariants: false,
    options: [],
    variants: [],
    ...overrides,
  });

  describe('basic fields', () => {
    it('includes title and handle', () => {
      const input = createBaseInput({
        title: 'My Product',
        handle: 'my-product',
      });

      const result = prepareProductPayload(input);

      expect(result.title).toBe('My Product');
      expect(result.handle).toBe('my-product');
    });

    it('handles empty title', () => {
      const input = createBaseInput({ title: '' });

      const result = prepareProductPayload(input);

      expect(result.title).toBe('');
    });
  });

  describe('description handling', () => {
    it('includes formatted description when provided', () => {
      const input = createBaseInput({ description: 'Product description' });

      const result = prepareProductPayload(input);

      expect(result.description).toEqual({
        text: 'Product description',
        html: '<p>Product description</p>',
        json: {},
      });
    });

    it('excludes description when empty', () => {
      const input = createBaseInput({ description: '' });

      const result = prepareProductPayload(input);

      expect(result.description).toBeUndefined();
    });
  });

  describe('media handling', () => {
    it('includes media file IDs when provided', () => {
      const input = createBaseInput({
        media: [createMockApiFile('file-1'), createMockApiFile('file-2')],
      });

      const result = prepareProductPayload(input);

      expect(result.mediaFileIds).toEqual(['file-1', 'file-2']);
    });

    it('excludes mediaFileIds when no media', () => {
      const input = createBaseInput({ media: [] });

      const result = prepareProductPayload(input);

      expect(result.mediaFileIds).toBeUndefined();
    });
  });

  describe('simple product (no variants)', () => {
    it('excludes options and variants when hasVariants is false', () => {
      const input = createBaseInput({
        hasVariants: false,
        options: [createMockOption('1', 'Color', [{ value: 'Red', slug: 'red' }])],
        variants: [createMockVariant('red', 'Red', [], true)],
      });

      const result = prepareProductPayload(input);

      expect(result.options).toBeUndefined();
      expect(result.variants).toBeUndefined();
    });
  });

  describe('product with variants', () => {
    it('includes options and variants when hasVariants is true', () => {
      const input = createBaseInput({
        hasVariants: true,
        options: [
          createMockOption('1', 'Color', [
            { value: 'Red', slug: 'red' },
            { value: 'Blue', slug: 'blue' },
          ]),
          createMockOption('2', 'Size', [
            { value: 'S', slug: 's' },
            { value: 'M', slug: 'm' },
          ]),
        ],
        variants: [
          createMockVariant('red-s', 'Red / S', [], true),
          createMockVariant('red-m', 'Red / M', [], false),
          createMockVariant('blue-s', 'Blue / S', [], true),
          createMockVariant('blue-m', 'Blue / M', [], true),
        ],
      });

      const result = prepareProductPayload(input);

      expect(result.options).toHaveLength(2);
      expect(result.variants).toHaveLength(3);
      expect(result.variants).toEqual([
        { handle: 'red-s' },
        { handle: 'blue-s' },
        { handle: 'blue-m' },
      ]);
    });

    it('filters invalid options', () => {
      const input = createBaseInput({
        hasVariants: true,
        options: [
          createMockOption('1', '', [{ value: 'Red', slug: 'red' }]),
          createMockOption('2', 'Size', [{ value: 'S', slug: 's' }]),
        ],
        variants: [createMockVariant('s', 'S', [], true)],
      });

      const result = prepareProductPayload(input);

      expect(result.options).toHaveLength(1);
      expect(result.options?.[0].name).toBe('Size');
    });
  });

  describe('edge cases', () => {
    it('handles complete product with all fields', () => {
      const input: CreateProductInput = {
        title: 'Premium T-Shirt',
        handle: 'premium-t-shirt',
        description: 'A high-quality cotton t-shirt',
        media: [createMockApiFile('img-1'), createMockApiFile('img-2')],
        hasVariants: true,
        options: [
          createMockOption('opt-1', 'Color', [
            { value: 'White', slug: 'white' },
            { value: 'Black', slug: 'black' },
          ]),
          createMockOption('opt-2', 'Size', [
            { value: 'Small', slug: 'small' },
            { value: 'Medium', slug: 'medium' },
            { value: 'Large', slug: 'large' },
          ]),
        ],
        variants: [
          createMockVariant('white-small', 'White / Small', [], true),
          createMockVariant('white-medium', 'White / Medium', [], true),
          createMockVariant('white-large', 'White / Large', [], false),
          createMockVariant('black-small', 'Black / Small', [], true),
          createMockVariant('black-medium', 'Black / Medium', [], true),
          createMockVariant('black-large', 'Black / Large', [], true),
        ],
      };

      const result = prepareProductPayload(input);

      expect(result).toEqual({
        title: 'Premium T-Shirt',
        handle: 'premium-t-shirt',
        description: {
          text: 'A high-quality cotton t-shirt',
          html: '<p>A high-quality cotton t-shirt</p>',
          json: {},
        },
        mediaFileIds: ['img-1', 'img-2'],
        options: [
          {
            name: 'Color',
            slug: 'color',
            values: [
              { name: 'White', slug: 'white' },
              { name: 'Black', slug: 'black' },
            ],
          },
          {
            name: 'Size',
            slug: 'size',
            values: [
              { name: 'Small', slug: 'small' },
              { name: 'Medium', slug: 'medium' },
              { name: 'Large', slug: 'large' },
            ],
          },
        ],
        variants: [
          { handle: 'white-small' },
          { handle: 'white-medium' },
          { handle: 'black-small' },
          { handle: 'black-medium' },
          { handle: 'black-large' },
        ],
      });
    });

    it('handles minimal product (only required fields)', () => {
      const input = createBaseInput({
        title: 'Simple Product',
        handle: 'simple-product',
      });

      const result = prepareProductPayload(input);

      expect(result).toEqual({
        title: 'Simple Product',
        handle: 'simple-product',
        description: undefined,
        mediaFileIds: undefined,
        options: undefined,
        variants: undefined,
      });
    });

    it('handles product with hasVariants true but empty options/variants', () => {
      const input = createBaseInput({
        hasVariants: true,
        options: [],
        variants: [],
      });

      const result = prepareProductPayload(input);

      expect(result.options).toBeUndefined();
      expect(result.variants).toBeUndefined();
    });

    it('handles product with hasVariants true but all variants disabled', () => {
      const input = createBaseInput({
        hasVariants: true,
        options: [createMockOption('1', 'Color', [{ value: 'Red', slug: 'red' }])],
        variants: [
          createMockVariant('red', 'Red', [], false),
        ],
      });

      const result = prepareProductPayload(input);

      expect(result.options).toBeDefined();
      expect(result.variants).toBeUndefined();
    });

    it('handles unicode in title and description', () => {
      const input = createBaseInput({
        title: 'Футболка "Премиум"',
        handle: 'futbolka-premium',
        description: 'Описание на русском языке 🎉',
      });

      const result = prepareProductPayload(input);

      expect(result.title).toBe('Футболка "Премиум"');
      expect(result.description?.text).toBe('Описание на русском языке 🎉');
    });
  });
});
