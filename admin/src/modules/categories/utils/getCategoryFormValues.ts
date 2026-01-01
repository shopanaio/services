import { defaultFormValues } from '@modules/categories/defs';
import { ICategoryFormValues } from '@modules/categories/types';
import { ICategory } from '@src/entity/Category/Category';
import { getDescriptionFields } from '@src/entity/Content/description';

export const getCategoryFormValues = (
  category: ICategory,
): ICategoryFormValues => {
  const { children, conditionsType, listingOrderBy, parents } =
    defaultFormValues;

  return {
    children: category.subcategories || children,
    conditionsType: conditionsType,
    description: getDescriptionFields(category.description),
    excerpt: category.excerpt,
    gallery: category.gallery || [],
    id: category.id || null,
    includeChildrenProducts: category.includeChildrenProducts || false,
    listingOrderBy: category.listingOrderBy || listingOrderBy,
    listingOrderByStatus: category.listingOrderByStatus || false,
    parents: category.parents || parents,
    slug: category.slug,
    status: category.status,
    title: category.title,
    seoTitle: category.seoTitle || null,
    seoDescription: category.seoDescription || null,
  };
};
