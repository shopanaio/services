import { BrowseTags } from '@modules/tags/components/Browse';
import { ITag } from '@src/entity/Tag/Tag';
import { Button, ButtonProps } from 'antd';
import { useState } from 'react';

interface ITagSelectProps {
  onChange: (value: ITag[]) => void;
  value: ITag[];
  status?: 'error' | undefined;
  buttonProps?: ButtonProps;
}

export const BrowseTagsButton = ({
  onChange,
  value = [],
  buttonProps,
}: ITagSelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <>
      <Button
        {...buttonProps}
        onClick={() => {
          setBrowsing(true);
        }}
      >
        Browse
      </Button>
      <BrowseTags
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
      />
    </>
  );
};
