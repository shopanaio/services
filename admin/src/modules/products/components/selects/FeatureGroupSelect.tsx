import { Flex } from '@components/utility/Flex';
import { BrowseFeatures } from '@modules/features/components/BrowseFeatures';
import { useFeatureGroupOptions } from '@modules/features/hooks/useFeatureGroupOptions';
import { IProductFeatureGroup } from '@src/entity/Product/ProductFeature';
import { useSearch } from '@src/hooks/useSearch';
import { Button, Divider, Input, Select, Space, Typography } from 'antd';
import { useState } from 'react';

interface IFeatureSelectProps {
  onCreate?: (value: string) => void;
  onChange: (value: IProductFeatureGroup) => void;
  value: IProductFeatureGroup | null;
  notIn?: number[];
  editable?: boolean;
}

export const _FeatureGroupSelect = ({
  onCreate,
  onChange,
  value,
  notIn,
  editable,
}: IFeatureSelectProps) => {
  const { onSearch, searchValue } = useSearch();
  const [browsing, setBrowsing] = useState(false);
  const [open, setOpen] = useState(false);

  const { loading, options } = useFeatureGroupOptions({
    notIn,
    search: searchValue,
  });

  if (!editable) {
    return <Input value={value?.title} readOnly />;
  }

  return (
    <Space.Compact style={{ width: '100%' }}>
      <Select
        data-testid="feature-group-select"
        open={open}
        onDropdownVisibleChange={setOpen}
        filterOption={false}
        labelInValue
        value={
          value?.id
            ? {
                value: value?.id,
                label: value?.title || '',
              }
            : null
        }
        placeholder="Search"
        dropdownRender={(menu) => (
          <>
            {menu}
            {onCreate && (
              <>
                <Divider style={{ margin: 'var(--x1) 0' }} />
                <Button
                  data-testid="create-feature-group-button"
                  onClick={() => {
                    onCreate(searchValue);
                    setOpen(false);
                  }}
                  block
                  type="text"
                  style={{
                    borderRadius: 'var(--radius-base)',
                    paddingLeft: 'var(--x3)',
                    paddingRight: 'var(--x3)',
                  }}
                >
                  <Flex gap="1" align="center">
                    <Typography.Text>Create new</Typography.Text>
                    <Typography.Text strong>{searchValue}</Typography.Text>
                  </Flex>
                </Button>
              </>
            )}
          </>
        )}
        showSearch
        suffixIcon={null}
        onSelect={(_, { data }) => onChange(data as any)}
        style={{ width: '100%' }}
        onSearch={onSearch}
        loading={loading}
        searchValue={searchValue}
        options={options}
      />
      <BrowseFeatures
        triggerType="compact"
        onChange={([next]) => onChange(next as any)}
        compact
        value={[]}
        open={browsing}
        onClose={() => setBrowsing(false)}
        onBrowse={() => setBrowsing(true)}
      />
    </Space.Compact>
  );
};
