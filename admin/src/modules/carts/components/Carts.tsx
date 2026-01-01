import {
  EmptyColumnText,
  actionsColumn,
  getColumnSortProps,
  getDateColumns,
  renderGallery,
} from '@components/table/columns';
import { ColumnsType } from 'antd/es/table';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { transformColumns } from '@src/utils/utils';
import { cartColumns } from '@modules/carts/defs';
import { useCarts } from '../hooks/useCarts';
import { Price } from '@modules/orders/components/Price';
import { sanitizeEntries } from '@src/entity/utils';
import { IMediaFile, MediaFile } from '@src/entity/MediaFile/MediaFile';
import { useCartDelete } from '../../../hooks/useCartDelete';

interface ICartItemSnapshot {
  title: string;
  cover: IMediaFile | null;
  price: number;
  sku?: string | null;
}

interface ICartItem {
  id: ID;
  totalAmount: number;
  purchasableSnapshot: ICartItemSnapshot;
}

export interface ICart {
  id: ID;
  createdAt?: string | null;
  updatedAt?: string | null;
  subtotalAmount?: number | null;
  discountTotalAmount?: number | null;
  grandTotalAmount?: number | null;
  items: ICartItem[];
}

const Carts = () => {
  const { carts, loading, navigation, meta } = useCarts();
  const { deleteCart } = useCartDelete();

  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;

  const columns: ColumnsType<ICart> = [
    {
      dataIndex: 'items',
      title: cartColumns.items.label,
      key: cartColumns.items.key,
      width: cartColumns.items.width,
      render: (items: ICartItem[]) => {
        if (!items?.length) {
          return <EmptyColumnText>No products</EmptyColumnText>;
        }

        return renderGallery({
          files: sanitizeEntries<IMediaFile>(
            items.map(({ purchasableSnapshot }) => {
              return purchasableSnapshot?.cover || MediaFile.placeholder();
            }),
          ),
        });
      },
    },
    {
      title: cartColumns.status.label,
      key: cartColumns.status.key,
      dataIndex: 'status',
      width: cartColumns.status.width,
      render: (status: string | null) => {
        if (!status) {
          return <EmptyColumnText />;
        }
        return status;
      },
    },
    {
      dataIndex: 'grandTotalAmount',
      title: cartColumns.totalPrice.label,
      key: cartColumns.totalPrice.key,
      width: cartColumns.totalPrice.width,
      ...getColumnSortProps('grandTotalAmount', navigation.sortProps),
      render: (amount: number | null) => (
        <Price data={{ price: amount || 0 }} />
      ),
    },
    {
      dataIndex: 'discountTotalAmount',
      title: cartColumns.totalDiscount.label,
      key: cartColumns.totalDiscount.key,
      width: cartColumns.totalDiscount.width,
      ...getColumnSortProps('discountTotalAmount', navigation.sortProps),
      render: (amount: number | null) => (
        <Price data={{ price: amount || 0 }} />
      ),
    },
    {
      dataIndex: 'customer',
      title: cartColumns.customer.label,
      key: cartColumns.customer.key,
      width: cartColumns.customer.width,
      render: (customer: any) => {
        if (!customer) {
          return <EmptyColumnText />;
        }
        return (
          customer?.email ||
          customer?.firstName ||
          customer?.lastName || <EmptyColumnText />
        );
      },
    },
    ...getDateColumns({
      sortProps: navigation.sortProps,
    }),
    {
      ...actionsColumn<ICart>({
        onDelete: ({ id }) => {
          deleteCart(id);
        },
        settings: navigation.columnsProps,
      }),
      fixed: 'right' as const,
    },
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

  const scrollX = activeColumns.reduce((acc, it) => {
    const option = cartColumns?.[it.key as keyof typeof cartColumns];
    if (!option) {
      return acc;
    }

    return option.isFixed ? acc : acc + (option?.width || 0) * 1.5;
  }, 0);

  return (
    <TableLayout
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        onChangePageSize: navigation.paginationProps.setPageSize,
        page: meta.page,
        pageSize: meta.pageSize,
        total: meta.total,
      }}
      tableProps={{
        name: 'carts',
        layout: 'fixed',
        scroll: {
          x: scrollX,
        },
        sticky: true,
        loading,
        selectedRows,
        onChangeSelectedRows,
        columns: activeColumns,
        data: carts,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          canSetStatus: false,
        },
      }}
      headerProps={{
        title: 'Carts',
        count: meta.total,
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default Carts;
