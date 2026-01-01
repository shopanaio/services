import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { MenuQueries } from '@modules/menus/graphql/menu';
import {
  ApiCreateLinkInput,
  ApiUpdateLinkInput,
  ApiMutation,
} from '@src/graphql';

export const useCreateLink = () => {
  const [mutation] = useMutation<ApiMutation>(MenuQueries.CreateLinkMutation);

  const createLink = (input: ApiCreateLinkInput) => {
    return mutation({
      variables: { input },
      refetchQueries: getRefetchQueries(),
    });
  };

  return {
    createLink,
  };
};

export const useUpdateLink = () => {
  const [mutation] = useMutation<ApiMutation>(MenuQueries.UpdateLinkMutation);

  const updateLink = (input: ApiUpdateLinkInput) => {
    return mutation({
      variables: {
        input,
      },
      refetchQueries: getRefetchQueries(),
      onError: (error) => {
        console.error(error);
        notify.error('Error updating link');
      },
    });
  };

  return {
    updateLink,
  };
};
