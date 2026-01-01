import { Label } from '@components/forms/Label';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useUpdateEmailSettings } from '@modules/settings/hooks/useUpdateEmailSetings';

import { IEmailSettings } from '@src/entity/Email/Email';
import { ApiUpdateEmailSettingsInput } from '@src/graphql';
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

interface ISettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: IEmailSettings | null;
}

export const EmailSettingsModal = ({
  onClose,
  open,
  settings,
}: ISettingsModalProps) => {
  const { formatMessage } = useIntl();
  const methods = useForm({
    defaultValues: {
      from: '',
      replyTo: '',
    },
  });

  const { reset, handleSubmit, formState, control } = methods;
  const { isDirty, errors, dirtyFields } = formState;

  const { updateEmailSettings } = useUpdateEmailSettings();

  useEffect(() => {
    reset({
      replyTo: settings?.replyTo || '',
      from: settings?.from || '',
    });
  }, [settings, reset]);

  const onOk = handleSubmit(async (data: any) => {
    const payload = {} as ApiUpdateEmailSettingsInput;

    if (dirtyFields.from) {
      payload.from = data.from;
    }

    if (dirtyFields.replyTo) {
      payload.replyTo = data.replyTo;
    }

    await updateEmailSettings(payload, {
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
        title={formatMessage({ id: t('settings.emails.settingsModal.title') })}
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

          <Controller
            name="from"
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Flex direction="column" grow="1">
                  <Label required>
                    {formatMessage({ id: t('settings.emails.from') })}
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
            name="replyTo"
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Flex direction="column" grow="1" mt="4">
                  <Label>
                    {formatMessage({ id: t('settings.emails.reply') })}
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
        </div>
      </Modal>
    </FormProvider>
  );
};
