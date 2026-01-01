import { BrowseTags } from '@modules/tags/components/Browse';
import { useState } from 'react';
import { ITag } from '@src/entity/Tag/Tag';
import { EntitySelect } from '@components/forms/EntitySelect';
import { Variant } from 'antd/es/config-provider';

interface ITagSelectProps {
  onChange: (value: ITag[]) => void;
  value: ITag[];
  browseType?: 'default' | 'compact' | null;
  status?: 'error' | undefined;
  showValue?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  variant?: Variant;
  loading?: boolean;
}

export const TagSelect = ({
  onChange,
  value = [],
  status,
  showValue,
  multiple,
  variant,
  loading,
}: ITagSelectProps) => {
  const [browsing, setBrowsing] = useState(false);

  return (
    <>
      <EntitySelect
        renderLabel={(it) => it.slug}
        variant={variant}
        data-testid="tag-select"
        filterOption={false}
        placeholder="Select tag"
        showValue={!!showValue}
        value={value}
        style={{ width: '100%' }}
        onChange={onChange}
        options={[]}
        status={status}
        open={false}
        onClick={() => setBrowsing(true)}
        loading={loading}
      />
      <BrowseTags
        onChange={onChange}
        value={value}
        onClose={() => setBrowsing(false)}
        open={browsing}
        multiple={multiple}
      />
    </>
  );
};
