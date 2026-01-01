import {
  actionsColumn,
  getDateColumns,
  renderOptions,
  slugColumn,
  statusColumn,
  getColumnSortProps,
  EmptyColumnText,
  getProductPriceColumn,
  getGalleryColumn,
} from '@components/table/columns';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';
import {
  IProductTableData,
  useProducts,
} from '@modules/products/hooks/useProducts';
import { IProduct } from '@src/entity/Product/Product';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { ColumnsType } from 'antd/es/table';
import { DrawerTypes } from '@src/layouts/drawers/types';
import {
  cropString,
  idNotEqual,
  mapEntryId,
  transformColumns,
} from '@src/utils/utils';
// import { Entity } from '@src/defs/entities';
import {
  useProductDelete,
  useProductsDeleteMany,
} from '@hooks/useProductDelete';
import { Button, Tag, Typography } from 'antd';
import { css } from '@emotion/react';
import { useMemo } from 'react';
import { sanitizeEntries } from '@src/entity/utils';
import { ExpandButton } from '@components/table/ExpandableIcon';
import { ITag } from '@src/entity/Tag/Tag';
import { ICategory } from '@src/entity/Category/Category';
import {
  StockStatuses,
  stockStatuses,
  stockStatusMessageIds,
} from '@src/defs/constants';
import { productColumns } from '@modules/products/defs';
import { MdOutlineFileUpload } from 'react-icons/md';
import { getIconProps } from '@components/styles';
import { routes } from '@modules/router/routes';
import { getCopyableCss, getCopyableProps } from '@components/utility/Copyable';
import { useCreateProduct } from '@modules/products/hooks/useCreateProduct';
import { MiddleArrow } from '@modules/products/components/variants/Arrows';
import { TableImage } from '@components/table/image';
import { Flex } from '@components/utility/Flex';
import { get } from 'lodash';
import { IProductVariantOption } from '@src/entity/Product/Variant';

