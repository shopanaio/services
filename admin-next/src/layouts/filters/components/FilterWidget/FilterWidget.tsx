'use client';

import { useCallback, useMemo, useState } from 'react';
import { Flex, Badge, Button, Card, Dropdown, Input, Tag, Typography } from 'antd';
import { FilterOutlined, RightOutlined, CloseOutlined } from '@ant-design/icons';
import { IFilterSchema, IFilterValue } from '../../core/types';
import { operatorsMeta } from '../../core/operators';
import { findFilter } from '../../utils/findFilter';
import { FilterValueControl } from './FilterValueControl';
import { useStyles, cardBodyStyle } from './styles';

export interface IFilterWidgetSearchProps {
  searchValue: string;
  onChangeSearchValue: (value: string) => void;
}

export interface IFilterWidgetProps {
  /** Available filter schemas */
  options: IFilterSchema[];
  /** Current filter values */
  value: IFilterValue[];
  /** Callback when filters change */
  onChange: (value: IFilterValue[]) => void;
  /** Search props (optional) */
  searchProps?: IFilterWidgetSearchProps;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Label for filter button */
  filterButtonLabel?: string;
}

export const FilterWidget = ({
  options,
  value,
  onChange,
  searchProps,
  searchPlaceholder = 'Type to search...',
  filterButtonLabel = 'Filter',
}: IFilterWidgetProps) => {
  const { styles } = useStyles();
  const [nestedOptions, setNestedOptions] = useState<IFilterSchema[]>([]);
  const [open, setOpen] = useState(false);

  const update = useCallback(
    (idx: number, nextValue: IFilterValue) => {
      onChange([...value.slice(0, idx), nextValue, ...value.slice(idx + 1)]);
    },
    [value, onChange],
  );


  // Get current options based on nested path
  const properties = useMemo(() => {
    const opts = nestedOptions?.length
      ? nestedOptions.at(-1)?.children || []
      : options;

    return [...opts].sort((a, b) => {
      if (typeof a.label === 'string' && typeof b.label === 'string') {
        return a.label.localeCompare(b.label);
      }
      return 0;
    });
  }, [options, nestedOptions]);

  // Render a filter option row
  const renderRow = (record: IFilterSchema) => {
    return (
      <div
        className={styles.row}
        key={record.key}
        onClick={() => {
          if (record.children?.length) {
            setNestedOptions([...nestedOptions, record]);
            return;
          }

          setOpen(false);
          onChange([
            ...value,
            {
              schemaKey: record.key,
              entity: record.entity,
              label: typeof record.label === 'string' ? record.label : record.key,
              operator: record.operators[0],
              type: record.type,
              keyPath: nestedOptions?.length
                ? [...nestedOptions.map((it) => it.key), record.key]
                : [record.key],
              payloadKey: record.payloadKey,
              value: [],
            },
          ]);
        }}
      >
        <div>
          <Button type="text" className={styles.filterLabelButton}>
            {record.label}
            {!!record.children?.length && <RightOutlined style={{ fontSize: 16 }} />}
          </Button>
        </div>
        <div>
          <Typography.Text type="secondary">{record.description}</Typography.Text>
        </div>
      </div>
    );
  };

  // Render an active filter value
  const renderFilterValue = useCallback(
    (props: { it: IFilterValue; idx: number }) => {
      const { idx, it } = props;
      const condition = findFilter(it?.keyPath || [], options);

      const operatorButton = (
        <Button
          shape="round"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {operatorsMeta[it?.operator]?.literal || '?'}
        </Button>
      );

      return (
        <Badge
          key={it.payloadKey || idx}
          data-node-type="ui-filter-close-badge"
          count={
            <div
              onClick={() => {
                const searchInput = document?.querySelector(
                  'input[data-node-type="ui-filter-search"]',
                ) as HTMLInputElement;

                searchInput?.focus();
                onChange(value.filter((_, i) => i !== idx));
              }}
              role="button"
              data-remove-tag
              className={styles.filterCloseBadge}
            >
              <CloseOutlined />
            </div>
          }
        >
          <div
            data-node-type="ui-filter-tag"
            onKeyDown={(e) => {
              if (e.currentTarget === e.target && e.key === 'Backspace') {
                const searchInput = document?.querySelector(
                  'input[data-node-type="ui-filter-search"]',
                ) as HTMLInputElement;

                searchInput?.focus();
                onChange(value.filter((_, i) => i !== idx));
              }
            }}
            role="button"
            className={styles.filterNode}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className={styles.filterNodeLeft}>
              <Typography.Text ellipsis>{it.label}</Typography.Text>
            </div>
            <div className={styles.filterNodeCenterWrapper}>
              <div className={styles.filterNodeCenter}>
                {(condition?.operators || []).length > 1 ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: condition?.operators.map((op) => {
                        const opMeta = operatorsMeta[op];
                        return {
                          key: opMeta.value,
                          icon: <Tag className={styles.operatorTag}>{opMeta.literal}</Tag>,
                          label: opMeta.label,
                          onClick: () => {
                            update(idx, {
                              ...value[idx],
                              operator: op,
                            });
                          },
                        };
                      }),
                    }}
                  >
                    {operatorButton}
                  </Dropdown>
                ) : (
                  operatorButton
                )}
              </div>
              <div
                data-value-node
                className={`value-tag ${styles.filterNodeRight}`}
              >
                <FilterValueControl
                  filter={condition}
                  value={it}
                  onChange={(nextValue) => {
                    update(idx, {
                      ...value[idx],
                      value: nextValue,
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </Badge>
      );
    },
    [onChange, options, value, update, styles],
  );

  return (
    <>
      <Flex gap="small" align="center" style={{ width: '100%' }}>
        <Dropdown
          trigger={['click']}
          dropdownRender={() => (
            <Card styles={{ body: cardBodyStyle }}>
              {!!nestedOptions?.length && (
                <Flex style={{ marginBottom: 'var(--x4)', paddingLeft: 'var(--x2)' }} gap="small" vertical>
                  <Typography.Text strong>Connections</Typography.Text>
                  <Flex gap="small" wrap>
                    {nestedOptions.map((it, idx) => (
                      <Tag
                        key={it.key}
                        closeIcon={<CloseOutlined />}
                        closable
                        onClose={() => {
                          setNestedOptions(nestedOptions.slice(0, idx));
                        }}
                        className={styles.breadcrumbTag}
                      >
                        {it.label}
                      </Tag>
                    ))}
                  </Flex>
                </Flex>
              )}
              <div>
                <div className={styles.header}>
                  <div>
                    <Typography.Text strong>Name</Typography.Text>
                  </div>
                  <div>
                    <Typography.Text strong>Description</Typography.Text>
                  </div>
                </div>
                {properties.map(renderRow)}
              </div>
            </Card>
          )}
          menu={{
            mode: 'vertical',
            items: [],
          }}
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) {
              return;
            }
            setOpen(false);
            setNestedOptions([]);
          }}
        >
          <div className={styles.widgetContainer}>
            <Button
              onClick={() => setOpen(true)}
              icon={<FilterOutlined />}
              disabled={!options?.length}
            >
              {filterButtonLabel}
            </Button>
            {value.map((it, idx) => renderFilterValue({ it, idx }))}
            {searchProps && (
              <Input
                className={styles.searchInput}
                data-node-type="ui-filter-search"
                variant="borderless"
                placeholder={searchPlaceholder}
                value={searchProps.searchValue}
                onChange={({ target }) => {
                  searchProps.onChangeSearchValue(target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !searchProps.searchValue) {
                    const prevNode = e.currentTarget
                      .previousElementSibling as HTMLElement;

                    if (prevNode?.dataset?.nodeType === 'ui-filter-close-badge') {
                      prevNode
                        ?.querySelector<HTMLElement>('[data-filter-node]')
                        ?.focus();
                    }
                  }
                }}
              />
            )}
          </div>
        </Dropdown>
      </Flex>
    </>
  );
};
