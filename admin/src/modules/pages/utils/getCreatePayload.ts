import { IPageFormValues } from '@modules/pages/types';
import { getApiRichTextJSON } from '@src/entity/Content/description';

export const getCreatePagePayload = ({ data }: { data: IPageFormValues }) => {
  return {
    title: data.title,
    description: getApiRichTextJSON(data.description),
    excerpt: data.excerpt,
    slug: data.slug,
    status: data.status,
  };
};
