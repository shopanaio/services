import type { IGeneratedVariant, IOptionInput } from './utils/generate-variants';

/**
 * Local media item for the create modal (before upload)
 */
export interface ILocalMediaItem {
  id: string;
  file: File;
  url: string; // Object URL for preview
  name: string;
  size: number;
  isCover: boolean;
}

/**
 * Form values for creating a product (react-hook-form)
 */
export interface ICreateProductFormValues {
  // General
  title: string;
  handle: string;
  description: string;

  // Media
  media: ILocalMediaItem[];

  // Variants
  hasVariants: boolean;
  options: IOptionInput[];
  variants: IGeneratedVariant[];
}
