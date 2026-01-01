import { css } from '@emotion/react';
import { PlusOutlined } from '@ant-design/icons';

interface IImageThumbnailProps {
  onClick?: () => void;
  'data-testid'?: string;
  size?: 'small' | 'large';
  square?: boolean;
  radius?: string;
  dashed?: boolean;
}

export const ImageThumbnail = ({
  onClick,
  'data-testid': dataTestId,
  size,
  square,
  radius,
  dashed = true,
}: IImageThumbnailProps) => {
  return (
    <div
      onClick={onClick}
      data-testid={dataTestId}
      css={css`
        cursor: pointer;
        aspect-ratio: ${square ? '1/1' : 'auto'};
        width: 100%;
        min-height: ${size === 'small' ? '60px' : '100px'};
        border-radius: ${radius || 'var(--radius-base)'};
        border: 1px ${dashed ? 'dashed' : 'solid'} var(--color-border);
        background-color: var(--color-bg-container);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease-in-out;

        &:hover {
          border-color: var(--color-primary);
          background-color: var(--color-primary-1);
        }
      `}
    >
      <PlusOutlined style={{ fontSize: 20, color: 'var(--color-text-secondary)' }} />
    </div>
  );
};
