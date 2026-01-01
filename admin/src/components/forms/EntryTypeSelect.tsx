import { css } from '@emotion/react';
import { EntityType } from '@src/graphql';
import { useSearch } from '@src/hooks/useSearch';
import { useMemo } from 'react';
import { Button, Divider, Select, Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { Flex } from '@components/utility/Flex';
import { useEntryTypes } from '@modules/shared/hooks/useEntryTypes';
import { Controller } from 'react-hook-form';
import { Label } from '@components/forms/Label';
import { slugify } from 'transliteration';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IEntryTypeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  entity: EntityType.ProdContainer | EntityType.Category | EntityType.Page;
}

export const EntryTypeSelect = ({
  value,
  onChange,
  entity,
}: IEntryTypeSelectProps) => {
  const { onSearch, searchValue } = useSearch();
  const { entryTypes: data, loading } = useEntryTypes(entity);
  const { formatMessage } = useIntl();

  const options = useMemo(() => {
    if (!data?.length) {
      return [];
    }
    return data.filter((it) =>
      it.toLowerCase().includes(searchValue?.toLowerCase() || ''),
    );
  }, [data, searchValue]);

  const createOptionValue = useMemo(() => {
    return Boolean(
      searchValue?.length &&
        !options?.find((it) => slugify(it) === slugify(searchValue)),
    )
      ? searchValue
      : '';
  }, [options, searchValue]);

  const handleChange = (v: string) => {
    onChange(v || '');
    onSearch('');
  };

  return (
    <>
      <Select
        loading={loading}
        value={value || null}
        placeholder={formatMessage({ id: t('common.selectOption') })}
        filterOption={false}
        showSearch={!value}
        allowClear
        style={{ width: '100%' }}
        onSearch={onSearch}
        searchValue={searchValue}
        onChange={handleChange}
        options={options?.map((it) => ({ label: it, value: it })) || []}
        data-testid="entry-type-select"
        dropdownRender={(menu) => (
          <>
            {!!createOptionValue && (
              <Button
                type="text"
                onClick={() => {
                  if (!loading) {
                    handleChange(createOptionValue);
                  }
                }}
                block
                data-testid="create-entry-type-button"
                css={css`
                  padding: 0 8px;
                  justify-content: flex-start;
                `}
              >
                {createOptionValue}
                <Typography.Text code>
                  {formatMessage({ id: t('common.new') })}
                </Typography.Text>
              </Button>
            )}
            {!!options.length && createOptionValue && (
              <Divider style={{ margin: '4px 0' }} />
            )}
            {loading ? (
              <Flex justify="center" align="center" py="4">
                <Spin indicator={<LoadingOutlined spin />} size="default" />
              </Flex>
            ) : options.length ? (
              menu
            ) : null}
          </>
        )}
        notFoundContent={<span />}
      />
    </>
  );
};

const getTitleMapping = (
  formatMessage: (descriptor: { id: string }) => string,
) => ({
  [EntityType.ProdContainer]: formatMessage({
    id: t('entryType.productGroup'),
  }),
  [EntityType.Category]: formatMessage({
    id: t('entryType.categoryGroup'),
  }),
  [EntityType.Page]: formatMessage({
    id: t('entryType.pageGroup'),
  }),
});

export const EntryTypeField = ({
  entityType,
}: {
  entityType: EntityType.ProdContainer | EntityType.Category | EntityType.Page;
}) => {
  const { formatMessage } = useIntl();
  const titlesMapping = getTitleMapping(formatMessage);

  return (
    <Controller
      name="entryType"
      render={({ field }) => (
        <Flex direction="column">
          <Label>{titlesMapping[entityType]}</Label>
          <EntryTypeSelect
            value={field.value}
            onChange={field.onChange}
            entity={entityType}
          />
        </Flex>
      )}
    />
  );
};
