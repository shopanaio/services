import { notify } from '@components/feedback/notification';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import {
  IHandleResultParams,
  IUploadFileParams,
} from '@modules/media/hooks/useUploadFile';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { FileDriver } from '@src/graphql';
import { getFileExtension } from '@src/utils/files-upload';
import { Button, Spin, Typography } from 'antd';
import { useDropzone } from 'react-dropzone';
import { MdOutlineLink } from 'react-icons/md';
import { RiImageAddFill } from 'react-icons/ri';

interface IDropZonePreviewProps {
  accept?: string[];
  value?: File | null;
  onChange: (files: IMediaFile[]) => void;
  openUrlUpload: () => void;
  multiple?: boolean;
  loading?: boolean;
  onDone?: () => void;
  uploadFile: (
    data: IUploadFileParams & IHandleResultParams,
  ) => Promise<IMediaFile>;
}

export function DropZone({
  loading,
  onChange,
  accept = [],
  openUrlUpload,
  uploadFile,
  multiple,
  onDone,
}: IDropZonePreviewProps) {
  const { getRootProps, getInputProps } = useDropzone({
    multiple,
    accept: {
      [accept?.length
        ? accept.map((ext) => `image/${ext}`).join(', ')
        : 'image/*']: [],
    },
    onDrop: async (data) => {
      try {
        const result = await Promise.allSettled(
          data.map((file) =>
            uploadFile({
              file,
              driver: FileDriver.S3,
              ext: getFileExtension(file.name),
            }),
          ),
        );

        onChange(
          result
            .map((it) => (it.status === 'fulfilled' ? it.value : null))
            .filter(Boolean) as IMediaFile[],
        );
      } catch (e) {
        notify.internalError();
        console.error(e);
      } finally {
        onDone?.();
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      data-testid="upload-dropzone"
      css={css`
        align-items: center;
        background-color: var(--color-primary-2);
        border-radius: var(--radius-base);
        border: 1px dashed var(--color-primary-6);
        cursor: pointer;
        display: flex;
        height: 100%;
        justify-content: center;
        overflow: hidden;
        width: 100%;
      `}
    >
      <Flex align="center" justify="center" direction="column" gap="4">
        {loading ? (
          <Spin />
        ) : (
          <>
            <RiImageAddFill size={36} color="var(--color-primary)" />
            <Typography.Text strong>
              Drag & drop your file(s) here or
            </Typography.Text>
            <Flex gap="4">
              <Button data-testid="browse-files-button" type="primary">
                Upload
              </Button>
              <Button
                data-testid="upload-from-url-button"
                icon={<MdOutlineLink />}
                onClick={(e) => {
                  e.stopPropagation();
                  openUrlUpload();
                }}
              >
                Add from URL
              </Button>
            </Flex>
          </>
        )}
      </Flex>
      <input {...getInputProps()} data-testid="upload-input" name="name" />
    </div>
  );
}
