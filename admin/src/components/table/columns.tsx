import { css } from '@emotion/react';
import { cropStringInTheMiddle } from '@src/utils/utils';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdCheck,
  MdClose,
  MdDragIndicator,
} from 'react-icons/md';
import { Avatar, Button, Dropdown, Tag, Typography } from 'antd';
import { TableImage } from '@components/table/image';
import { IMediaFile } from '@src/entity/MediaFile/MediaFile';
import { Flex } from '@components/utility/Flex';
import { ProductPrice } from '@modules/products/components/Price';
import { IProduct } from '@src/entity/Product/Product';
import { get } from 'lodash';
import dayjs from 'dayjs';
import { MiddleArrow } from '@modules/products/components/variants/Arrows';
import { sanitizeEntries } from '@src/entity/utils';
import { getCopyableCss, getCopyableProps } from '@components/utility/Copyable';
import { IconButton } from '@components/IconButton';
import {
  Columns,
  IColumnsProps,
} from '@src/layouts/table/components/Navigation/Columns';
import {
  ISortByProps,
  SortDirection,
  getTableDirection,
} from '@src/layouts/table/components/Navigation/SortBy';
import { ReactNode } from 'react';
import { IFeatureGroup } from '@src/entity/Feature/FeatureGroup';
import { IProductVariantOption } from '@src/entity/Product/Variant';
import { EntityStatus } from '@src/graphql';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const subtextCss = css`
  font-size: 13px;
  color: var(--color-gray-7);
  line-height: 1;
`;

export const EmptyColumnText = ({ children }: { children?: ReactNode }) => {
  return (
    <Typography.Text
      css={css`
        display: block;
        min-width: 80px;
      `}
      type="secondary"
    >
      {children || <FormattedMessage id={t('table.notSet')} />}
    </Typography.Text>
  );
};

export const NAColumnText = () => {
  return <EmptyColumnText>---</EmptyColumnText>;
};

export const StatusText = ({ status }: { status: EntityStatus }) => {
  const intl = useIntl();

  const getStatusKey = (status: EntityStatus): string => {
    switch (status) {
      case EntityStatus.Published:
        return 'common.status.published';
      case EntityStatus.Draft:
        return 'common.status.draft';
      case EntityStatus.Archived:
        return 'common.status.archived';
      default:
        return 'common.status.draft';
    }
  };

  return <>{intl.formatMessage({ id: getStatusKey(status) })}</>;
};

const NameCell = (props: {
  copyable?: boolean;
  optionsPath?: string;
  variantsPath?: string;
  coverPath?: string;
  titlePath?: string;
  record: any;
}) => {
  const {
    copyable,
    optionsPath,
    variantsPath,
    titlePath = 'title',
    coverPath,
    record,
  } = props;

  const intl = useIntl();

  const renderVariants = () => {
    if (!variantsPath) {
      return null;
    }

    const variants = get(record, variantsPath, []);
    if (!variants.length) {
      return null;
    }

    return (
      <Typography.Text type="secondary" css={subtextCss}>
        {intl.formatMessage(
          { id: t('product.variantsCount') },
          { count: variants.length },
        )}
      </Typography.Text>
    );
  };

  const renderOptions = () => {
    if (!optionsPath) {
      return null;
    }

    const options = get(record, optionsPath, []);
    if (!Array.isArray(options) || !options.length) {
      return null;
    }

    const opts = options
      ?.filter((it: IProductVariantOption) => {
        return it?.group?.title && it?.title;
      })
      .map((it: any) => cropStringInTheMiddle(it?.title, 10))
      .join(' ▸ ');

    return (
      <Typography.Text
        css={css`
          color: var(--color-gray-7);
          line-height: 1;
        `}
      >
        {opts}
      </Typography.Text>
    );
  };

  const title = get(record, titlePath, '');
  const noTitle = intl.formatMessage({ id: t('common.untitled') });
  const hasTitle = Boolean(String(title ?? '').trim());

  const renderCover = () => {
    if (!coverPath) {
      return null;
    }

    return <TableImage file={get(record, coverPath)} size={36} />;
  };

  const inner = (
    <Flex
      direction="column"
      title={title}
      css={css`
        cursor: pointer;
        height: 100%;
        justify-content: center;

        &:hover .title-column-text {
          text-decoration: underline;
        }
      `}
    >
      <Typography.Text
        css={css`
          display: block;
          max-width: 420px;
          padding-right: var(--x10);
        `}
        className="title-column-text"
        copyable={copyable ? getCopyableProps(title || '') : undefined}
        data-testid="title-column"
        title={title}
      >
        {hasTitle ? cropStringInTheMiddle(title, 80) : <em>{noTitle}</em>}
      </Typography.Text>
      {renderOptions()}
      {renderVariants()}
    </Flex>
  );

  if (coverPath) {
    return (
      <Flex align="center" gap="3">
        {renderCover()}
        {inner}
      </Flex>
    );
  }

  return inner;
};