const ProductsView = () => {
  const { formatMessage } = useIntl();
  const { products, loading, navigation, meta } = useProducts();
  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;
  const { createProduct } = useCreateProduct();

  const selectedVariantsIds = useMemo(() => {
    return sanitizeEntries(
      selectedRows
        .filter((it: IProduct) => it?.variants?.length > 0)
        .flatMap((it: IProduct) => it.variants.map(mapEntryId)),
    );
  }, [selectedRows]);

  const { deleteProduct } = useProductDelete();
  const { deleteManyProducts } = useProductsDeleteMany();

  const columns: ColumnsType<any> = [
    {
      fixed: 'left' as const,
      key: 'expand',
      title: '',
      align: 'center',
      width: 40,
      render: () => null,
      onCell: () => ({
        style: {
          padding: 0,
        },
      }),
    },
    {
      width: productColumns.title.width,
      key: productColumns.title.key,
      title: productColumns.title.label,
      ...getColumnSortProps('title', navigation.sortProps),
      onCell: (record: IProductTableData) => ({
        onClick: () => {
          $drawers.addDrawer(
            record.isRoot
              ? {
                  entityId: record.container?.id,
                  type: DrawerTypes.PRODUCT,
                }
              : {
                  entityId: record.id,
                  type: DrawerTypes.PRODUCT_VARIANT,
                  meta: {
                    formValues: {
                      id: record.container?.id,
                    },
                  },
                },
          );
        },
      }),
      render: (_: string, record) => {
        const renderOptions = () => {
          const options = get(record, 'options', []);
          if (!Array.isArray(options) || !options.length) {
            return null;
          }

          const opts = options
            ?.filter((it: IProductVariantOption) => {
              return it?.group?.title && it?.title;
            })
            .map((it: any) => cropString(it?.title, 10))
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

        const title = get(record.isRoot ? record.container : record, 'title');

        return (
          <Flex gap="3" align="center">
            {record.isRoot ? (
              <TableImage file={record.cover} name="variant" size={36} />
            ) : (
              <Flex h="36px" align="center" w="36px" gap="1">
                <MiddleArrow isFinal={record.isLastVariant} />
                <TableImage file={record.cover} size={24} name="variant" />
              </Flex>
            )}
            <Flex
              direction="column"
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
                data-testid="title-column"
                title={title}
              >
                {title ? (
                  cropString(title, 80)
                ) : (
                  <em>{formatMessage({ id: 'common.untitled' })}</em>
                )}
              </Typography.Text>
              {renderOptions()}
            </Flex>
          </Flex>
        );
      },
    },
    {
      ...statusColumn(),
      width: productColumns.status.width,
      ...getColumnSortProps('variantStatus', navigation.sortProps),
    },
    {
      width: productColumns.price.width,
      ...getProductPriceColumn('price', 'Price'),
      ...getColumnSortProps('variantPrice', navigation.sortProps),
      key: productColumns.price.key,
      title: productColumns.price.label,
    },
    {
      width: productColumns.oldPrice.width,
      ...getProductPriceColumn('oldPrice', 'Old price'),
      ...getColumnSortProps('variantOldPrice', navigation.sortProps),
      key: productColumns.oldPrice.key,
      title: productColumns.oldPrice.label,
    },
    {
      width: productColumns.costPrice.width,
      ...getProductPriceColumn('costPrice', 'Cost price'),
      ...getColumnSortProps('variantCostPrice', navigation.sortProps),
      key: productColumns.costPrice.key,
      title: productColumns.costPrice.label,
    },
    {
      key: productColumns.sku.key,
      title: productColumns.sku.label,
      dataIndex: 'sku',
      width: productColumns.sku.width,
      ...getColumnSortProps('variantSku', navigation.sortProps),
      render: (value: string) => {
        return value ? (
          <Typography.Text
            title={value}
            ellipsis
            copyable={getCopyableProps(value)}
            css={getCopyableCss()}
          >
            {cropString(value, 15)}
          </Typography.Text>
        ) : (
          <EmptyColumnText />
        );
      },
    },
    {
      key: productColumns.stockStatus.key,
      title: productColumns.stockStatus.label,
      dataIndex: 'stockStatus',
      width: productColumns.stockStatus.width,
      ...getColumnSortProps('variantStockStatus', navigation.sortProps),
      render: (value: StockStatuses) => {
        if (!value) {
          return <EmptyColumnText />;
        }

        if (!stockStatuses[value]) {
          return (
            <EmptyColumnText>
              {formatMessage({
                id: t('products.stockStatus.unknownStatus'),
              })}
            </EmptyColumnText>
          );
        }

        return (
          <Tag color={stockStatuses[value].color}>
            {formatMessage({ id: stockStatusMessageIds[value] })}
          </Tag>
        );
      },
    },
    {
      key: productColumns.gallery.key,
      title: productColumns.gallery.label,
      width: productColumns.gallery.width,
      render: (_: any, record) => {
        return getGalleryColumn(record.gallery || []);
      },
    },
    {
      key: productColumns.categories.key,
      title: productColumns.categories.label,
      dataIndex: 'categories',
      width: productColumns.categories.width,
      render: (_: ICategory[], record: IProductTableData) => {
        const { primaryCategory, categories } = record.container || {};
        const options = primaryCategory?.title
          ? [
              primaryCategory,
              ...((categories || []) as any[]).filter(
                idNotEqual(primaryCategory.id),
              ),
            ]
          : ((categories || []) as any[]);
        return renderOptions({ options });
      },
    },
    {
      key: productColumns.tags.key,
      title: productColumns.tags.label,
      dataIndex: 'tags',
      width: productColumns.tags.width,
      render: (_: ITag[], record) => {
        return renderOptions({
          options: record.container.tags,
        });
      },
    },
    {
      ...slugColumn,
      width: productColumns.slug.width,
      ...getColumnSortProps('variantSlug', navigation.sortProps),
    },
    ...getDateColumns({
      sortProps: navigation.sortProps,
      sortKeys: {
        createdAt: 'variantCreatedAt',
        updatedAt: 'variantUpdatedAt',
      },
    }),
    {
      ...actionsColumn({
        skipCheck: (record: IProductTableData) => !record.isRoot,
        settings: navigation.columnsProps,
        onEdit: ({ id }: IProductTableData) => {
          $drawers.addDrawer({
            entityId: id,
            type: DrawerTypes.PRODUCT,
          });
        },
        onDelete: ({ id }) => {
          deleteProduct(id);
        },
      }),
      fixed: 'right' as const,
    },
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

  const scrollX = activeColumns.reduce((acc, it) => {
    const option = productColumns?.[it.key as keyof typeof productColumns];
    if (!option) {
      return acc;
    }

    return option.isFixed ? acc : acc + (option?.width || 0) * 1.5;
  }, 0);

  return (
    <TableLayout
      name="products"
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        onChangePageSize: navigation.paginationProps.setPageSize,
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
      }}
      tableProps={{
        // notFoundElementProps: { TODO: make api to check if products exist
        //   title: "You don't have any products yet.",
        //   subtitle: 'Create your first product to start selling.',
        // },
        layout: 'fixed',
        rowKey: 'id',
        sticky: true,
        scroll: { x: scrollX },
        loading,
        selectedRows,
        onChangeSelectedRows,
        getCheckboxProps: (record: IProductTableData) => {
          const { isRoot } = record;

          if (!isRoot) {
            return {
              disabled: true,
              style: {
                display: 'none',
              },
            };
          }

          return {};
        },
        columns: activeColumns,
        data: products,
        sortDirections: ['ascend', 'descend'],
        showSorterTooltip: false,
        expandable: {
          indentSize: 0,
          columnWidth: 40,
          fixed: 'left',
          childrenColumnName: 'variants',
          rowExpandable: (record: IProductTableData) =>
            record?.variants?.length > 0,
          expandIcon: ({ record, expanded, onExpand }) => {
            if (!record.isRoot) {
              return null;
            }

            return (
              <ExpandButton
                expanded={expanded}
                onClick={(e) => onExpand(record, e)}
                disabled={!record?.variants?.length}
              />
            );
          },
        },
        // @ts-expect-error ...
        css: selectedVariantsIds.map((id) => {
          return css`
            [data-row-key='${id}'] .ant-table-cell {
              background-color: var(--color-gray-1);

              &.ant-table-cell-row-hover {
                background-color: var(--color-gray-1);
              }
            }
          `;
        }),
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          onDelete: (ids: ID[]) => {
            void deleteManyProducts(ids);
          },
        },
      }}
      headerProps={{
        extra: (
          <Button
            icon={<MdOutlineFileUpload {...getIconProps(16)} />}
            onClick={() => {
              window.open(routes.csv.link, '_blank');
            }}
          >
            {formatMessage({ id: t('products.importCsv') })}
          </Button>
        ),
        title: formatMessage({ id: 'sidebar.menu_item.products' }),
        count: meta.total,
        create: async () => {
          const id = await createProduct();
          if (id) {
            $drawers.addDrawer({
              entityId: id,
              type: DrawerTypes.PRODUCT,
            });
          }
        },
      }}
    />
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default function Products() {
  return <ProductsView />;
}
