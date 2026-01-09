import { z } from 'zod';

/**
 * Schema for option value input
 */
const optionValueInputSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  slug: z.string().min(1, 'Slug is required'),
});

/**
 * Schema for option input
 */
const optionInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Option name is required'),
  values: z.array(optionValueInputSchema).min(1, 'At least one value is required'),
});

/**
 * Schema for option value in generated variant
 */
const optionValueSchema = z.object({
  name: z.string(),
  value: z.string(),
  slug: z.string(),
});

/**
 * Schema for generated variant
 */
const generatedVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  options: z.array(optionValueSchema),
  enabled: z.boolean(),
});

/**
 * Schema for local media item (before upload)
 */
const localMediaItemSchema = z.object({
  id: z.string(),
  file: z.instanceof(File),
  url: z.string(),
  name: z.string(),
  size: z.number(),
  isCover: z.boolean(),
});

/**
 * Schema for product handle (URL slug)
 */
const handleSchema = z
  .string()
  .min(1, 'Handle is required')
  .max(255, 'Handle must be 255 characters or less')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Handle must contain only lowercase letters, numbers, and hyphens'
  );

/**
 * Main schema for creating a product
 */
export const createProductSchema = z
  .object({
    // General
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be 255 characters or less'),
    handle: handleSchema,
    description: z.string().max(5000, 'Description must be 5000 characters or less'),

    // Media
    media: z.array(localMediaItemSchema),

    // Variants
    hasVariants: z.boolean(),
    options: z.array(optionInputSchema),
    variants: z.array(generatedVariantSchema),
  })
  .refine(
    (data) => {
      // If hasVariants is true, at least one option must be defined
      if (data.hasVariants && data.options.length === 0) {
        return false;
      }
      return true;
    },
    {
      message: 'At least one option is required when variants are enabled',
      path: ['options'],
    }
  )
  .refine(
    (data) => {
      // If hasVariants is true, at least one variant must be enabled
      if (data.hasVariants && !data.variants.some((v) => v.enabled)) {
        return false;
      }
      return true;
    },
    {
      message: 'At least one variant must be enabled',
      path: ['variants'],
    }
  );

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
