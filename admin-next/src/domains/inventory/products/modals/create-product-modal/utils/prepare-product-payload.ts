import { slugify } from 'transliteration/dist/node/src/node/index.js';
import type { ApiProductCreateInput, ApiFile } from '@/graphql/types';

// ============================================
// Types
// ============================================

export interface IOptionValueInput {
  value: string;
  slug: string;
}

export interface IOptionInput {
  id: string;
  name: string;
  values: IOptionValueInput[];
}

export interface IGeneratedVariant {
  id: string;
  title: string;
  options: Array<{ name: string; value: string; slug: string }>;
  enabled: boolean;
}

export interface CreateProductInput {
  title: string;
  handle: string;
  description: string;
  media: ApiFile[];
  hasVariants: boolean;
  options: IOptionInput[];
  variants: IGeneratedVariant[];
}

// ============================================
// Payload Preparation
// ============================================

/**
 * Prepares description input for the API.
 * Returns undefined if description is empty.
 */
export function prepareDescription(description: string) {
  if (!description || description.trim() === '') {
    return undefined;
  }

  return {
    text: description,
    html: `<p>${description}</p>`,
    json: {},
  };
}

/**
 * Extracts media file IDs from uploaded files.
 * Returns undefined if no media files are provided.
 */
export function prepareMediaFileIds(media: ApiFile[]): string[] | undefined {
  if (!media || media.length === 0) {
    return undefined;
  }

  return media.map((m) => m.id);
}

/**
 * Filters and transforms options for the API.
 * Returns undefined if variants are disabled or no valid options exist.
 */
export function prepareOptions(
  hasVariants: boolean,
  options: IOptionInput[]
): ApiProductCreateInput['options'] {
  if (!hasVariants || !options || options.length === 0) {
    return undefined;
  }

  const validOptions = options.filter(
    (opt) => opt.name.trim() && opt.values.length > 0
  );

  if (validOptions.length === 0) {
    return undefined;
  }

  return validOptions.map((opt) => ({
    name: opt.name,
    slug: slugify(opt.name),
    values: opt.values.map((v) => ({
      name: v.value,
      slug: v.slug,
    })),
  }));
}

/**
 * Filters enabled variants and transforms them for the API.
 * Returns undefined if variants are disabled or no enabled variants exist.
 */
export function prepareVariants(
  hasVariants: boolean,
  variants: IGeneratedVariant[]
): ApiProductCreateInput['variants'] {
  if (!hasVariants || !variants || variants.length === 0) {
    return undefined;
  }

  const enabledVariants = variants.filter((v) => v.enabled);

  if (enabledVariants.length === 0) {
    return undefined;
  }

  return enabledVariants.map((v) => ({
    handle: v.id, // id is built from option value slugs (e.g., "red-s")
  }));
}

/**
 * Prepares the complete product creation payload for the API.
 *
 * This function transforms form data into the API-expected format:
 * - Formats description into text/html/json structure
 * - Extracts media file IDs from uploaded files
 * - Filters and transforms options (only when hasVariants is true)
 * - Filters enabled variants and extracts their handles
 *
 * @param input - Form data from the create product form
 * @returns API-ready payload for productCreate mutation
 *
 * @example
 * ```ts
 * const payload = prepareProductPayload({
 *   title: 'T-Shirt',
 *   handle: 't-shirt',
 *   description: 'A comfortable cotton t-shirt',
 *   media: [{ id: 'file-1', url: '...' }],
 *   hasVariants: true,
 *   options: [
 *     { id: '1', name: 'Color', values: [{ value: 'Red', slug: 'red' }] }
 *   ],
 *   variants: [
 *     { id: 'red', title: 'Red', options: [...], enabled: true }
 *   ],
 * });
 * ```
 */
export function prepareProductPayload(
  input: CreateProductInput
): ApiProductCreateInput {
  return {
    title: input.title,
    handle: input.handle,
    description: prepareDescription(input.description),
    mediaFileIds: prepareMediaFileIds(input.media),
    options: prepareOptions(input.hasVariants, input.options),
    variants: prepareVariants(input.hasVariants, input.variants),
  };
}
