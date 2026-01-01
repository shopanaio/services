import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import {
  DeleteManyMenusMutation,
  DeleteMenuMutation,
} from '@modules/menus/graphql/delete';
import {
  ApiMenuMutationDeleteArgs,
  ApiMenuMutationDeleteManyArgs,
  ApiMutation,
} from '@src/graphql';

export const useMenuDelete = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiMenuMutationDeleteArgs
  >(DeleteMenuMutation);

  const deleteMenu = async (id: ID) => {
    const { data } = await mutation({
      variables: { id },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Menu deleted.'),
      onError: () => notify.error('Could not delete menu.'),
    });

    return Boolean(data?.menuMutation?.delete);
  };

  return { deleteMenu, loading, error };
};

export const useMenusDeleteMany = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiMutation,
    ApiMenuMutationDeleteManyArgs
  >(DeleteManyMenusMutation);

  const deleteManyMenus = async (ids: ID[]) => {
    const { data } = await mutation({
      variables: { ids },
      refetchQueries: getRefetchQueries(),
      onCompleted: () => notify.success('Menus deleted.'),
      onError: () => notify.error('Could not delete menus.'),
    });

    return data?.menuMutation?.deleteMany;
  };

  return { deleteManyMenus, loading, error };
};
