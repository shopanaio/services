import { useMutation } from '@apollo/client';
import { UninstallAppMutation } from '@modules/apps/graphql/uninstall';
import { getRefetchQueries } from '@modules/app/components/Apollo';

export const useUninstallApp = () => {
  const [mutation, { loading, error }] = useMutation(UninstallAppMutation);

  const uninstall = (code: string) => {
    return mutation({
      variables: { code },
      refetchQueries: getRefetchQueries(),
    });
  };

  return { uninstall, loading, error };
};
