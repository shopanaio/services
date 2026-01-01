import { ICategoryFormValues } from '@modules/categories/types';
import { getApiRichTextJSON } from '@src/entity/Content/description';
import { ApiCreateCategoryInput } from '@src/graphql';
import { mapEntryId } from '@src/utils/utils';

export const getCreateCategoryPayload = ({
  data,
}: {
  data: Omit<ICategoryFormValues, 'id'>;
}): ApiCreateCategoryInput => {
  return {
    title: data.title,
    description: getApiRichTextJSON(data.description),
    excerpt: data.excerpt,
    slug: data.slug,
    status: data.status,
    listingOrderBy: data.listingOrderBy,
    listingOrderByStatus: data.listingOrderByStatus,
    includeChildrenProducts: data.includeChildrenProducts,
    ...(data.children.length
      ? { children: data.children.map(mapEntryId) }
      : {}),
    ...(data.parents?.[0] ? { parentId: data.parents[0].id } : {}),
  };
};
