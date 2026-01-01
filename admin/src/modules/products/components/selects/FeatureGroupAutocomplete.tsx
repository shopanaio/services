import { useQuery } from '@apollo/client';
import { slugify } from '@components/forms/slug/slugify';
import { css } from '@emotion/react';
import { FeatureGroupQueryFindMany } from '@modules/features/graphql/findManyGroups';
import { ApiFeatureGroupQueryOptionsArgs } from '@modules/features/graphql/groupOptions';
import { FeatureGroup, IFeatureGroup } from '@src/entity/Feature/FeatureGroup';
import { ApiQuery, FeatureType } from '@src/graphql';
import { useSearch } from '@src/hooks/useSearch';
import {
  getApiSort,
  SortDirection,
} from '@src/layouts/table/components/Navigation/SortBy';
import { Button, Divider, Select, Spin, Typography } from 'antd';
import { useMemo } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Flex } from '@components/utility/Flex';

interface IFeatureGroupSelectProps {
  onCreate: (title: string) => Promise<void>;
  onChange: (value: IFeatureGroup) => void;
  value: IFeatureGroup | null;
  status?: 'error' | undefined;
  notIn?: ID[];
  loading?: boolean;
  'data-testid'?: string;
}

export const FeatureGroupAutocomplete = ({
  onChange,
  value,
  status,
  notIn,
  onCreate,
  loading: loadingProp,
  'data-testid': dataTestId,
}: IFeatureGroupSelectProps) => {
  const { onSearch, searchValue } = useSearch();

  const { data, loading, previousData } = useQuery<
    ApiQuery,
    ApiFeatureGroupQueryOptionsArgs
  >(FeatureGroupQueryFindMany, {
    fetchPolicy: 'no-cache',
    variables: {
      input: {
        order: getApiSort({
          property: 'title',
          direction: SortDirection.ASC,
        }),
        page: 1,
        pageSize: 10,
        where: {
          And: [
            ...(notIn?.length ? [{ id: { NotIn: notIn } }] : []),
            ...(searchValue ? [{ title: { ILike: searchValue } }] : []),
          ],
        },
      },
    },
  });

  const options = useMemo(() => {
    const d = data || previousData;
    if (!d?.featureGroupQuery?.findMany?.data) {
      return [];
    }

    return d.featureGroupQuery.findMany.data.map((it) => {
      const f = FeatureGroup.create(it)!;

      return {
        label: f.title,
        value: f.id,
        data: f,
      };
    });
  }, [data, previousData]);

  const createOptionValue = useMemo(() => {
    return Boolean(
      searchValue?.length &&
        !options?.find((it) => slugify(it.label) === slugify(searchValue)),
    )
      ? searchValue
      : '';
  }, [options, searchValue]);

  return (
    <>
      <Select
        disabled={loadingProp}
        loading={loadingProp}
        status={status}
        value={
          value
            ? [
                {
                  label: value.title,
                  value: value.id,
                  data: value,
                },
              ]
            : []
        }
        placeholder="Select feature"
        labelInValue
        mode="multiple"
        filterOption={false}
        style={{ width: '100%' }}
        onSearch={onSearch}
        searchValue={searchValue}
        onSelect={(_, { data }) => {
          onChange(data as IFeatureGroup);
        }}
        options={options}
        data-testid={dataTestId}
        dropdownRender={(menu) => (
          <>
            {!!createOptionValue && (
              <Button
                type="text"
                onClick={() => {
                  if (!loading) {
                    onSearch('');
                    onCreate(createOptionValue);
                  }
                }}
                block
                data-testid="create-feature-group-button"
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
