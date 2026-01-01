import { Flex } from '@components/utility/Flex';

import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Dropdown,
  Input,
  Tag,
  Typography,
} from 'antd';

import { MdArrowForward, MdClose, MdFilterList } from 'react-icons/md';
import { getIconProps } from '@components/styles';
import {
  ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { UiFilter } from '@src/entity/UiFilter';
import { IFiltersProps } from '@src/layouts/table/components/Navigation/Filters/Filters';
import { findFilter } from '@components/filters/UiFilterWidget/utils';
import {
  UiFilterFilterValueControl,
  UiFilterFilterValueControlProps,
} from '@components/filters/UiFilterWidget/UiFilterValueControl';
import { ISearchProps } from '@src/layouts/table/hooks/useSearch';
import { s } from './styles';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface IUiFilterWidgetProps {
  filtersProps: IFiltersProps;
  searchProps: ISearchProps;
}

export const UiFilterWidget = ({
  filtersProps,
  searchProps,
}: IUiFilterWidgetProps) => {
  const { onChange, options, value } = filtersProps;

  const [nestedOptions, setNestedOptions] = useState<UiFilter.IUiFilter[]>([]);
  const [open, setOpen] = useState(false);

  const update = useCallback(
    (idx: number, nextValue: UiFilter.IUiFilterValue) => {
      onChange([...value.slice(0, idx), nextValue, ...value.slice(idx + 1)]);
    },
    [value, onChange],
  );

  useEffect(() => {
    if (!open) {
      setNestedOptions([]);
    }
  }, [open]);

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

  const renderRow = (record: UiFilter.IUiFilter) => {
    return (
      <div
        css={s.row}
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
              entity: record.entity,
              label: record.label,
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
          <Button type="text" css={s.filterLabelButton}>
            {record.label}
            {!!record.children?.length && <MdArrowForward size={16} />}
          </Button>
        </div>
        <div>
          <Typography.Text type="secondary">
            {record.description}
          </Typography.Text>
        </div>
      </div>
    );
  };

  const renderFilterValue = useCallback(
    (props: {
      it: UiFilter.IUiFilterValue;
      idx: number;
      ValueControl?: ComponentType<UiFilterFilterValueControlProps>;
    }) => {
      const { ValueControl = UiFilterFilterValueControl, idx, it } = props;
      const condition = findFilter(it?.keyPath || [], options);

      const operatorButton = (
        <Button
          shape="round"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          {UiFilter.operators[it?.operator]?.literal ||
            'Internal. No operator!'}
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
              css={s.filterCloseBadge}
            >
              <MdClose />
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
            css={s.filterNode}
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div css={s.filterNodeLeft}>
              <Typography.Text ellipsis>{it.label}</Typography.Text>
            </div>
            <div css={s.filterNodeCenterWrapper}>
              <div css={s.filterNodeCenter}>
                {(condition?.operators || []).length > 1 ? (
                  <Dropdown
                    trigger={['click']}
                    menu={{
                      items: condition?.operators.map((it) => {
                        const op = UiFilter.operators[it];
                        return {
                          key: op.value,
                          icon: <Tag css={s.operatorTag}>{op.literal}</Tag>,
                          label: op.label,
                          onClick: () => {
                            update(idx, {
                              ...value[idx],
                              operator: it,
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
                className="value-tag"
                css={s.filterNodeRight}
              >
                <ValueControl
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
    [onChange, options, value, update],
  );

  return (
    <>
      <Flex gap="2" align="center" w="100%">
        <Dropdown
          trigger={['click']}
          dropdownRender={() => (
            <Card styles={s.cardStyles}>
              {!!nestedOptions?.length && (
                <Flex mb="4" gap="2" direction="column" pl="2">
                  <Typography.Text strong>
                    <FormattedMessage id={t('filters.widget.connections')} />
                  </Typography.Text>
                  <Breadcrumbs
                    options={nestedOptions}
                    setOptions={setNestedOptions}
                  />
                </Flex>
              )}
              <div>
                <Header />
                {properties.map(renderRow)}
              </div>
            </Card>
          )}
          menu={{
            mode: 'vertical',
            items: [],
          }}
          open={open}
          onOpenChange={(open) => {
            if (open) {
              return;
            }

            setOpen(false);
          }}
        >
          <div css={s.widgetContainer}>
            <Button
              onClick={() => setOpen(true)}
              icon={<MdFilterList {...getIconProps(16, 1)} />}
              disabled={!options?.length}
            >
              <FormattedMessage id={t('common.filter')} />
            </Button>
            {value.map((it, idx) => renderFilterValue({ it, idx }))}
            <Input
              css={s.searchInput}
              data-node-type="ui-filter-search"
              variant="borderless"
              placeholder={'Type to search...'}
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
          </div>
        </Dropdown>
      </Flex>
    </>
  );
};

function Header() {
  return (
    <div css={s.header} key="1">
      <div>
        <Typography.Text strong>
          <FormattedMessage id={t('common.name')} />
        </Typography.Text>
      </div>
      <div>
        <Typography.Text strong>
          <FormattedMessage id={t('common.description')} />
        </Typography.Text>
      </div>
    </div>
  );
}

function Breadcrumbs({
  options,
  setOptions,
}: {
  options: UiFilter.IUiFilter[];
  setOptions: (options: UiFilter.IUiFilter[]) => void;
}) {
  return (
    <Breadcrumb
      separator=""
      items={options.flatMap((it, idx) => {
        return [
          ...(idx > 0
            ? [
                {
                  type: 'separator' as const,
                  separator: <MdArrowForward {...getIconProps(14, 2)} />,
                },
              ]
            : []),
          {
            title: (
              <Tag
                closeIcon={<MdClose {...getIconProps(14, 3, 2)} />}
                closable
                onClose={() => {
                  setOptions(options.slice(0, idx));
                }}
                css={s.breadcrumbTag}
              >
                {it.label}
              </Tag>
            ),
          },
        ];
      })}
    />
  );
}
