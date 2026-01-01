import { ValidationAlert } from '@components/forms/ValidationAlert';
import { ColorPicker, Input, Modal, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';
import { Label } from '@components/forms/Label';
import { useEffect } from 'react';
import { useCreateTag } from '@modules/tags/hooks/useCreate';
import { ITag } from '@src/entity/Tag/Tag';
import { ITagFormValues } from '@modules/tags/types';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { useUpdateTag } from '@modules/tags/hooks/useUpdate';
import { slugify } from '@components/forms/slug/slugify';
import { getEditTagPayload } from '@modules/tags/utils/getEditPayload';
import { AggregationColor } from 'antd/es/color-picker/color';

interface ITagModalProps {
  open: boolean;
  onClose: () => void;
  tag: ITag | null;
}

export const TagModal = ({ open, tag, onClose }: ITagModalProps) => {
  const methods = useForm({
    defaultValues: {} as ITagFormValues,
  });

  const { control, handleSubmit, formState, reset } = methods;
  const { dirtyFields } = formState;

  const { createTag } = useCreateTag();
  const { updateTag } = useUpdateTag();

  const onOk = handleSubmit(async (data) => {
    if (tag?.id) {
      await updateTag(
        getEditTagPayload({
          id: tag.id,
          data,
          dirtyFields,
        }),
      );
      onClose();
      return;
    }

    await createTag({
      title: data.title,
      slug: slugify(data.title),
      color: data.color.toHexString(),
    });

    onClose();
  });

  useEffect(() => {
    if (open) {
      reset({
        title: tag?.title || '',
        color: new AggregationColor(tag?.color || '#fff'),
      });
    }
  }, [open, tag, reset]);

  const { formatMessage } = useIntl();
  return (
    <Modal
      destroyOnClose
      open={open}
      width={1000}
      title={
        <Flex
          data-testid="feature-modal-header"
          align="center"
          justify="space-between"
          w="100%"
          pr="10"
          css={css`
            width: 100%;
          `}
        >
          <Typography.Title level={4}>
            {tag?.id ? (
              <FormattedMessage id={t('tags.modal.title.edit')} />
            ) : (
              <FormattedMessage id={t('tags.modal.title.create')} />
            )}
          </Typography.Title>
        </Flex>
      }
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'modal-cancel-button',
      }}
      okButtonProps={{
        'data-testid': 'modal-submit-button',
      }}
      okText={formatMessage({ id: t('common.save') })}
    >
      <ValidationAlert errors={formState.errors} />
      <Flex w="100%" direction="column" mt="4">
        <Label required>
          <FormattedMessage id={t('tags.modal.field.name')} />
        </Label>
        <Flex gap="4">
          <Controller
            name="title"
            control={control}
            render={({ field }) => {
              return (
                <Input
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={formatMessage({ id: t('tags.modal.field.name.placeholder') })}
                  data-testid="feature-title-input"
                  suffix={
                    <Controller
                      key="color"
                      name="color"
                      control={control}
                      render={({ field }) => {
                        return (
                          <ColorPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        );
                      }}
                    />
                  }
                />
              );
            }}
          />
        </Flex>
      </Flex>
    </Modal>
  );
};
