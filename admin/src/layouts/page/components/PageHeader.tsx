// import { iconProps } from '@components/styles';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Button, ButtonProps, Select, Typography } from 'antd';
import { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import { MdSave } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { entityStatuses } from '@src/defs/constants';

export interface IPageHeaderProps {
  children?: ReactNode;
  title: string;
  onClose?: () => void;
  statusSelectProps?: ReactNode;
  submitButtonProps?: ButtonProps | null;
  status?: boolean;
  extra?: ReactNode;
  switchLocale?: boolean;
  name?: string;
}

export const PageHeader = ({
  name,
  title,
  submitButtonProps,
  status = true,
  extra = null,
}: IPageHeaderProps) => {
  const { formatMessage } = useIntl();
  return (
    <Flex justify="space-between" px="6" py="4" minH="64px">
      <Typography.Title level={4}>{title}</Typography.Title>
      <Flex gap="4" align="center">
        {extra}
        {status && (
          <Controller
            name="status"
            render={({ field, fieldState }) => {
              return (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  style={{ minWidth: 240 }}
                  placeholder={formatMessage({
                    id: t('layouts.page.selectStatus'),
                  })}
                  data-testid="status-select"
                  options={Object.values(entityStatuses).map((it) => ({
                    value: it.value,
                    label: it.label,
                    'data-testid': `status-option-${it.value}`,
                  }))}
                  status={fieldState?.invalid ? 'error' : undefined}
                />
              );
            }}
          />
        )}
        {submitButtonProps !== null && (
          <Button
            data-testid={`submit-${name}=form-button`}
            icon={<MdSave />}
            type="primary"
            children={formatMessage({ id: t('layouts.common.save') })}
            {...submitButtonProps}
            css={css`
              width: 100px;
            `}
          />
        )}
      </Flex>
    </Flex>
  );
};
