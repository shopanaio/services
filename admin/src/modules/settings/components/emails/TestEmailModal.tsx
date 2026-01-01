/* eslint-disable jsx-a11y/no-autofocus */
import { css } from '@emotion/react';
import { Input, Modal, Tag, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { EmailTypeEnum } from '@src/graphql';
import { Flex } from '@components/utility/Flex';
import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Label } from '@components/forms/Label';
import { useSendTestEmail } from '@modules/settings/hooks/useSendTestEmail';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { emailTypeLabels } from '@src/defs/constants';
import { Box } from '@components/utility/Box';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const schema = yup.object().shape({
  to: yup
    .string()
    .email('Destination email is invalid')
    .required('Destination email is required'),
});

interface ITestEmailModalProps {
  open: boolean;
  onClose: () => void;
  type: EmailTypeEnum | null;
}

export const TestEmailModal = ({
  open,
  onClose,
  type,
}: ITestEmailModalProps) => {
  const { formatMessage } = useIntl();
  const methods = useForm({
    reValidateMode: 'onChange',
    resolver: yupResolver(schema),
    defaultValues: { to: '' },
  });

  const { sendTestEmail } = useSendTestEmail();
  const { control, handleSubmit, formState, reset } = methods;
  const { isDirty } = formState;

  const onOk = handleSubmit(async (data) => {
    if (!type) {
      return;
    }

    await sendTestEmail({ to: data.to, type }, { onCompleted: onClose });
  });

  return (
    <Modal
      open={open}
      width={1000}
      centered
      title={formatMessage({ id: t('settings.emailTemplates.sendTestTitle') })}
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'modal-cancel-button',
      }}
      okButtonProps={{
        disabled: !isDirty,
        'data-testid': 'modal-submit-button',
      }}
      okText={formatMessage({ id: t('auth::button.send') })}
    >
      <Flex direction="column" gap="4">
        <ValidationAlert errors={formState.errors} />
        <Box>
          <Controller
            name="to"
            control={control}
            render={({ field }) => {
              return (
                <Flex w="100%" direction="column">
                  <Label required>
                    {formatMessage({ id: t('settings.emailTemplates.destinationEmail') })}
                  </Label>
                  <Input
                    value={field.value}
                    onChange={field.onChange}
                    placeholder={formatMessage({ id: t('customers.information.email.placeholder') })}
                    data-testid="test-email-input"
                    status={formState.errors.to ? 'error' : undefined}
                  />
                </Flex>
              );
            }}
          />
          {type && (
            <Box mt="2">
              <Tag color="blue">{emailTypeLabels[type]}</Tag>
            </Box>
          )}
        </Box>
      </Flex>
    </Modal>
  );
};
