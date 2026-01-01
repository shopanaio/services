import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Input, Modal, Select, Typography } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { LanguageSwitch } from '@modules/locales/components/LanguageSwitch';
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { IFilterFormValue } from '@modules/navigation/components/Filters';
import { useEffect } from 'react';
import { Label } from '@components/forms/Label';
import { FeatureGroupSelect } from '@modules/features/components/FeatureGroupSelect';
import { useUpdateFilter } from '@modules/navigation/hooks/useUpdateFilter';
import { useCreateFilter } from '@modules/navigation/hooks/useCreateFilter';
import { ApiUpdateFilterInput, FilterType } from '@src/graphql';
import { productFilters } from '@src/entity/ProductFilter/defs';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IFilterModalProps {
  open: boolean;
  onClose: () => void;
  filter: IFilterFormValue | null;
  onSubmit: (value: any) => void;
}

export const FilterModal = ({
  open,
  onClose,
  onSubmit,
  filter,
}: IFilterModalProps) => {
  const methods = useForm({
    defaultValues: {} as IFilterFormValue,
    // resolver: yupResolver(getAttributeModalSchema(locales)) as any,
  });
  const { formatMessage } = useIntl();

  const { control, handleSubmit, formState, reset } = methods;
  const { dirtyFields, isDirty } = formState;

  const { createFilter } = useCreateFilter();
  const { updateFilter } = useUpdateFilter();

  useEffect(() => {
    if (filter) {
      reset(filter);
    }
  }, [filter, reset]);

  const onOk = handleSubmit(async (data) => {
    if (!data.id) {
      const response = await createFilter({
        title: data.title,
        controlType: data.controlType!,
        sortIndex: data.sortIndex,
        type: data.type,
        featureGroupId: data.featureGroup?.id,
      } as any);

      onSubmit({ ...data, id: response.data?.filterMutation.create.id });
      return;
    }

    const payload = {} as ApiUpdateFilterInput;
    if (dirtyFields.title) {
      payload.title = data.title;
    }

    if (dirtyFields.controlType) {
      payload.controlType = data.controlType;
    }

    await updateFilter(payload);
    onSubmit(data);
  });

  const isNew = filter?.id === null;

  return (
    <Modal
      destroyOnClose
      open={open}
      width={1000}
      transitionName="ant-fade"
      maskTransitionName="ant-fade"
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
          {isNew ? (
            <FormattedMessage id={t('filters.modal.title.new')} />
          ) : (
            <FormattedMessage id={t('filters.modal.title.edit')} />
          )}
        </Flex>
      }
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
      <ValidationAlert errors={formState.errors} />
      <Flex w="100%" direction="column" mt="4">
        <Label required>
          <FormattedMessage id={t('filters.modal.field.source')} />
        </Label>
        <Input
          value={filter ? productFilters[filter.type].label : ''}
          disabled
        />
      </Flex>
      <Controller
        name="title"
        control={control}
        render={({ field }) => {
          return (
            <Flex w="100%" direction="column" mt="4">
              <Label required>
                <FormattedMessage id={t('filters.modal.field.title')} />
              </Label>
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder={formatMessage({ id: t('filters.modal.field.title.placeholder') })}
                data-testid="feature-title-input"
              />
              <Box mt="1">
                <Typography.Text type="secondary">
                  <FormattedMessage id={t('filters.modal.field.title.helper')} />
                </Typography.Text>
              </Box>
            </Flex>
          );
        }}
      />
      {filter?.type === FilterType.Feature && (
        <Controller
          name="featureGroup"
          control={control}
          render={({ field, fieldState }) => {
            return (
              <Flex w="100%" direction="column" mt="4">
                <Label required>Feature</Label>
                <FeatureGroupSelect
                  showValue
                  onChange={(values) => {
                    if (values.length) {
                      field.onChange(values[0]);
                      return;
                    }

                    field.onChange(null);
                  }}
                  value={field?.value ? [field.value] : []}
                  status={fieldState.invalid ? 'error' : undefined}
                />
              </Flex>
            );
          }}
        />
      )}
      <Controller
        name="controlType"
        control={control}
        render={() => {
          return (
            <Flex w="100%" direction="column" mt="4">
              <Label required>
                <FormattedMessage id={t('filters.modal.field.controlType')} />
              </Label>
              <Select
                placeholder={formatMessage({ id: t('filters.modal.field.controlType') })}
                disabled
              />
            </Flex>
          );
        }}
      />
      <Flex direction="column" my="6">
        <Typography.Text type="secondary">
          Filters are applied with{' '}
          <Typography.Text strong type="secondary">
            AND
          </Typography.Text>{' '}
          logic, and filter values with{' '}
          <Typography.Text strong type="secondary">
            OR
          </Typography.Text>
          .
        </Typography.Text>
        <Typography.Text type="secondary">
          For example, you can return products that are a specific color and a
          specific size, or you can return products that are one color or
          another.
        </Typography.Text>
      </Flex>
    </Modal>
  );
};
