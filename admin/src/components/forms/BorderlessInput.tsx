import { css } from '@emotion/react';
import { Input, InputProps, Select, SelectProps } from 'antd';

export const BorderlessInput = (props: InputProps) => {
  return (
    <Input
      variant="borderless"
      {...props}
      styles={{
        ...props.styles,
        input: {
          padding: 0,
          ...props.styles?.input,
        },
        affixWrapper: {
          padding: 0,
          ...props.styles?.affixWrapper,
        },
      }}
    />
  );
};

export const BorderlessSelect = (props: SelectProps) => {
  return (
    <Select
      variant="borderless"
      className="borderless-select-override-css"
      {...props}
      css={css`
        &.borderless-select-override-css .ant-select-selector {
          padding: 0 !important;
        }
      `}
    />
  );
};
