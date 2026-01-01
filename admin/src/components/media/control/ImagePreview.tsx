import { css } from '@emotion/react';
import { Image, Button } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { IMediaFile } from '@/domains/inventory/products/types';

interface IImagePreviewProps {
  file: IMediaFile;
  onCheck?: () => boolean;
  onClear?: () => void;
  name: string;
  size?: 'small' | 'large';
  square?: boolean;
  radius?: string;
}

export const ImagePreview = ({
  file,
  onClear,
  name,
  size,
  square,
  radius,
}: IImagePreviewProps) => {
  return (
    <div
      data-testid={`${name}-preview`}
      css={css`
        position: relative;
        aspect-ratio: ${square ? '1/1' : 'auto'};
        width: 100%;
        min-height: ${size === 'small' ? '60px' : '100px'};
        border-radius: ${radius || 'var(--radius-base)'};
        overflow: hidden;
        border: 1px solid var(--color-border);

        &:hover .preview-overlay {
          opacity: 1;
        }
      `}
    >
      <Image
        src={file.url}
        alt={file.alt || ''}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        preview={{
          mask: (
            <div className="preview-overlay">
              <EyeOutlined />
            </div>
          ),
        }}
      />
      {onClear && (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={onClear}
          css={css`
            position: absolute;
            top: 4px;
            right: 4px;
            background: rgba(255, 255, 255, 0.9);
          `}
        />
      )}
    </div>
  );
};
