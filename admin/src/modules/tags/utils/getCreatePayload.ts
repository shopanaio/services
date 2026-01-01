import { ITagFormValues } from '@modules/tags/types';

export const getCreateTagPayload = ({
  data,
}: {
  data: ITagFormValues & { slug: string };
}) => {
  return {
    title: data.title,
    slug: data.slug,
    color: data.color,
  };
};
