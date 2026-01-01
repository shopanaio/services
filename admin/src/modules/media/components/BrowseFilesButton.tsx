import { BrowseFiles } from '@modules/media/components/BrowseFiles';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { Button, ButtonProps } from 'antd';
import { useState } from 'react';

interface ICategorySelectProps {
  onChange: (value: IMediaFile[]) => void;
  value: IMediaFile[];
  status?: 'error' | undefined;
  buttonProps?: ButtonProps;
}

export const BrowseFilesButton = ({
  onChange,
  value = [],
  buttonProps,
}: ICategorySelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <>
      <Button
        children="Browse"
        {...buttonProps}
        onClick={() => {
          setBrowsing(true);
        }}
      />
      <BrowseFiles
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
      />
    </>
  );
};
