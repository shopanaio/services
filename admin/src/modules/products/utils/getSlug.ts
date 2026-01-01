import { slugify } from '@components/forms/slug/slugify';
import { IProductVariantOption } from '@src/entity/Product/Variant';

export const joinOptionsTitle = (options: any[]) => {
  return options.map((opt) => opt?.title).join(' ');
};

export const joinOptionsSlug = (options: any[]) => {
  return slugify(joinOptionsTitle(options));
};

export const getVariantSlug = (
  parentSlug: string,
  options: IProductVariantOption[],
) => {
  return `${parentSlug}_${joinOptionsSlug(options)}`;
};
