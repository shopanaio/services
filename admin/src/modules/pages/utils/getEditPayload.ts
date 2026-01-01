import { IPageFormValues } from '@modules/pages/types';
import { getApiRichTextJSON } from '@src/entity/Content/description';
import { ApiSeoFieldsInput, ApiUpdatePageInput } from '@src/graphql';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { mapEntryId } from '@src/utils/utils';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditPagePayload = ({
  id,
  data,
  dirtyFields,
}: {
  id: ID;
  data: IPageFormValues;
  dirtyFields: FieldNamesMarkedBoolean<IPageFormValues>;
}): ApiUpdatePageInput => {
  const payload = { id } as ApiUpdatePageInput;

  if (dirtyFields.title) {
    payload.title = data.title;
  }

  if (dirtyFields.seoTitle) {
    payload.seo = payload.seo || ({} as ApiSeoFieldsInput);
    payload.seo.title = data.seoTitle;
  }

  if (dirtyFields.seoDescription) {
    payload.seo = payload.seo || ({} as ApiSeoFieldsInput);
    payload.seo.description = data.seoDescription;
  }

  if (dirtyFields.description) {
    payload.description = getApiRichTextJSON(data.description);
  }

  if (dirtyFields.excerpt) {
    payload.excerpt = data.excerpt;
  }

  if (dirtyFields.slug) {
    payload.slug = data.slug;
  }

  if (dirtyFields.status) {
    payload.status = data.status;
  }

  if (dirtyFields.gallery) {
    payload.coverId = data.gallery[0]?.id || NIL_UUID;
    payload.gallery = data.gallery.map(mapEntryId);
  }

  return payload;
};
