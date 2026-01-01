import { IApiKeyFormValues } from '@modules/apiKeys/types';
import { IApiKey } from '@src/entity/ApiKey/ApiKey';
import { ApiKeyColor } from '@src/graphql';

export const getApiKeyFormValues = (apiKey: IApiKey): IApiKeyFormValues => {
  return {
    title: apiKey.title,
    color: (apiKey.color as ApiKeyColor.Default) || ApiKeyColor.Default,
  };
};