export const getNameColumn = (
  props: {
    width?: number | string;
    copyable?: boolean;
    optionsPath?: string;
    variantsPath?: string;
    coverPath?: string;
    titlePath?: string;
    onClick?: (record: any) => void;
  } = {},
) => {
  const { width, onClick } = props;

  return {
    title: <FormattedMessage id={t('common.title')} />,
    dataIndex: 'title',
    key: 'title',
    ...(width ? { width } : {}),
    ...(onClick
      ? {
          onCell: (record: any) => ({
            onClick: () => {
              onClick?.(record);
            },
          }),
        }
      : {}),
    render: (_: string, record: any) => {
      return <NameCell record={record} {...props} />;
    },
  };
};

export const slugColumn = {
  title: <FormattedMessage id={t('common.slug')} />,
  dataIndex: 'slug',
  key: 'slug',
  render: (slug: string) => (
    <Typography.Text
      title={slug}
      ellipsis
      copyable={getCopyableProps(slug)}
      css={getCopyableCss()}
    >
      {cropStringInTheMiddle(slug, 10)}
    </Typography.Text>
  ),
};

export const statusColumn = ({
  align = 'left',
  width,
}: {
  width?: number;
  align?: 'center' | 'left' | 'right';
} = {}) => ({
  title: <FormattedMessage id={t('common.status')} />,
  dataIndex: 'status',
  key: 'status',
  ellipsis: true,
  ...(width ? { width } : {}),
  render: (maybeStatus: string, record: any) => {
    const status = maybeStatus || record?.status;

    if (!status) {
      return <NAColumnText />;
    }

    return (
      <div
        css={css`
          margin-left: ${align === 'right' ? 'auto' : 0};
          text-align: left;
        `}
      >
        <Tag
          style={{ minWidth: 70, textAlign: 'center', margin: 0 }}
          color={
            status === EntityStatus.Published
              ? 'green'
              : status === EntityStatus.Draft
              ? undefined
              : 'red'
          }
        >
          <StatusText status={status as EntityStatus} />
        </Tag>
      </div>
    );
  },
});

const getTagProps = (it: any) => {
  if (!it) {
    return null;
  }

  const title = it.title || it.name || it.slug;

  return {
    title,
    color: it.color || 'blue',
  };
};

export const renderGallery = ({
  files,
  size = 'default',
  maxCount = 3,
}: {
  files: (IMediaFile | null)[];
  size?: 'small' | 'large' | 'default';
  maxCount?: number;
}) => {
  return (
    <Avatar.Group maxCount={maxCount} size={size}>
      {files?.map((file, idx) => {
        return (
          <Avatar
            key={idx}
            src={file?.url || '/fallback-image.png'}
            css={css`
              &.ant-avatar {
                outline: 1px solid var(--color-gray-5) !important;
              }
            `}
          />
        );
      })}
    </Avatar.Group>
  );
};

export const renderOptions = ({
  options = [],
  max = 1,
  tags,
}: {
  options: any[];
  max?: number;
  tags?: boolean;
}) => {
  const shownOptions = options.slice(0, max);
  const otherCount = options.length - shownOptions.length;

  if (!shownOptions.length) {
    return (
      <EmptyColumnText>
        <FormattedMessage id={t('table.noItems')} />
      </EmptyColumnText>
    );
  }

  const items = sanitizeEntries(shownOptions.map((it) => getTagProps(it)));

  if (!items.length) {
    return (
      <EmptyColumnText>
        <FormattedMessage id={t('table.noItems')} />
      </EmptyColumnText>
    );
  }

  return (
    <Flex wrap="wrap" direction="column">
      <Flex {...(tags ? {} : { gap: '1' })} wrap="wrap">
        {items.map((it, idx) => {
          return tags ? (
            <Tag key={idx} color={it.color}>
              {cropStringInTheMiddle(it.title, 10)}
            </Tag>
          ) : (
            <Typography.Text key={idx} ellipsis title={it.title}>
              {cropStringInTheMiddle(it.title, 10)}
              {idx < items.length - 1 ? ', ' : ''}
            </Typography.Text>
          );
        })}
      </Flex>
      {!!otherCount && (
        <Typography.Text
          ellipsis
          css={css`
            font-size: 13px;
            color: var(--color-gray-7);
            line-height: 1;
          `}
        >
          <FormattedMessage
            id={t('common.andXMore')}
            values={{ count: otherCount }}
          />
        </Typography.Text>
      )}
    </Flex>
  );
};

