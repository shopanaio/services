import { ImagePreview } from '@/components/media/control/ImagePreview';
import { ImageThumbnail } from '@/components/media/control/ImageThumbnail';
import { IMediaFile } from '@/domains/inventory/products/types';
import { useState } from 'react';
import { Modal, message } from 'antd';

interface IMediaFileControlProps {
  multiple?: boolean;
  onChange?: (file: IMediaFile[]) => void;
  onCheck?: () => boolean;
  onClear?: () => void;
  file?: IMediaFile | null;
  value?: IMediaFile[];
  name: string;
  size?: 'small' | 'large';
  square?: boolean;
  radius?: string;
  dashed?: boolean;
  'data-testid'?: string;
}

export const MediaFileControl = ({
  multiple,
  onChange,
  onCheck,
  onClear,
  value,
  file,
  name,
  size,
  square,
  radius,
  dashed,
  'data-testid': dataTestId,
}: IMediaFileControlProps) => {
  const [open, setOpen] = useState(false);

  const handleUpload = () => {
    // Mock upload - in real app this would open a file picker
    message.info('Media upload not implemented in mock mode');
    setOpen(false);
  };

  return (
    <>
      {file ? (
        <ImagePreview
          file={file}
          onCheck={onCheck}
          onClear={onClear}
          name={name}
          size={size}
          square={square}
          radius={radius}
        />
      ) : (
        <ImageThumbnail
          onClick={() => setOpen(true)}
          data-testid={dataTestId || `${name}-image-button`}
          size={size}
          square={square}
          radius={radius}
          dashed={dashed}
        />
      )}
      <Modal
        title="Upload Media"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleUpload}
      >
        <p>Media upload is not implemented in mock mode.</p>
        <p>Current files: {value?.length || 0}</p>
      </Modal>
    </>
  );
};
