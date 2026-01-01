import { BrowsePages } from '@modules/pages/components/Browse';
import { IEntryOption } from '@src/entity/EntryOption/EntryOption';
import { IPage } from '@src/entity/Page/Page';
import { Button, ButtonProps } from 'antd';
import { useState } from 'react';

interface IPageSelectProps {
  onChange: (value: IEntryOption[]) => void;
  value: IPage[];
  status?: 'error' | undefined;
  buttonProps?: ButtonProps;
}

export const BrowsePagesButton = ({
  onChange,
  value = [],
  buttonProps,
}: IPageSelectProps) => {
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
      <BrowsePages
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
      />
    </>
  );
};
