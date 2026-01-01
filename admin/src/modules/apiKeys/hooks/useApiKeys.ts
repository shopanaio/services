import { useQuery } from '@apollo/client';
import { ApiKeyQueryFindMany } from '@modules/apiKeys/graphql/findMany';
import { ApiKey } from '@src/entity/ApiKey/ApiKey';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiQuery } from '@src/graphql';
import { useMemo } from 'react';

export const useApiKeys = () => {
  const { data, loading } = useQuery<ApiQuery>(ApiKeyQueryFindMany, {
    fetchPolicy: 'no-cache',
  });

  const apiKeys = useMemo(() => {
    return sanitizeEntries(data?.projectQuery.apiKeys.map(ApiKey.create));
  }, [data, loading]);

  return {
    apiKeys,
    loading,
  };
};
