import { useMutation } from '@apollo/client';
import { notify } from '@components/feedback/notification';
import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import {
  ApiUserMutationUpdatePasswordResponse,
  UpdatePasswordMutation,
} from '@modules/account/graphql/updatePassword';
import { ApiUserMutationUpdatePasswordArgs } from '@src/graphql';
import { t } from '@src/lang/messages';
import { Button, Input, Modal, Space } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md';
import { FormattedMessage, useIntl } from 'react-intl';

export const PasswordForm = () => {
  const { formatMessage } = useIntl();

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [open, setOpen] = useState(false);

  const { control, handleSubmit, formState } = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const [updatePassword, { loading }] = useMutation<
    ApiUserMutationUpdatePasswordResponse,
    ApiUserMutationUpdatePasswordArgs
  >(UpdatePasswordMutation);

  return (
    <>
      <Button
        data-testid="update-password-button"
        onClick={() => setOpen(true)}
      >
        <FormattedMessage id={t('account::button.changePassword')} />
      </Button>
      <Modal
        open={open}
        title={formatMessage({ id: t('account::modal.updatePassword.title') })}
        onCancel={() => setOpen(false)}
        transitionName="ant-fade"
        maskTransitionName="ant-fade"
        cancelButtonProps={{
          disabled: loading,
          'data-testid': 'update-password-cancel-button',
        }}
        okButtonProps={{
          loading,
          disabled: loading || !formState.isDirty,
          'data-testid': 'update-password-submit-button',
        }}
        onOk={handleSubmit(({ password }) => {
          updatePassword({
            onError: () => {
              notify.error(formatMessage({ id: t('account::error.updatePasswordFailed') }));
            },
            onCompleted: () => {
              setOpen(false);
            },
            variables: { input: { password } },
          });
        })}
      >
        <Controller
          control={control}
          name="password"
          rules={{
            required: formatMessage({ id: t('auth.error.password.required') }),
            minLength: {
              value: 6,
              message: formatMessage({ id: t('auth.error.password.tooShort') }),
            },
          }}
          render={({ field, fieldState }) => (
            <Box py="10">
              <Label required htmlFor="password-field">
                <FormattedMessage id={t('auth::label.password')} />
              </Label>
              <Space.Compact
                size="large"
                css={css`
                  width: 100%;
                `}
              >
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  status={fieldState.invalid ? 'error' : ''}
                  type={passwordVisible ? 'text' : 'password'}
                  id="password-field"
                  data-testid="password-field"
                  placeholder={formatMessage({
                    id: t('auth::label.password'),
                  })}
                />
                <Button
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  danger={fieldState.invalid}
                  icon={
                    passwordVisible ? (
                      <MdOutlineVisibility />
                    ) : (
                      <MdOutlineVisibilityOff />
                    )
                  }
                />
              </Space.Compact>
              <Helper data-testid="password-field-error">
                {fieldState.error?.message}
              </Helper>
            </Box>
          )}
        />
      </Modal>
    </>
  );
};
