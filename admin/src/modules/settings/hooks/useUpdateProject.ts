import { useMutation } from '@apollo/client';
import { UpdateProjectMutation } from '@modules/settings/graphql/updateProject';
import {
  ApiMutation,
  ApiProjectMutationUpdateArgs,
  ApiUpdateProjectInput,
} from '@src/graphql';

export const useUpdateProject = () => {
  const [mutation, { loading: settingsLoading }] = useMutation<
    ApiMutation,
    ApiProjectMutationUpdateArgs
  >(UpdateProjectMutation);

  const updateProject = (input: ApiUpdateProjectInput) => {
    return mutation({
      variables: { input },
      refetchQueries: ['Project'],
    });
  };

  return {
    updateProject,
    loading: settingsLoading,
  };
};
