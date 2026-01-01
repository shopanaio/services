import { ImagePreview } from '@components/media/control/ImagePreview';
import { ImageThumbnail } from '@components/media/control/ImageThumbnail';
import { UploadMediaModal } from '@components/media/modal/UploadModal';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { useState } from 'react';

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
}: IMediaFileControlProps) => {
  const [open, setOpen] = useState(false);

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
          data-testid={`${name}-image-button`}
          size={size}
          square={square}
          radius={radius}
          dashed={dashed}
        />
      )}
      {onChange && (
        <UploadMediaModal
          open={open}
          onCancel={() => setOpen(false)}
          onChange={onChange}
          multiple={multiple}
          value={file ? [file, ...(value || [])] : value}
        />
      )}
    </>
  );
};
