import { slugify } from '@components/forms/slug/slugify';
import { ITagFormValues } from '@modules/tags/types';
import { ApiUpdateTagInput } from '@src/graphql';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditTagPayload = ({
  id,
  data,
  dirtyFields,
}: {
  id: ID;
  data: ITagFormValues;
  dirtyFields: FieldNamesMarkedBoolean<ITagFormValues>;
}): ApiUpdateTagInput => {
  const payload = { id } as ApiUpdateTagInput;

  if (dirtyFields.title) {
    payload.title = data.title;
    payload.slug = slugify(data.title);
  }

  if (dirtyFields.color) {
    payload.color = data.color.toHexString();
  }

  return payload;
};
