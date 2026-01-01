import { useMutation } from '@apollo/client';
import { ClearProject } from '@modules/shared/graphql/clear';

export const useClearProject = ({
  refetchQueries = [],
  onCompleted,
  onError,
}: {
  refetchQueries?: string[];
  onCompleted?: () => void;
  onError?: () => void;
}) => {
  const [mutation, { loading, error }] = useMutation(ClearProject);

  const clearProject = async () => {
    try {
      const response = await mutation({
        refetchQueries,
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
    clearProject,
    loading,
    error,
  };
};