export const getDateColumns = ({
  sortProps,
  sortKeys = {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  updated = true,
}: {
  sortProps?: ISortByProps;
  sortKeys?: {
    createdAt: string;
    updatedAt: string;
  };
  updated?: boolean;
} = {}) => {
  return [
    {
      ellipsis: true,
      title: <FormattedMessage id={t('table.createdAt')} />,
      width: 120,
      ...(sortProps ? getColumnSortProps(sortKeys.createdAt, sortProps) : {}),
      render: (date: Date) => {
        return (
          <Typography.Text
            css={css`
              font-size: 13px;
            `}
          >
            {date ? dayjs(date).format('MMM DD, YYYY') : ''}
          </Typography.Text>
        );
      },
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    ...(updated
      ? [
          {
            ellipsis: true,
            title: <FormattedMessage id={t('table.updatedAt')} />,
            width: 120,
            ...(sortProps
              ? getColumnSortProps(sortKeys.updatedAt, sortProps)
              : {}),
            render: (date: Date) => {
              return (
                <Typography.Text
                  css={css`
                    font-size: 13px;
                  `}
                >
                  {date ? dayjs(date).format('MMM DD, YYYY') : ''}
                </Typography.Text>
              );
            },
            dataIndex: 'updatedAt',
            key: 'updatedAt',
          },
        ]
      : []),
  ];
};

export const getSlugColumn = (props: { maxLength?: number } = {}) => {
  const { maxLength } = props;

  return {
    title: <FormattedMessage id={t('common.slug')} />,
    dataIndex: 'slug',
    key: 'slug',
    render: (slug: string) => (
      <Typography.Text>
        {cropStringInTheMiddle(slug, maxLength)}
      </Typography.Text>
    ),
  };
};

export const getUrlEnabledColumn = () => {
  return {
    title: <FormattedMessage id={t('common.url')} />,
    dataIndex: 'urlEnabled',
    key: 'urlEnabled',
    render: (urlEnabled: boolean) => (
      <Button
        color={urlEnabled ? 'success' : 'secondary'}
        icon={urlEnabled ? <MdCheck size={16} /> : <MdClose size={16} />}
      />
    ),
  };
};

export const getCoverColumn = ({ dataIndex = 'cover' } = {}) => {
  return {
    render: (_: IMediaFile, record: any) => (
      <TableImage file={get(record, dataIndex)} size={36} />
    ),
    title: <FormattedMessage id={t('common.cover')} />,
    dataIndex,
    key: 'cover',
    width: 50,
  };
};

export const productCoverColumn = {
  title: <FormattedMessage id={t('common.cover')} />,
  dataIndex: 'cover',
  key: 'cover',
  width: 50,
  render: (cover: IMediaFile, record: IProduct) => {
    return record.isVariant ? (
      <Flex h="36px" align="center" w="36px" gap="1">
        <MiddleArrow isFinal={record.isLastVariant} />
        <TableImage file={cover} size={24} name="variant" />
      </Flex>
    ) : (
      <TableImage file={cover} name="variant" size={36} />
    );
  },
};

export const dragIndicatorColumn = {
  key: 'drag',
  width: 40,
  render: () => (
    <Flex
      align="center"
      justify="center"
      px="1"
      css={css`
        min-width: 24px;
        cursor: move;
      `}
    >
      <MdDragIndicator color="var(--color-gray-8)" />
    </Flex>
  ),
};

export const priceColumn = {
  key: 'price',
  dataIndex: 'price',
  title: <FormattedMessage id={t('common.price')} />,
  render: (_: any, record: IProduct) => {
    if (record.variants?.length) {
      return null;
    }

    return <ProductPrice data={record} />;
  },
};

export const getProductPriceColumn = (
  key: 'price' | 'oldPrice' | 'costPrice',
  title: ReactNode,
) => ({
  key,
  dataIndex: key,
  title,
  render: (_: any, record: IProduct) => {
    if (record.variants?.length) {
      const min = Math.min(...record.variants.map((it) => it[key]));
      const max = Math.max(...record.variants.map((it) => it[key]));
      return (
        <Flex gap="1">
          <ProductPrice data={{ price: min }} />
          •
          <ProductPrice data={{ price: max }} />
        </Flex>
      );
    }

    return (
      <div style={{ minWidth: 80 }}>
        <ProductPrice data={{ price: record[key] }} />
      </div>
    );
  },
});

export const getProductVariantPriceColumn = (
  key: 'price' | 'oldPrice' | 'costPrice',
  title: ReactNode,
) => ({
  key,
  dataIndex: key,
  title,
  render: (_: any, record: IProduct) => {
    return (
      <div style={{ minWidth: 80 }}>
        <ProductPrice data={{ price: record[key] }} />
      </div>
    );
  },
});

export const productPriceColumn = getProductPriceColumn(
  'price',
  <FormattedMessage id={t('common.price')} />,
);

export const productOldPriceColumn = getProductPriceColumn(
  'oldPrice',
  <FormattedMessage id={t('common.oldPrice')} />,
);

export const productCostPriceColumn = getProductPriceColumn(
  'costPrice',
  <FormattedMessage id={t('common.costPrice')} />,
);

export const actionsColumn = <T,>({
  onEdit,
  onDelete,
  skipCheck,
  settings,
  items = [],
}: {
  onDelete?: (record: T, idx: number) => void;
  onEdit?: (record: T, idx: number) => void;
  skipCheck?: (record: T, idx: number) => boolean;
  settings?: IColumnsProps;
  items?: {
    onClick: (entity: T) => void;
    key: string;
    label: ReactNode;
  }[];
}) => ({
  title: settings ? <Columns {...settings} /> : null,
  key: 'actions',
  align: 'right' as const,
  width: 40,
  render: (_: any, record: any, idx: number) => {
    if (skipCheck && skipCheck(record, idx)) {
      return null;
    }

    return (
      <Dropdown
        trigger={['click']}
        menu={{
          onClick: ({ domEvent }) => {
            domEvent.stopPropagation();
          },
          items: [
            ...(onEdit
              ? [
                  {
                    key: 'edit',
                    label: (
                      <FormattedMessage id={t('table.actions.editThisItem')} />
                    ),
                    onClick: () => {
                      onEdit(record, idx);
                    },
                  },
                ]
              : []),
            ...(onDelete
              ? [
                  {
                    key: 'delete',
                    label: (
                      <FormattedMessage
                        id={t('table.actions.deleteThisItem')}
                      />
                    ),
                    onClick: () => {
                      onDelete(record, idx);
                    },
                  },
                ]
              : []),
            ...items.map((it) => ({
              key: it.key,
              label: it.label,
              onClick: () => {
                it.onClick(record);
              },
            })),
          ],
        }}
      >
        <IconButton
          icon="menu"
          shape="default"
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      </Dropdown>
    );
  },
});

export const idColumn = {
  key: 'id',
  title: <FormattedMessage id={t('common.id')} />,
  dataIndex: 'id',
  width: 60,
};

export const productIdColumn = {
  key: 'id',
  title: <FormattedMessage id={t('common.id')} />,
  dataIndex: 'id',
  width: 60,
  render: (id: number, record: IProduct) => {
    if (record.isVariant) {
      return null;
    }

    return id;
  },
};

export const featureIdColumn = {
  key: 'id',
  title: <FormattedMessage id={t('common.id')} />,
  dataIndex: 'id',
  width: 60,
  render: (id: number, record: IFeatureGroup) => {
    if (record.isFeature) {
      return null;
    }

    return id;
  },
};

export const expandColumn = {
  fixed: 'left' as const,
  key: 'expand',
  title: '',
  align: 'center' as const,
  width: 40,
  render: () => null,
  onCell: () => ({
    style: {
      padding: 0,
    },
  }),
};

export const getColumnSortProps = (key: string, sortProps: ISortByProps) => {
  return {
    sorter: true,
    sortIcon: ({ sortOrder }: { sortOrder: 'ascend' | 'descend' | null }) => {
      const isAsc = sortOrder === 'ascend';
      const isDesc = sortOrder === 'descend';

      if (isAsc) {
        return <MdArrowUpward size={16} />;
      }

      if (isDesc) {
        return <MdArrowDownward size={16} />;
      }

      return (
        <MdArrowUpward
          size={16}
          css={css`
            opacity: 0;

            .ant-table-cell:hover & {
              opacity: 0.4;
            }
          `}
        />
      );
    },
    sortOrder: getTableDirection(key, sortProps.value),
    SortDirections: ['ascend', 'descend'],
    onHeaderCell: (column: any) => ({
      onClick: () => {
        if (column.sortOrder === null) {
          sortProps.onChange({
            property: key,
            direction: SortDirection.ASC,
          });
        } else if (column.sortOrder === 'ascend') {
          sortProps.onChange({
            property: key,
            direction: SortDirection.DESC,
          });
        } else {
          sortProps.reset();
        }
      },
    }),
  };
};

export const inactiveCheckboxProps = {
  disabled: true,
  style: {
    display: 'none',
  },
};

export const getGalleryColumn = (gallery: IMediaFile[]) => {
  if (!gallery.length) {
    return (
      <EmptyColumnText>
        <FormattedMessage id={t('table.noItems')} />
      </EmptyColumnText>
    );
  }

  return (
    <Avatar.Group max={{ count: 3 }} shape="square">
      {gallery.map((file: IMediaFile, idx: number) => (
        <Avatar key={idx} src={file.url} />
      ))}
    </Avatar.Group>
  );
};
