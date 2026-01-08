import type { IGeneratedVariant, IOptionInput } from './utils/generateVariants';

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
 * Form state for creating a product
 */
export interface ICreateProductFormState {
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

/**
 * Props for section components
 */
export interface ISectionProps {
  formState: ICreateProductFormState;
  updateFormState: <K extends keyof ICreateProductFormState>(
    key: K,
    value: ICreateProductFormState[K]
  ) => void;
}
