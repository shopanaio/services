import { useMutation } from '@apollo/client';
import { BulkDelete } from '@modules/shared/graphql/bulkDelete';

import { ApiBulkDeleteInput, EntityType } from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    { bulkMutation: { delete: boolean } },
    { input: ApiBulkDeleteInput }
  >(BulkDelete);

  const deleteEntry = async (
    id: ID,
    entity: EntityType,
    options?: IMutationHandlers,
  ) => {
    try {
      const response = await mutation({
        ...options,
        variables: {
          input: {
            entity,
            ids: [id],
          },
        },
      });

      return response.data?.bulkMutation?.delete;
    } catch (e) {
      return false;
    }
  };

  return {
    deleteEntry,
    loading,
    error,
  };
};
