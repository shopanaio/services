import { YoutubePreview } from '@components/media/control/YoutubePreview';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { FileDriver } from '@src/graphql';
import { Badge, Button, Image, Typography } from 'antd';
import { MdClose, MdOutlineRemoveRedEye } from 'react-icons/md';

const filterCloseBadge = css`
  display: none;
  background-color: var(--color-primary-10);
  color: var(--color-primary-1);
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  z-index: 9;

  &:focus,
  &:hover,
  &:active {
    display: flex;
  }
`;

export interface IImagePreviewProps {
  file: IMediaFile;
  checked?: boolean;
  onCheck?: (checked: boolean) => boolean;
  onClear?: () => void;
  name: string;
  size?: 'small' | 'large';
  square?: boolean;
  radius?: string;
}

export const ImagePreview = (props: IImagePreviewProps) => {
  const { file, onClear, name, size, square = true, radius } = props;

  if (file.driver === FileDriver.Ytb) {
    return <YoutubePreview {...props} />;
  }

  const image = (
    <Flex
      css={css`
        cursor: pointer;
        aspect-ratio: ${square ? '1/1' : 'unset'};
        width: 100%;
        border-radius: ${radius};
        overflow: hidden;
        position: relative;

        &:hover + [data-testid='remove-button'] {
          display: flex;
        }
      `}
    >
      <Image
        src={file.url}
        width="100%"
        height="100%"
        data-testid={`${name}-image-preview`}
        preview={{
          mask: (
            <Flex align="center" justify="center">
              {size !== 'small' && (
                <>
                  {onClear && (
                    <Box
                      css={css`
                        position: absolute;
                        top: 0;
                        right: 0;
                      `}
                    >
                      <Button
                        size="small"
                        data-testid={`${name}-clear-button`}
                        type="text"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClear();
                        }}
                        icon={<MdClose size={20} color="var(--color-gray-1)" />}
                      />
                    </Box>
                  )}
                  <Flex gap="2" align="center">
                    <MdOutlineRemoveRedEye
                      size={20}
                      color="var(--color-gray-1)"
                    />
                    {size === 'large' && (
                      <Typography.Text
                        css={css`
                          color: var(--color-gray-1);
                        `}
                      >
                        Preview
                      </Typography.Text>
                    )}
                  </Flex>
                </>
              )}
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

  if (size === 'small') {
    return (
      <Badge
        count={
          <div
            data-testid="remove-button"
            onClick={() => {
              onClear?.();
            }}
            role="button"
            data-remove-tag
            css={filterCloseBadge}
          >
            <MdClose />
          </div>
        }
      >
        {image}
      </Badge>
    );
  }

  return image;
};
