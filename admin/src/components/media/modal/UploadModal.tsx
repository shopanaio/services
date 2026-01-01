import { BrowseFiles } from '@modules/media/components/BrowseFiles';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';

interface UploadMediaModalProps {
  open: boolean;
  onCancel: () => void;
  title?: string;
  onChange: (files: IMediaFile[]) => void;
  multiple?: boolean;
  value?: IMediaFile[];
}

export const UploadMediaModal = ({
  open,
  onCancel,
  onChange,
  multiple,
  value = [],
}: UploadMediaModalProps) => {
  return (
    <BrowseFiles
      onChange={onChange}
      multiple={multiple}
      open={open}
      value={value}
      onClose={onCancel}
    />
  );
};
