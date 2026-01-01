import { css } from '@emotion/react';
import { useSearch } from '@src/hooks/useSearch';
import { Button, Divider, Select, Typography } from 'antd';
import { useMemo, useState } from 'react';

interface IFeatureSelectProps {
  onCreate: (title: string) => Promise<void>;
  onChange: (value: string) => void;
  value: string;
  status?: 'error' | undefined;
  'data-testid'?: string;
}

export const FeatureInput = ({
  onChange,
  status,
  onCreate,
  'data-testid': dataTestId,
}: IFeatureSelectProps) => {
  const [open, setOpen] = useState(false);
  const { onSearch, searchValue } = useSearch();

  const options = useMemo(() => {
    return [];
  }, []);

  const createOptionValue = useMemo(() => {
    return searchValue;
  }, [searchValue]);

  return (
    <>
      <Select
        status={status}
        value={[]}
        placeholder="Select feature"
        labelInValue
        mode="multiple"
        filterOption={false}
        style={{ width: '100%' }}
        onSearch={onSearch}
        searchValue={searchValue}
        onSelect={(_, { data }) => {
          onChange(data as IFeature);
          setOpen(false);
        }}
        open={open}
        onDropdownVisibleChange={setOpen}
        data-testid={dataTestId}
        options={options}
        dropdownRender={(menu) => (
          <>
            {!!createOptionValue && (
              <Button
                type="text"
                onClick={() => {
                  onSearch('');
                  onCreate(createOptionValue);
                  setOpen(false);
                }}
                block
                data-testid="create-feature-button"
                css={css`
                  padding: 0 8px;
                  justify-content: flex-start;
                `}
              >
                {createOptionValue}
                <Typography.Text code>New</Typography.Text>
              </Button>
            )}
            {!!options.length && createOptionValue && (
              <Divider style={{ margin: '4px 0' }} />
            )}
            {menu}
          </>
        )}
        notFoundContent={<span />}
      />
    </>
  );
};
