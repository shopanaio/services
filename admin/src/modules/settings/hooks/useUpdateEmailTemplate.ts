import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  ApiEmailTemplateMutationUpdateResponse,
  UpdateEmailTemplateMutation,
} from '@modules/settings/graphql/updateEmailTemplate';
import {
  ApiEmailTemplateMutationUpdateArgs,
  ApiUpdateEmailTemplateInput,
} from '@src/graphql';
import { IMutationHandlers } from '@src/types';

export const useUpdateEmailTemplate = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiEmailTemplateMutationUpdateResponse,
    ApiEmailTemplateMutationUpdateArgs
  >(UpdateEmailTemplateMutation);

  const updateEmailTemplate = (
    input: ApiUpdateEmailTemplateInput,
    options: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
      onError: (error) => {
        options.onError?.(error);
        notify.error('Error updating email template');
      },
    });
  };

  return {
    updateEmailTemplate,
    loading,
    error,
  };
};
