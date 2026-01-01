import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { $projects } from '@modules/projects/store/projects';
import { routes } from '@modules/router/routes';
import { DeleteProject } from '@modules/shared/graphql/clear';

export const useDeleteProject = () => {
  const [mutation, { loading, error }] = useMutation(DeleteProject);

  const deleteProject = async (id: ID) => {
    try {
      const response = await mutation({
        variables: { id },
        onCompleted: () => {
          $projects.removeProject(id);
          window.location.assign(routes.stores.url);
        },
        onError: (error) => {
          notify.error('Failed to delete project');
          console.error('Failed to delete project', error);
        },
      });

      return response.data?.bulkMutation?.update;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  return {
    deleteProject,
    loading,
    error,
  };
};
