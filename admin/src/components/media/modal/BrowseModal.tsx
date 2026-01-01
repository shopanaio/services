import { DropZone } from '@components/media/modal/DropZone';
import { URLUpload } from '@components/media/modal/URLUpload';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import {
  useUploadFile,
  useUploadFileByUrl,
} from '@modules/media/hooks/useUploadFile';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { Button, Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MdArrowBack } from 'react-icons/md';

interface UploadMediaModalProps {
  open: boolean;
  onCancel: () => void;
  title?: string;
  onChange: (files: IMediaFile[]) => void;
  multiple?: boolean;
  value: IMediaFile[];
}

export const BrowseMediaModal = ({
  open,
  onCancel,
  title = 'Upload media',
  onChange,
  multiple,
}: UploadMediaModalProps) => {
  const [isUrlTab, setIsUrlTab] = useState(false);

  const { uploadFile, loading: uploadFileLoading } = useUploadFile();
  const { uploadFileByUrl, loading: uploadFileByUrlLoading } =
    useUploadFileByUrl();

  const { handleSubmit, setError, control, resetField } = useForm({
    defaultValues: {
      url: '',
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setIsUrlTab(false);
    resetField('url');
  }, [open, setIsUrlTab, resetField]);

  const onSubmit = handleSubmit(async ({ url }) => {
    if (!isUrlTab || !url) {
      return;
    }

    try {
      const mediaFile = await uploadFileByUrl(url);
      if (!mediaFile) {
        setError(`url`, {
          type: 'custom',
          message: 'Internal error',
        });
        return;
      }

      onChange([mediaFile]);
      onCancel();
    } catch (e: any) {
      console.error(e);
      setError(`url`, {
        type: 'custom',
        message: e?.message || 'Invalid url',
      });
    }
  });

  return (
    <Modal
      destroyOnClose
      open={open}
      onCancel={onCancel}
      width={1000}
      onOk={onSubmit}
      okButtonProps={{
        'data-testid': 'upload-modal-submit-button',
        loading: uploadFileByUrlLoading,
        disabled: !isUrlTab,
      }}
      title={
        isUrlTab ? (
          <Flex
            align="center"
            css={css`
              gap: 2px;
              margin-top: -4px;
              margin-left: -8px;
            `}
          >
            <Button
              type="text"
              icon={<MdArrowBack />}
              onClick={() => setIsUrlTab(false)}
            />
            Upload from url
          </Flex>
        ) : (
          title
        )
      }
    >
      <Box h="500px">
        {isUrlTab ? (
          <URLUpload control={control} />
        ) : (
          <DropZone
            loading={uploadFileLoading}
            multiple={multiple}
            value={null}
            openUrlUpload={() => setIsUrlTab(true)}
            uploadFile={uploadFile}
            onDone={onCancel}
            onChange={onChange}
          />
        )}
      </Box>
    </Modal>
  );
};
