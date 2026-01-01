import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { SendTestEmailMutation } from '@modules/settings/graphql/updateEmailTemplate';
import { EmailTypeEnum } from '@src/graphql';
import { IMutationHandlers } from '@src/types';

type ApiSendTestEmailInput = {
  type: EmailTypeEnum;
  to: string;
};

export const useSendTestEmail = () => {
  const [mutation, { loading, error }] = useMutation(SendTestEmailMutation);

  const sendTestEmail = (
    input: ApiSendTestEmailInput,
    options?: IMutationHandlers,
  ) => {
    return mutation({
      variables: {
        input,
      },
      ...options,
      onError: (error) => {
        console.error(error);
        notify.error('Error sending test email');
      },
    });
  };

  return {
    sendTestEmail,
    loading,
    error,
  };
};
