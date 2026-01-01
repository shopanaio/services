import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  UpdateEmailSettingsMutation,
  ApiEmailSettingsMutationUpdateResponse,
} from '@modules/settings/graphql/updateEmailSettings';
import {
  ApiEmailSettingsMutationUpdateArgs,
  ApiUpdateEmailSettingsInput,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useUpdateEmailSettings = () => {
  const [settingsMutation, { loading: settingsLoading }] = useMutation<
    ApiEmailSettingsMutationUpdateResponse,
    ApiEmailSettingsMutationUpdateArgs
  >(UpdateEmailSettingsMutation);

  const updateEmailSettings = (
    input: ApiUpdateEmailSettingsInput,
    { onCompleted, onError, refetchQueries }: IMutationHandlers,
  ) => {
    return settingsMutation({
      variables: {
        input,
      },
      refetchQueries,
      onCompleted: (data) => {
        onCompleted?.(data);
      },
      onError: (e) => {
        onError?.(e);
        notify.error('Error updating settings');
      },
    });
  };

  return {
    updateEmailSettings,
    loading: settingsLoading,
  };
};
