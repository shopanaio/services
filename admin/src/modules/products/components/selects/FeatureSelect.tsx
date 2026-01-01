import { useFeatureOptions } from '@modules/features/hooks/useFeatureOptions';
import { IProductFeature } from '@src/entity/Product/ProductFeature';
import { useSearch } from '@src/hooks/useSearch';
import { mapEntryId } from '@src/utils/utils';
import { Select } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface IFeatureSelectProps {
  value: IProductFeature[];
  groupId: ID | null;
  onChange: (value: IProductFeature[]) => void;
  multiple?: boolean;
}

export const FeatureSelect = ({
  groupId,
  onChange,
  value,
}: IFeatureSelectProps) => {
  const intl = useIntl();
  const { onSearch, searchValue } = useSearch();
  const [open, setOpen] = useState(false);

  const { loading, options } = useFeatureOptions({
    notIn: (value || [])?.map(mapEntryId),
    search: searchValue,
    groupId,
  });

  return (
    <Select
      disabled={loading || !options.length}
      data-testid="feature-select"
      open={open}
      onDropdownVisibleChange={setOpen}
      filterOption={false}
      value={null}
      placeholder={intl.formatMessage({
        id: 'common.selectOption',
      })}
      showSearch
      onSelect={(_, { data }) => {
        if (value.find((it) => it?.id === data?.id)) {
          return;
        }
        onChange([...value, data]);
      }}
      style={{ width: '100%' }}
      onSearch={onSearch}
      loading={loading}
      searchValue={searchValue}
      options={options}
    />
  );
};
