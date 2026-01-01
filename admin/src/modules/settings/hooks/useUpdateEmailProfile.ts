import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  ApiEmailProfilesMutationUpdateResponse,
  UpdateEmailProfilesMutation,
} from '@modules/settings/graphql/updateEmailSettings';
import {
  ApiEmailProfilesMutationUpdateArgs,
  ApiUpdateEmailProfilesInput,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useUpdateEmailProfile = () => {
  const [mutation, { loading }] = useMutation<
    ApiEmailProfilesMutationUpdateResponse,
    ApiEmailProfilesMutationUpdateArgs
  >(UpdateEmailProfilesMutation);

  const updateEmailProfile = (
    input: ApiUpdateEmailProfilesInput,
    { onCompleted, onError, refetchQueries }: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      refetchQueries,
      onCompleted: (data) => {
        onCompleted?.(data);
      },
      onError: (e) => {
        onError?.(e);
        notify.error('Error updating smtp profile');
      },
    });
  };

  return {
    updateEmailProfile,
    loading,
  };
};
