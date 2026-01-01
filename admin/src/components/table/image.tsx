import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { Image } from 'antd';
import { HiEye } from 'react-icons/hi';

import fallbackImg from '@assets/fallback-image.png';

const s = {
  image: css`
    object-fit: cover;
    vertical-align: auto;
  `,
};

export interface ITableImageProps {
  file: IMediaFile | null | undefined;
  size?: number;
  name?: string;
  onClick?: () => void;
}

export const TableImage = ({
  file,
  size = 40,
  name = 'table',
  onClick,
}: ITableImageProps) => {
  return (
    <Box
      css={css`
        border-radius: var(--radius-base);
        overflow: hidden;
        aspect-ratio: 1 / 1;
        border: 2px solid var(--color-gray-5);
        width: ${size}px;
        height: ${size}px;
        cursor: pointer;
      `}
      onClick={onClick}
      role="button"
    >
      <Image
        data-testid={`${name}-image`}
        src={file?.url}
        css={s.image}
        width="100%"
        height="100%"
        {...(file
          ? {
              preview: {
                mask: <HiEye color="var(--color-gray-1)" />,
              },
            }
          : { preview: false })}
        fallback={fallbackImg}
        preview={false}
      />
    </Box>
  );
};
