import {
  expandColumn,
  inactiveCheckboxProps,
  getColumnSortProps,
  getNameColumn,
  productCoverColumn,
} from '@components/table/columns';
import { useBrowseProducts } from '@modules/products/hooks/useBrowseProducts';
import { TableModal } from '@src/layouts/table/components/TableModal';
import { ColumnsType } from 'antd/es/table';
import { IProduct } from '@src/entity/Product/Product';
import { useMemo } from 'react';
import { css } from '@emotion/react';
import { ExpandButton } from '@components/table/ExpandableIcon';
import { Checkbox, CheckboxProps } from 'antd';
import { differenceBy } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';
import { IProductVariant } from '@src/entity/Product/Variant';

const equalById = (a: any) => (b: any) => a.id === b.id;
const notEqualById = (a: any) => (b: any) => a.id !== b.id;

interface IBrowseProductsProps<T extends IProduct | IProductVariant> {
  onChange: (value: T[]) => void;
  value: T[];
  open: boolean;
  onClose: () => void;
}

export const BrowseCategoriesProducts = <
  T extends IProduct | IProductVariant = IProduct,
>({
  onChange,
  value,
  open,
  onClose,
}: IBrowseProductsProps<T>) => {
  const {
    options: products,
    loading,
    navigation,
    meta,
  } = useBrowseProducts({
    isActive: open,
    selectedRows: value,
    multiple: true,
  });

  const { selectedRowsProps, sortProps } = navigation;
  const { selectedRows, setSelectedRows } = selectedRowsProps;

  const columns: ColumnsType<IProduct> = [
    expandColumn,
    {
      ...getNameColumn({
        optionsPath: 'options',
        coverPath: 'cover',
      }),
      ...getColumnSortProps('title', sortProps),
    },
  ];

  const selectedRowsWithVariantsIds = useMemo(() => {
    const rows = [] as string[];

    products.forEach((product: IProduct) => {
      const hasSelectedVariant = product.variantId
        ? selectedRows.some(equalById({ id: product.variantId }))
        : product?.variants?.some((it) => selectedRows.some(equalById(it)));

      if (hasSelectedVariant) {
        rows.push(product.id);
      }
    });

    return rows;
  }, [selectedRows, products]);

  const inactiveRowsIds = useMemo(() => {
    const rows = [] as string[];

    products.forEach((product: IProduct) => {
      product.variants.forEach((variant) => {
        if (!variant.inListing) {
          rows.push(variant.id);
        }
      });
    });

    return rows;
  }, [products]);

  const getCheckboxProps = (record: IProduct) => {
    const { isVariant, embedVariant } = record;

    const isContainer = !isVariant;

    if (isContainer) {
      if (embedVariant?.id) {
        const disabled = value.some(equalById(embedVariant));
        const checked = selectedRows.some(equalById(embedVariant));

        return {
          checked,
          disabled,
          onChange: () => {
            if (checked) {
              const next = selectedRows.filter(notEqualById(embedVariant));
              setSelectedRows(next);
            } else {
              setSelectedRows([...selectedRows, record.embedVariant]);
            }
          },
        };
      }

      const disabled = value.some((it) => record.variants.some(equalById(it)));

      const selectedVariants = record.variants.filter((it) =>
        selectedRows.some(equalById(it)),
      );

      const checked = selectedVariants.length === record.variants.length;
      const indeterminate =
        selectedVariants.length > 0 &&
        selectedVariants.length < record.variants.length;

      return {
        checked,
        indeterminate,
        disabled,
        onChange: () => {
          if (indeterminate) {
            setSelectedRows(
              selectedRows.concat(
                record.variants.filter(
                  (selected) => !selectedVariants.some(equalById(selected)),
                ),
              ),
            );
          } else if (checked) {
            const next = selectedRows.filter(
              (it) => !record.variants.some(equalById(it)),
            );

            setSelectedRows(next);
          } else {
            setSelectedRows(selectedRows.concat(record.variants));
          }
        },
      };
    } else {
      return inactiveCheckboxProps;
    }
  };

  return (
    <TableModal
      modalType="browse-products"
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        page: meta.page,
        pageSize: 50,
        total: meta.total,
      }}
      onCancel={onClose}
      onOk={() => {
        const diff = differenceBy(selectedRows, value, 'id');
        onChange(diff);
        onClose();
      }}
      open={open}
      title={<FormattedMessage id={t('category.browseProducts.title')} />}
      loading={loading}
      tableProps={{
        rowSelection: {
          hideSelectAll: true,
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedRows.map((it) => {
            return it.id;
          }),
          columnWidth: 50,
          renderCell: (value: boolean, record: IProduct) => {
            const props = {
              ...getCheckboxProps?.(record),
              'data-testid': 'table-row-checkbox',
            } as CheckboxProps & { 'data-testid': string };

            return <Checkbox key={record.id} {...props} />;
          },
        },

        // @ts-expect-error ...
        css: [
          ...selectedRowsWithVariantsIds.map((id) => {
            return css`
              [data-row-key='${id}'] .ant-table-cell {
                background-color: var(--color-gray-3);

                &.ant-table-cell-row-hover {
                  background-color: var(--color-gray-3);
                }
              }
            `;
          }),
          ...inactiveRowsIds.map((id) => {
            return css`
              [data-row-key='${id}'] {
                opacity: 0.5;
                filter: grayscale(1);
                pointer-events: none;
              }
            `;
          }),
        ],
        expandable: {
          childrenColumnName: 'variants',
          expandIcon: ({ record, expanded, onExpand }) => {
            if (!record?.variants?.length) {
              return null;
            }

            return (
              <ExpandButton
                expanded={expanded}
                onClick={(e) => onExpand(record, e)}
              />
            );
          },
        },
        loading,
        selectedRows,
        columns,
        data: products,
        rowKey: 'id',
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {},
      }}
    />
  );
};
