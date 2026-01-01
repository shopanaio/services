import { defaultFormValues } from '@modules/pages/defs';
import { IPageFormValues } from '@modules/pages/types';
import { getDescriptionFields } from '@src/entity/Content/description';
import { IPage } from '@src/entity/Page/Page';

export const getPageFormValues = (page: IPage): IPageFormValues => {
  return {
    title: page.title || defaultFormValues.title,
    description: getDescriptionFields(page.description),
    excerpt: page.excerpt || defaultFormValues.excerpt,
    cover: page.cover || defaultFormValues.cover,
    slug: page.slug,
    status: page.status,
    gallery: page.gallery || defaultFormValues.gallery,
    seoTitle: page.seoTitle || null,
    seoDescription: page.seoDescription || null,
  };
};
