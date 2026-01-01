import {
  expandColumn,
  inactiveCheckboxProps,
  getColumnSortProps,
  getNameColumn,
  productCoverColumn,
  statusColumn,
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
import { IProductVariant } from '@src/entity/Product/Variant';

const equalById = (a: any) => (b: any) => a.id === b.id;
const notEqualById = (a: any) => (b: any) => a.id !== b.id;

interface IBrowseVariantsProps {
  onChange: (value: IProductVariant[]) => void;
  value: IProductVariant[];
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
  inListing?: boolean;
}

export const BrowseVariants = ({
  onChange,
  value,
  open,
  onClose,
  multiple,
  inListing = true,
}: IBrowseVariantsProps) => {
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
    productCoverColumn,
    {
      ...getNameColumn({ optionsPath: 'options' }),
      ...getColumnSortProps('title', sortProps),
    },
  ];

  const selectedRowsWithVariantsIds = useMemo(() => {
    const rows = [] as string[];

    products.forEach((product: IProduct) => {
      const hasSelectedVariant = product.embedVariant
        ? selectedRows.some(equalById({ id: product.embedVariant.id }))
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
        if (inListing && !variant.inListing) {
          rows.push(variant.id);
        }
      });
    });

    return rows;
  }, [products, inListing]);

  const getCheckboxProps = (record: IProduct) => {
    const { isVariant, embedVariant } = record;

    if (!isVariant && !embedVariant) {
      return inactiveCheckboxProps;
    }

    const targetRecord = embedVariant || record;
    const disabled = value.some(equalById(targetRecord));
    const checked = selectedRows.some(equalById(targetRecord));

    return {
      checked,
      disabled,
      onChange: () => {
        if (checked) {
          multiple
            ? setSelectedRows(selectedRows.filter(notEqualById(targetRecord)))
            : setSelectedRows([]);
        } else {
          multiple
            ? setSelectedRows(selectedRows.concat(targetRecord))
            : setSelectedRows([targetRecord]);
        }
      },
    };
  };

  return (
    <TableModal
      modalType="browse-variants"
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        page: meta.page,
        pageSize: 25,
        total: meta.total,
      }}
      onCancel={onClose}
      onOk={() => {
        const diff = differenceBy(selectedRows, value, 'id');
        onChange(diff);
        onClose();
      }}
      open={open}
      title="Browse products"
      loading={loading}
      tableProps={{
        name: 'browse-variants',
        tableLayout: 'fixed',
        rowSelection: {
          hideSelectAll: true,
          preserveSelectedRowKeys: true,
          selectedRowKeys: selectedRows.map((it) => {
            return it.id;
          }),
          columnWidth: 50,
          renderCell: (_: boolean, record: IProduct) => {
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
                background-color: var(--color-gray-1);

                &.ant-table-cell-row-hover {
                  background-color: var(--color-gray-1);
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
