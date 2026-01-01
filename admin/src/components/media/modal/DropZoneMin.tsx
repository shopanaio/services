import { notify } from '@components/feedback/notification';
import { URLUpload } from '@components/media/modal/URLUpload';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import {
  useUploadFile,
  useUploadFileByUrl,
} from '@modules/media/hooks/useUploadFile';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { FileDriver } from '@src/graphql';
import { getFileExtension } from '@src/utils/files-upload';
import { Button, Modal, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { MdOutlineLink } from 'react-icons/md';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IDropZonePreviewProps {
  accept?: string[];
  value?: File | null;
  onChange: (files: IMediaFile[]) => void;
  multiple?: boolean;
  onDone?: () => void;
}

export function DropZoneMin({
  onChange,
  accept = [],
  multiple,
  onDone,
}: IDropZonePreviewProps) {
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const { formatMessage } = useIntl();

  const { uploadFile, loading } = useUploadFile();
  const { uploadFileByUrl, loading: uploadFileByUrlLoading } =
    useUploadFileByUrl();

  const { handleSubmit, setError, control, resetField } = useForm({
    defaultValues: {
      url: '',
    },
  });

  useEffect(() => {
    if (!isUrlModalOpen) {
      return;
    }

    resetField('url');
  }, [isUrlModalOpen, setIsUrlModalOpen, resetField]);

  const onSubmit = handleSubmit(async ({ url }) => {
    try {
      const mediaFile = await uploadFileByUrl(url);
      if (!mediaFile) {
        setError(`url`, {
          type: 'custom',
          message: formatMessage({ id: t('common.internalError') }),
        });
        return;
      }

      onChange([mediaFile]);
      setIsUrlModalOpen(false);
    } catch (e: any) {
      console.error(e);
      setError(`url`, {
        type: 'custom',
        message:
          e?.message || formatMessage({ id: t('media.error.invalidUrl') }),
      });
    } finally {
      onDone?.();
    }
  });

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
    <>
      <div
        {...getRootProps()}
        data-testid="upload-dropzone"
        css={css`
          align-items: center;
          background-color: var(--color-gray-3);
          border-radius: var(--radius-base);
          border: 1px dashed var(--color-primary-6);
          cursor: pointer;
          display: flex;
          height: 100px;
          justify-content: center;
          overflow: hidden;
        `}
      >
        <Flex align="center" justify="center" direction="column" gap="3">
          {loading ? (
            <Spin />
          ) : (
            <>
              <Typography.Text>
                <FormattedMessage id={t('media.dragDropYourFiles')} />
              </Typography.Text>
              <Flex gap="4">
                <Button data-testid="browse-files-button" type="primary">
                  <FormattedMessage id={t('common.upload')} />
                </Button>
                <Button
                  data-testid="upload-from-url-button"
                  icon={<MdOutlineLink />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUrlModalOpen(true);
                  }}
                >
                  <FormattedMessage id={t('media.addFromUrl')} />
                </Button>
              </Flex>
            </>
          )}
        </Flex>
        <input {...getInputProps()} data-testid="upload-input" name="name" />
      </div>
      <Modal
        destroyOnClose
        open={isUrlModalOpen}
        onCancel={() => setIsUrlModalOpen(false)}
        width={620}
        onOk={onSubmit}
        okButtonProps={{
          'data-testid': 'upload-modal-submit-button',
          loading: uploadFileByUrlLoading,
          disabled: !isUrlModalOpen,
        }}
        title={formatMessage({ id: t('media.uploadFromUrl') })}
      >
        <Box h="100px">
          <URLUpload control={control} />
        </Box>
      </Modal>
    </>
  );
}
