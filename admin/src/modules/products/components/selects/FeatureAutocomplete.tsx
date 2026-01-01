import { useQuery } from '@apollo/client';
import { slugify } from '@components/forms/slug/slugify';
import { css } from '@emotion/react';
import { Feature, IFeature } from '@src/entity/Feature/Feature';
import { ApiFeatureQueryFindManyArgs, ApiQuery } from '@src/graphql';
import { useSearch } from '@src/hooks/useSearch';
import {
  getApiSort,
  SortDirection,
} from '@src/layouts/table/components/Navigation/SortBy';
import { Button, Divider, Select, Spin, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Flex } from '@components/utility/Flex';
import { FeatureQueryFindMany } from '@modules/features/graphql/findMany';

interface IFeatureSelectProps {
  onCreate: (title: string) => Promise<void>;
  onChange: (value: IFeature) => void;
  value: IFeature | null;
  status?: 'error' | undefined;
  notIn?: ID[];
  loading?: boolean;
  groupId?: string;
  'data-testid'?: string;
}

export const FeatureAutocomplete = ({
  groupId,
  onChange,
  value,
  status,
  notIn,
  onCreate,
  loading: loadingProp,
  'data-testid': dataTestId,
}: IFeatureSelectProps) => {
  const [open, setOpen] = useState(false);
  const { onSearch, searchValue } = useSearch();

  const { data, loading, previousData } = useQuery<
    ApiQuery,
    ApiFeatureQueryFindManyArgs
  >(FeatureQueryFindMany, {
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
            {
              groupId: {
                Eq: groupId,
              },
            },
            ...(notIn?.length
              ? [
                  {
                    id: {
                      NotIn: notIn,
                    },
                  },
                ]
              : []),
            ...(searchValue
              ? [
                  {
                    title: {
                      ILike: searchValue,
                    },
                  },
                ]
              : []),
          ],
        },
      },
    },
  });

  const options = useMemo(() => {
    const d = data || previousData;
    if (!d?.featureQuery?.findMany?.data) {
      return [];
    }

    return d.featureQuery.findMany.data.map((it) => {
      const f = Feature.create(it)!;

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
                  if (!loading) {
                    onSearch('');
                    onCreate(createOptionValue);
                    setOpen(false);
                  }
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
            {loading && false ? (
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
