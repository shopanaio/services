import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import {
  ApiEmailTemplateMutationCreateResponse,
  CreateEmailTemplateMutation,
} from '@modules/settings/graphql/createEmailTemplate';
import {
  ApiEmailTemplateMutationCreateArgs,
  ApiCreateEmailTemplateInput,
} from '@src/graphql';

export const useCreateEmailTemplate = () => {
  const [mutation, { loading, error }] = useMutation<
    ApiEmailTemplateMutationCreateResponse,
    ApiEmailTemplateMutationCreateArgs
  >(CreateEmailTemplateMutation);

  const createEmailTemplate = (input: ApiCreateEmailTemplateInput) => {
    return mutation({
      variables: {
        input,
      },
      onError: (error) => {
        console.error(error);
        notify.error('Error creating email template');
      },
    });
  };

  return {
    createEmailTemplate,
    loading,
    error,
  };
};
