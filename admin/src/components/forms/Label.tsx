import { css } from '@emotion/react';

import { Tooltip, Typography } from 'antd';
import { ReactNode } from 'react';
import { MdInfoOutline } from 'react-icons/md';

const { Text } = Typography;

export const Label = ({
  disabled,
  children,
  required,
  info,
  htmlFor,
  control,
  ...props
}: React.ComponentProps<'label'> & {
  required?: boolean;
  info?: ReactNode;
  disabled?: boolean;
  control?: ReactNode;
}) => {
  return (
    <label
      htmlFor={htmlFor}
      css={css`
        cursor: ${disabled ? 'not-allowed' : 'pointer'};
        margin-bottom: var(--x1);
        display: flex;
        align-items: center;
        gap: var(--x2);
      `}
      {...props}
    >
      {control}
      <Text ellipsis>
        {required && <Text type="danger">{'* '}</Text>}
        <Text>{children}</Text>
      </Text>
      {info && (
        <Tooltip title={info}>
          {/* Forwarded REF */}
          <span
            css={css`
              margin-left: -3px;
              transform: translateY(1px);
            `}
          >
            <MdInfoOutline color="var(--color-gray-10)" size={16} />
          </span>
        </Tooltip>
      )}
    </label>
  );
};
