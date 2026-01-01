import { BrowsePages } from '@modules/pages/components/Browse';
import { useState } from 'react';
import { IPage } from '@src/entity/Page/Page';
import { EntitySelect } from '@components/forms/EntitySelect';
import { Variant } from 'antd/es/config-provider';

interface IPageSelectProps {
  onChange: (value: IPage[]) => void;
  value: IPage[];
  browseType?: 'default' | 'compact' | null;
  status?: 'error' | undefined;
  variant?: Variant;
  showValue: boolean;
  multiple: boolean;
}

export const PageSelect = ({
  onChange,
  value = [],
  status,
  showValue,
  multiple,
  variant,
}: IPageSelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <>
      <EntitySelect
        showValue={showValue}
        renderLabel={(it) => it.title}
        variant={variant}
        data-testid="product-select"
        filterOption={false}
        placeholder="Select category"
        value={value}
        style={{ width: '100%' }}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
        onChange={onChange}
      />
      <BrowsePages
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
        multiple={multiple}
      />
    </>
  );
};
