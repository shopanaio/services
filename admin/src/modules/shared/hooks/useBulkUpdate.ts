import { useMutation } from '@apollo/client';
import { BulkUpdate } from '@modules/shared/graphql/bulkUpdate';

import { ApiBulkUpdateInput } from '@src/graphql';

export const useBulkUpdate = ({
  refetchQueries = [],
  onCompleted,
  onError,
}: {
  refetchQueries?: string[];
  onCompleted?: () => void;
  onError?: () => void;
}) => {
  const [mutation, { loading, error }] = useMutation<
    { bulkMutation: { update: boolean } },
    { input: ApiBulkUpdateInput }
  >(BulkUpdate);

  const bulkUpdate = async (input: ApiBulkUpdateInput) => {
    try {
      const response = await mutation({
        refetchQueries,
        variables: { input },
        onCompleted,
        onError,
      });

      return response.data?.bulkMutation?.update;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return {
    bulkUpdate,
    loading,
    error,
  };
};
