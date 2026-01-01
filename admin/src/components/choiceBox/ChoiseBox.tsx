import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Radio, Typography } from 'antd';
import { ReactNode } from 'react';

export interface ChoiceBoxProps {
  description: ReactNode;
  title: ReactNode;
  onClick: () => void;
  checked: boolean;
  name: string;
  'data-testid': string;
}

export const ChoiceBox = ({
  description,
  title,
  onClick,
  checked,
  name,
  'data-testid': dataTestId,
}: ChoiceBoxProps) => {
  return (
    <div
      role="radio"
      aria-checked={checked}
      data-testid={dataTestId}
      style={
        checked
          ? {
              borderColor: 'var(--color-gray-9)',
              backgroundColor: 'var(--color-gray-2)',
            }
          : undefined
      }
      css={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--x4);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-base);
        cursor: pointer;
        background-color: var(--color-white);
        gap: var(--x10);

        &:hover {
          background-color: var(--color-gray-2);
          border-color: var(--color-gray-6);
        }
      `}
      onClick={onClick}
    >
      <Flex direction="column" gap="1">
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text type="secondary">{description}</Typography.Text>
      </Flex>
      <Radio checked={checked} name={name} tabIndex={-1} aria-hidden={true} />
    </div>
  );
};
