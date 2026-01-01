import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import {
  ApiUserMutationUpdateEmailResponse,
  UpdateEmailMutation,
} from '@modules/account/graphql/updateEmail';
import { ApiUserMutationUpdateEmailArgs } from '@src/graphql';
import { t } from '@src/lang/messages';
import { Button, Input, Modal } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AiOutlineUser } from 'react-icons/ai';
import { FormattedMessage, useIntl } from 'react-intl';

export const EmailForm = ({ isReadOnly }: { isReadOnly?: boolean }) => {
  const { formatMessage } = useIntl();

  const [open, setOpen] = useState(false);
  const { control, handleSubmit, formState } = useForm({
    defaultValues: {
      email: '',
    },
  });

  const [updateEmail, { loading }] = useMutation<
    ApiUserMutationUpdateEmailResponse,
    ApiUserMutationUpdateEmailArgs
  >(UpdateEmailMutation, { refetchQueries: ['Me'] });

  return (
    <>
      {!isReadOnly && (
        <Button onClick={() => setOpen(true)} data-testid="update-email-button">
          <FormattedMessage id={t('account::button.updateEmail')} />
        </Button>
      )}
      <Modal
        open={open}
        title={formatMessage({ id: t('account::modal.updateEmail.title') })}
        onCancel={() => setOpen(false)}
        cancelButtonProps={{
          disabled: loading,
          'data-testid': 'update-email-cancel-button',
        }}
        okButtonProps={{
          loading,
          disabled: loading || !formState.isDirty,
          'data-testid': 'update-email-submit-button',
        }}
        onOk={handleSubmit(({ email }) => {
          updateEmail({
            onError: () => {
              notify.error(formatMessage({ id: t('account::error.updateEmailFailed') }));
            },
            onCompleted: () => {
              setOpen(false);
            },
            variables: { input: { email } },
          });
        })}
      >
        <Controller
          control={control}
          name="email"
          rules={{
            required: formatMessage({ id: t('auth.error.email.required') }),
            pattern: {
              value: /.+@.+\..+/,
              message: formatMessage({ id: t('auth.error.email.invalid') }),
            },
          }}
          render={({ field, fieldState }) => (
            <Box py="10">
              <Label required htmlFor="email-field">
                <FormattedMessage id={t('auth::label.email')} />
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                data-testid="email-field"
                prefix={<AiOutlineUser />}
                status={fieldState.invalid ? 'error' : ''}
                size="large"
                type="text"
                id="email-field"
                placeholder={formatMessage({ id: t('auth::label.email') })}
              />
              <Helper data-testid="email-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
      </Modal>
    </>
  );
};
