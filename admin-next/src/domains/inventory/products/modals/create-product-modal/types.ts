import type { ApiFile } from '@/graphql/types';
import type { IGeneratedVariant, IOptionInput } from './utils/generate-variants';

/**
 * Form values for creating a product (react-hook-form)
 */
export interface ICreateProductFormValues {
  // General
  title: string;
  handle: string;
  description: string;

  // Media (already uploaded to server)
  media: ApiFile[];

  // Variants
  hasVariants: boolean;
  options: IOptionInput[];
  variants: IGeneratedVariant[];
}
