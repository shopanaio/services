import { Label } from '@components/forms/Label';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useUpdateEmailProfile } from '@modules/settings/hooks/useUpdateEmailProfile';

import { IEmailProfile } from '@src/entity/Email/Email';
import { ApiUpdateEmailProfilesInput } from '@src/graphql';
import { Input, Modal } from 'antd';
import { useEffect } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

interface IProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: IEmailProfile | null;
}

export const EmailProfileModal = ({
  onClose,
  open,
  profile,
}: IProfileModalProps) => {
  const { formatMessage } = useIntl();
  const methods = useForm({
    defaultValues: {
      host: '',
      port: 0,
      username: '',
      password: '',
    },
  });

  const { reset, handleSubmit, formState, control } = methods;
  const { isDirty, errors, dirtyFields } = formState;

  const { updateEmailProfile } = useUpdateEmailProfile();

  useEffect(() => {
    reset({
      host: profile?.host || '',
      port: profile?.port || 0,
      username: profile?.username || '',
      password: '',
    });
  }, [profile, reset]);

  const onOk = handleSubmit(async (data: any) => {
    const payload = {} as ApiUpdateEmailProfilesInput;

    if (dirtyFields.host) {
      payload.host = data.host;
    }

    if (dirtyFields.port) {
      payload.port = data.port;
    }

    if (dirtyFields.password) {
      payload.password = data.password;
    }

    if (dirtyFields.username) {
      payload.username = data.username;
    }

    await updateEmailProfile(payload, {
      refetchQueries: getRefetchQueries(),
      onCompleted: () => {
        reset({ ...data, password: '' });
      },
    });

    onClose();
  });

  return (
    <FormProvider {...methods}>
      <Modal
        open={open}
        width={1000}
        title={formatMessage({ id: t('settings.emails.smtpSettings') })}
        onOk={onOk}
        onCancel={onClose}
        cancelButtonProps={{
          'data-testid': 'modal-cancel-button',
        }}
        okButtonProps={{
          disabled: !isDirty,
          'data-testid': 'modal-submit-button',
        }}
        okText={formatMessage({ id: t('common.save') })}
      >
        <div css={s.container}>
          <ValidationAlert errors={errors} />

          <Flex gap="4">
            <Controller
              name="host"
              control={control}
              render={({ field, fieldState }) => {
                return (
                  <Flex direction="column" grow="1">
                    <Label required>
                      {formatMessage({ id: t('settings.emails.smtpHost') })}
                    </Label>
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      status={fieldState.invalid ? 'error' : undefined}
                    />
                  </Flex>
                );
              }}
            />

            <Controller
              name="port"
              control={control}
              render={({ field, fieldState }) => {
                return (
                  <Flex direction="column">
                    <Label required htmlFor="country-field">
                      {formatMessage({ id: t('settings.emails.port') })}
                    </Label>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={field.onChange}
                      status={fieldState.invalid ? 'error' : undefined}
                      css={css`
                        width: 100px;
                      `}
                    />
                  </Flex>
                );
              }}
            />
          </Flex>
          <Flex gap="4" mt="4">
            <Controller
              name="username"
              control={control}
              render={({ field, fieldState }) => {
                return (
                  <Flex direction="column" grow="1">
                    <Label required>
                      {formatMessage({ id: t('settings.emails.username') })}
                    </Label>
                    <Input
                      value={field.value}
                      onChange={field.onChange}
                      status={fieldState.invalid ? 'error' : undefined}
                    />
                  </Flex>
                );
              }}
            />

            <Controller
              name="password"
              control={control}
              render={({ field, fieldState }) => {
                return (
                  <Flex direction="column" grow="1">
                    <Label required>
                      {formatMessage({ id: t('settings.emails.password') })}
                    </Label>
                    <Input.Password
                      value={field.value}
                      onChange={field.onChange}
                      status={fieldState.invalid ? 'error' : undefined}
                    />
                  </Flex>
                );
              }}
            />
          </Flex>
        </div>
      </Modal>
    </FormProvider>
  );
};
