import { useMutation } from '@apollo/client';
import { InstallAppMutation } from '@modules/apps/graphql/install';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { ApiAppsMutationInstallArgs } from '@src/graphql';

export const useInstallApp = () => {
  const [mutation, { loading, error }] = useMutation(InstallAppMutation);

  const install = (code: string) => {
    return mutation({
      variables: { code } as ApiAppsMutationInstallArgs,
      refetchQueries: getRefetchQueries(),
    });
  };

  return { install, loading, error };
};
