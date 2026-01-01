import { useMutation } from '@apollo/client';
import { BulkDelete } from '@modules/shared/graphql/bulkDelete';

import { ApiBulkDeleteInput } from '@src/graphql';

export const useBulkDelete = ({
  refetchQueries = [],
  onCompleted,
  onError,
}: {
  refetchQueries?: string[];
  onCompleted?: () => void;
  onError?: () => void;
}) => {
  const [mutation, { loading, error }] = useMutation<
    { bulkMutation: { delete: boolean } },
    { input: ApiBulkDeleteInput }
  >(BulkDelete);

  const bulkDelete = async (input: ApiBulkDeleteInput) => {
    try {
      const response = await mutation({
        refetchQueries,
        variables: { input },
        onCompleted,
        onError,
      });

      return response.data?.bulkMutation?.delete;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return {
    bulkDelete,
    loading,
    error,
  };
};
