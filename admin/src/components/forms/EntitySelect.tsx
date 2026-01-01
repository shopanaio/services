import { css } from '@emotion/react';
import { cropString } from '@src/utils/utils';
import { Select, SelectProps, Tag, Tooltip } from 'antd';
import { MdClose } from 'react-icons/md';

export const EntitySelect = <T extends { id: ID }>({
  variant,
  value,
  showValue,
  showSearch = false,
  renderLabel,
  onChange,
  status,
  onClick,
  placeholder,
  open = false,
  'data-testid': dataTestId,
  loading,
}: Omit<SelectProps, 'value' | 'onChange'> & {
  showValue: boolean;
  value: T[];
  onChange: (value: T[]) => void;
  renderLabel: (it: T) => string;
  'data-testid'?: string;
}) => {
  let props = {} as Partial<SelectProps>;
  if (variant === 'borderless') {
    props = getUiFilterSelectProps(value);
  }

  return (
    <Select
      loading={loading}
      filterOption={false}
      placeholder={placeholder}
      showSearch={showSearch}
      labelInValue
      value={
        showValue
          ? value?.map((it) => ({
              label: renderLabel(it),
              value: it.id,
              data: it,
            }))
          : []
      }
      mode="multiple"
      style={{ width: '100%', minWidth: 120 }}
      onDeselect={({ value: id }) => {
        onChange(value.filter((it) => it.id !== id));
      }}
      options={[]}
      status={status}
      open={open}
      onClick={onClick}
      data-testid={dataTestId}
      {...props}
    />
  );
};

export const getUiFilterSelectProps = (
  value: any[],
  { closable: closableProp = true }: { closable?: boolean } = {},
) => {
  return {
    variant: 'borderless',
    suffixIcon: null,
    maxTagCount: 1,
    autoFocus: true,
    mode: 'multiple',
    showSearch: false,
    dropdownStyle: {
      minWidth: 200,
    },
    style: value?.length
      ? { width: 'fit-content' }
      : { width: '100%', minWidth: 80 },

    tagRender: ({
      label,
      onClose,
      closable,
    }: {
      label: string;
      onClose: (e: React.MouseEvent<HTMLElement>) => void;
      closable: boolean;
    }) => {
      return (
        <Tooltip
          title={label}
          mouseEnterDelay={0.5}
          placement="topLeft"
          arrow={false}
        >
          <Tag
            onClose={onClose}
            closable={closable && closableProp}
            closeIcon={<MdClose color="white" />}
            css={css`
              display: flex;
              align-items: center;
              gap: var(--x1);
              margin: 0 2px;
              font-size: var(--font-size);
              background-color: var(--color-gray-10);
              color: var(--color-gray-1);
              border-color: var(--color-gray-10);
            `}
          >
            {cropString(label, 14)}
          </Tag>
        </Tooltip>
      );
    },
  } as Partial<SelectProps>;
};
