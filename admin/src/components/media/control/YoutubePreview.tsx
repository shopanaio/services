import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { RiYoutubeLine } from 'react-icons/ri';
import { FaYoutube } from 'react-icons/fa';
import { IImagePreviewProps } from '@components/media/control/ImagePreview';
import { getYouTubePreview } from '@src/utils/utils';
import { Button, Image } from 'antd';
import { MdClose } from 'react-icons/md';
import { Box } from '@components/utility/Box';
import YouTubePlayer from 'react-player/youtube';

export const YoutubePreview = (props: IImagePreviewProps) => {
  const { file, onClear, name } = props;

  const previewImage = getYouTubePreview(file?.url);

  return (
    <Flex
      css={css`
        cursor: pointer;
        aspect-ratio: 1/1;
        width: 100%;
        border-radius: var(--radius-base);
        overflow: hidden;
        position: relative;
      `}
    >
      <Image
        src={previewImage || ''}
        width="100%"
        height="100%"
        data-testid={`${name}-image-preview`}
        preview={{
          imageRender: () => (
            <YouTubePlayer
              url={file.url}
              width={700}
              height={500}
              onError={() => {
                console.error('error');
              }}
            />
          ),
          mask: (
            <Flex align="center" justify="center">
              {onClear && (
                <Box
                  css={css`
                    position: absolute;
                    top: 0;
                    right: 0;
                    padding: var(--x1);
                  `}
                >
                  <Button
                    data-testid={`${name}-clear-button`}
                    type="text"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClear();
                    }}
                    icon={<MdClose size={20} color="var(--color-gray-1)" />}
                    // shape="circle"
                  />
                </Box>
              )}
              <Flex gap="2" align="center">
                {previewImage ? (
                  <FaYoutube size={40} color="var(--color-gray-1)" />
                ) : (
                  <RiYoutubeLine size={40} color="var(--color-gray-7)" />
                )}
              </Flex>
            </Flex>
          ),
          toolbarRender: () => null,
        }}
        css={css`
          object-fit: cover;
        `}
      />
    </Flex>
  );
};
