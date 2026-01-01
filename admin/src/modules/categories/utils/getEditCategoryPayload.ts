import { ICategoryFormValues } from '@modules/categories/types';
import { getApiRichTextJSON } from '@src/entity/Content/description';
import { ApiSeoFieldsInput, ApiUpdateCategoryInput } from '@src/graphql';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { mapEntryId } from '@src/utils/utils';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditCategoryPayload = ({
  id,
  data,
  dirtyFields,
}: {
  id: ID;
  data: ICategoryFormValues;
  dirtyFields: FieldNamesMarkedBoolean<ICategoryFormValues>;
}): ApiUpdateCategoryInput => {
  const payload = { id } as ApiUpdateCategoryInput;

  if (dirtyFields.title) {
    payload.title = data.title;
  }

  if (dirtyFields.description) {
    payload.description = getApiRichTextJSON(data.description);
  }

  if (dirtyFields.excerpt) {
    payload.excerpt = data.excerpt;
  }

  if (dirtyFields.seoTitle) {
    payload.seo = payload.seo || ({} as ApiSeoFieldsInput);
    payload.seo.title = data.seoTitle;
  }

  if (dirtyFields.seoDescription) {
    payload.seo = payload.seo || ({} as ApiSeoFieldsInput);
    payload.seo.description = data.seoDescription;
  }

  if (dirtyFields.includeChildrenProducts) {
    payload.includeChildrenProducts = data.includeChildrenProducts;
  }

  if (dirtyFields.slug) {
    payload.slug = data.slug;
  }

  if (dirtyFields.status) {
    payload.status = data.status;
  }

  if (dirtyFields.parents) {
    payload.parentId = data.parents?.[0]?.id || NIL_UUID;
  }

  if (dirtyFields.children) {
    payload.children = data.children.map(mapEntryId);
  }

  if (dirtyFields.listingOrderBy) {
    payload.listingOrderBy = data.listingOrderBy;
  }

  if (dirtyFields.listingOrderByStatus) {
    payload.listingOrderByStatus = data.listingOrderByStatus;
  }

  if (dirtyFields.gallery) {
    payload.gallery = data.gallery.map(mapEntryId);
  }

  return payload;
};
