import { iconProps } from '@components/styles';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Button, Cascader, Divider, Select, Typography } from 'antd';
import { Fragment, useLayoutEffect, useMemo } from 'react';
import { MdClose } from 'react-icons/md';
import { UiFilter } from '@src/entity/UiFilter';

import { FilterValueControl } from '@src/layouts/table/components/Navigation/Filters/Conditions/ValueControl';
import { emptyFilter } from './options';

interface ICascaderOption {
  label: string;
  value: string;
  children: ICascaderOption[];
}

const mapCascadeOptions = (it: UiFilter.IUiFilter): ICascaderOption => {
  return {
    label: it.label,
    value: it.key,
    children: it.children?.length ? it.children?.map(mapCascadeOptions) : [],
  };
};

const findFilter = (
  keys: string[],
  filters: UiFilter.IUiFilter[] = [],
): UiFilter.IUiFilter | null => {
  const [key, ...rest] = keys;
  const filter = filters.find((it) => it.key === key);

  if (!filter) {
    return null;
  }

  if (rest.length) {
    if (!filter.children?.length) {
      return null;
    }

    return findFilter(rest, filter.children);
  }

  return filter;
};

export const FiltersControl = ({
  maxFilters = 10,
  options,
  value: records,
  onChange = () => {},
}: {
  options: UiFilter.IUiFilter[];
  value: UiFilter.IUiFilterValue[];
  onChange?: (filters: UiFilter.IUiFilterValue[]) => void;
  maxFilters?: number;
}) => {
  const cascaderOptions = useMemo(
    () => (options || []).map(mapCascadeOptions),
    [options],
  );

  const append = (filter: UiFilter.IUiFilterValue) => {
    onChange([...records, filter]);
  };

  const update = (idx: number, filter: UiFilter.IUiFilterValue) => {
    onChange(
      records.map((it, i) => {
        return i === idx ? filter : it;
      }),
    );
  };

  const remove = (idx: number) => {
    onChange(records.filter((_, i) => i !== idx));
  };

  useLayoutEffect(() => {
    if (!records.length) {
      append(emptyFilter);
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  const dropdownRender = (menus: React.ReactNode) => (
    <div
      css={css`
        min-height: 400px;

        & .ant-cascader-menu {
          min-height: 400px !important;
        }
      `}
    >
      {menus}
    </div>
  );

  return (
    <Flex direction="column">
      <Flex gap="1" direction="column">
        {records.map((valueRecord, idx) => {
          const condition = findFilter(valueRecord?.keyPath || [], options);
          const operators = condition?.operators || [];

          return (
            <Fragment key={`idx.${valueRecord.label}`}>
              <div
                css={css`
                  width: 100%;
                  display: grid;
                  grid-template-columns: 2fr 1fr 3fr;
                  gap: var(--x2);
                `}
              >
                <Cascader
                  dropdownRender={dropdownRender}
                  dropdownMenuColumnStyle={{
                    minWidth: 200,
                  }}
                  dropdownStyle={{
                    minWidth: 300,
                  }}
                  onClear={() => {
                    update(idx, emptyFilter);
                  }}
                  style={{ width: '100%' }}
                  value={valueRecord?.keyPath}
                  onChange={(keys: (string | number)[]) => {
                    const keyPath = [...(keys || [])] as string[];
                    const selectedFilter = findFilter(keyPath, options);

                    if (!selectedFilter?.payloadKey) {
                      return;
                    }

                    update(idx, {
                      entity: selectedFilter.entity,
                      label: selectedFilter.label,
                      operator: selectedFilter.operators[0],
                      type: selectedFilter.type,
                      keyPath: keyPath,
                      payloadKey: selectedFilter.payloadKey,
                      value: [],
                    });
                  }}
                  placeholder="Select filter"
                  options={cascaderOptions}
                />
                <Select
                  value={valueRecord?.operator}
                  onSelect={(operator) => {
                    update(idx, {
                      ...valueRecord,
                      operator: (operators || []).find(
                        (it) => it === operator,
                      )!,
                      value: [],
                    });
                  }}
                  disabled={!condition}
                  options={operators.map((it) => UiFilter.operators[it])}
                />

                <Flex gap="2">
                  <FilterValueControl
                    filter={condition}
                    value={valueRecord}
                    onChange={(value) => {
                      update(idx, {
                        ...valueRecord,
                        value,
                      });
                    }}
                  />
                  <Button
                    onClick={() => remove(idx)}
                    icon={<MdClose   />}
                    disabled={records?.length <= 1}
                  />
                </Flex>
              </div>
              {idx < records.length - 1 && <RowDivider />}
            </Fragment>
          );
        })}
        {records?.length < maxFilters && (
          <Box
            css={css`
              width: 100%;
              display: grid;
              grid-template-columns: 2fr 1fr 3fr;
              gap: var(--x2);
              margin-top: var(--x1);
            `}
          >
            <Button block onClick={() => append(emptyFilter)}>
              Add filter
            </Button>
          </Box>
        )}
      </Flex>
    </Flex>
  );
};

const RowDivider = () => {
  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: 2fr 4fr;
        align-items: center;
      `}
    >
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr 32px 1fr;
          grid-column-gap: var(--x2);
          align-items: center;
          text-align: center;
        `}
      >
        <Divider style={{ margin: 0 }} />
        <Typography.Text
          ellipsis
          type="secondary"
          css={css`
            font-size: 12px;
          `}
        >
          And
        </Typography.Text>
        <Divider style={{ margin: 0 }} />
      </div>
      <Divider style={{ margin: 0 }} />
    </div>
  );
};
