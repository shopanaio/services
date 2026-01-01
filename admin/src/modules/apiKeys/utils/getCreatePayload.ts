import { IApiKeyFormValues } from '@modules/apiKeys/types';

export const getCreateApiKeyPayload = ({
  data,
}: {
  data: IApiKeyFormValues & { slug: string };
}) => {
  return {
    title: data.title,
    slug: data.slug,
    color: data.color,
  };
};
