import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IGenericTranslationData } from '@modules/translations/types';
import { t } from '@src/lang/messages';
import { Divider, Tag, Typography } from 'antd';
import { ComponentType, useEffect } from 'react';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { useIntl } from 'react-intl';

export type LocaleFormApi<T> = {
  getValues: () => T;
  getDirtyFields: () => Record<string, boolean>;
  isDirty: () => boolean;
  reset: (vals: T) => void;
};

export type LocaleColumnProps<T extends FieldValues> = {
  defaultCode: string;
  localeCode: string;
  localeTitle: string;
  data: IGenericTranslationData<T>;
  component: ComponentType<{
    data: IGenericTranslationData;
    defaultCode: string;
  }>;
  onRegister: (localeCode: string, api: LocaleFormApi<T>) => void;
  onUnregister: (localeCode: string) => void;
  onDirtyChange: () => void;
};

export const LocaleColumn = <T extends FieldValues>({
  defaultCode,
  localeCode,
  localeTitle,
  data,
  component: Component,
  onRegister,
  onUnregister,
  onDirtyChange,
}: LocaleColumnProps<T>) => {
  const { formatMessage } = useIntl();
  const methods = useForm<T>();
  const { reset, formState, getValues } = methods;

  useEffect(() => {
    if (data?.translations) {
      reset((data.translations as any)[localeCode] as T, {
        keepDirty: false,
        keepDirtyValues: false,
      });
    }
  }, [data, localeCode, reset]);

  // Регистрируем/обновляем API формы в родителе
  useEffect(() => {
    onRegister(localeCode, {
      getValues: () => getValues(),
      getDirtyFields: () => formState.dirtyFields as Record<string, boolean>,
      isDirty: () => formState.isDirty,
      reset: (vals: any) =>
        reset(vals, { keepDirty: false, keepDirtyValues: false }),
    });
    return () => {
      onUnregister(localeCode);
    };
  }, [localeCode, getValues, formState, reset, onRegister, onUnregister]);

  // Сообщаем родителю об изменении грязности
  useEffect(() => {
    onDirtyChange();
  }, [formState.isDirty, onDirtyChange]);

  return (
    <FormProvider {...methods}>
      <Flex
        direction="column"
        gap="2"
        css={css`
          min-width: 700px;
          width: 100%;
        `}
      >
        <Flex gap="2">
          <Typography.Title level={5}>{localeTitle}</Typography.Title>
          {defaultCode === localeCode && (
            <Tag>{formatMessage({ id: t('translations.default') })}</Tag>
          )}
        </Flex>
        <Flex direction="column" gap="4">
          <Component data={data as any} defaultCode={localeCode} />
        </Flex>
      </Flex>
    </FormProvider>
  );
};
