import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { RiImageAddFill } from 'react-icons/ri';

export const ImageThumbnail = ({
  onClick,
  'data-testid': dataTestId,
  size,
  square = true,
  dashed = true,
  radius = 'var(--radius-base)',
}: {
  onClick: () => void;
  multiple?: boolean;
  'data-testid'?: string;
  size?: 'small' | 'large';
  square?: boolean;
  dashed?: boolean;
  radius?: string;
}) => {
  return (
    <Flex
      data-testid={dataTestId}
      onClick={onClick}
      align="center"
      gap="1"
      direction="column"
      justify="center"
      css={css`
        cursor: pointer;
        aspect-ratio: ${square ? '1/1' : 'unset'};
        width: 100%;
        border-radius: ${radius};
        border: 1px ${dashed ? 'dashed' : 'solid'} var(--color-primary-7);
        background-color: var(--color-primary-3);
        transition: all 0.2s ease-in-out;
        &:hover {
          background-color: var(--color-primary-4);
        }
      `}
    >
      <RiImageAddFill
        color="var(--color-gray-7)"
        size={size === 'small' ? 16 : 32}
      />
    </Flex>
  );
};
