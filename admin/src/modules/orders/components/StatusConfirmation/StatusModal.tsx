import { css } from '@emotion/react';
import { Input, Modal, Typography } from 'antd';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const s = {
  container: css`
    padding: var(--x2);
    box-sizing: border-box;
  `,
};

interface IStatusConfirmationModalProps {
  type: 'order' | 'payment' | 'fulfillment';
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: (props: { comment: string }) => void;
  statusLabel: string;
  loading?: boolean;
  isDanger?: boolean;
}

export const StatusConfirmationModal = ({
  type,
  open,
  onClose,
  title,
  onSubmit,
  statusLabel,
  loading,
  isDanger,
}: IStatusConfirmationModalProps) => {
  const intl = useIntl();
  const methods = useForm({
    defaultValues: {
      comment: '',
    },
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    if (open) {
      reset({ comment: '' });
    }
  }, [reset, open]);

  const onOk = handleSubmit(async ({ comment }) => {
    onSubmit({ comment });
  });

  return (
    <FormProvider {...methods}>
      <Modal
        open={open}
        width={600}
        centered
        title={title}
        onOk={onOk}
        onCancel={onClose}
        transitionName="ant-fade"
        maskTransitionName="ant-fade"
        cancelButtonProps={{
          'data-testid': `change-${type}-status-cancel`,
        }}
        okButtonProps={{
          danger: isDanger,
          loading,
          'data-testid': `change-${type}-status-ok`,
        }}
        okText={title}
      >
        <div css={s.container} data-testid={`change-${type}-status-modal`}>
          {open && (
            <Typography.Paragraph>
              {intl.formatMessage({ id: t('orders.statusModals.changeAction') }, { type })}{' '}
              <Typography.Text code data-testid={`change-${type}-status-label`}>
                {statusLabel}
              </Typography.Text>
            </Typography.Paragraph>
          )}
          <Controller
            control={methods.control}
            name="comment"
            render={({ field, fieldState }) => {
              return (
                <Box>
                  <Label>{intl.formatMessage({ id: t('common.comment') })}</Label>
                  <Input.TextArea
                    data-testid={`${type}-status-modal-comment-field`}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder={intl.formatMessage({ id: t('common.comment') })}
                    status={fieldState.error ? 'error' : undefined}
                  />
                </Box>
              );
            }}
          />
        </div>
      </Modal>
    </FormProvider>
  );
};
