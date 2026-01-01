import { useMutation } from '@apollo/client';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  DeleteApiKeyMutation,
  RevokeApiKeyMutation,
} from '@modules/apiKeys/graphql/update';
import { ApiMutation } from '@src/graphql';
import { CreateApiKeyMutation } from '@modules/apiKeys/graphql/create';
import { ApiCreateApiKeyInput } from '@src/graphql';

export const useCreateApiKey = () => {
  const [mutation, { loading, error }] =
    useMutation<ApiMutation>(CreateApiKeyMutation);

  const createApiKey = (input: ApiCreateApiKeyInput) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
    });
  };

  return {
    createApiKey,
    loading,
    error,
  };
};

export const useDeleteApiKey = () => {
  const [mutation, { loading, error }] =
    useMutation<ApiMutation>(DeleteApiKeyMutation);

  const deleteApiKey = (input: ID) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
    });
  };

  return { deleteApiKey, loading, error };
};

export const useRevokeApiKey = () => {
  const [mutation, { loading, error }] =
    useMutation<ApiMutation>(RevokeApiKeyMutation);

  const revokeApiKey = (input: ID) => {
    return mutation({
      refetchQueries: getRefetchQueries(),
      variables: { input },
    });
  };

  return { revokeApiKey, loading, error };
};
