import {
  EmptyColumnText,
  actionsColumn,
  getColumnSortProps,
  getDateColumns,
} from '@components/table/columns';
import { customerColumns } from '@modules/customers/defs';
import { useCreateEmptyCustomer } from '@modules/customers/hooks/useCreate';
import { useCustomers } from '@modules/customers/hooks/useCustomers';
import {
  useCustomerDelete,
  useCustomersArchiveMany,
  useCustomersDeleteMany,
} from '@hooks/useCustomerDelete';
import { ICustomer } from '@src/entity/Customer/Customer';
import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { TableLayout } from '@src/layouts/table/components/TableLayout';
import { transformColumns } from '@src/utils/utils';
import { ColumnsType } from 'antd/es/table';
import { App } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

const Customers = () => {
  const { customers, loading, navigation, meta } = useCustomers();
  const { createCustomer } = useCreateEmptyCustomer();
  const { selectedRows, onChangeSelectedRows } = navigation.selectedRowsProps;

  const { deleteCustomer } = useCustomerDelete();
  const { modal } = App.useApp();
  const { deleteManyCustomers } = useCustomersDeleteMany();
  const { archiveManyCustomers } = useCustomersArchiveMany();
  const { formatMessage } = useIntl();

  const columns: ColumnsType<ICustomer> = [
    {
      key: customerColumns.firstName.key,
      title: customerColumns.firstName.label,
      dataIndex: 'firstName',
      width: 150,
      render: (text) => text || <EmptyColumnText />,
      ...getColumnSortProps('firstName', navigation.sortProps),
    },
    {
      key: customerColumns.lastName.key,
      title: customerColumns.lastName.label,
      dataIndex: 'lastName',
      width: 150,
      render: (text) => text || <EmptyColumnText />,
      ...getColumnSortProps('lastName', navigation.sortProps),
    },
    {
      key: customerColumns.email.key,
      title: customerColumns.email.label,
      dataIndex: 'email',
      width: 200,
      render: (text) => text || <EmptyColumnText />,
      ...getColumnSortProps('email', navigation.sortProps),
    },
    {
      key: customerColumns.phone.key,
      title: customerColumns.phone.label,
      dataIndex: 'phone',
      width: 150,
      render: (text) => text || <EmptyColumnText />,
      ...getColumnSortProps('phone', navigation.sortProps),
    },
    ...getDateColumns({
      sortKeys: {
        createdAt: 'created_time',
        updatedAt: 'updated_time',
      },
    }),
    actionsColumn({
      settings: navigation.columnsProps,
      onEdit: (record: ICustomer) => {
        $drawers.addDrawer({
          type: DrawerTypes.CUSTOMER,
          entityId: record.id,
        });
      },
      onDelete: async ({ id }) => {
        const confirm = await modal.confirm({
          title: formatMessage({ id: t('customers.table.confirmDelete.title') }),
          icon: null,
          content: formatMessage({ id: t('customers.table.confirmDelete.content') }),
        });
        if (!confirm) {
          return;
        }
        void deleteCustomer(id);
      },
    }),
  ];

  const activeColumns = transformColumns(
    navigation.columnsProps.value,
    columns,
  );

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
        name: 'customers',
        layout: 'fixed',
        sticky: true,
        loading,
        selectedRows,
        onChangeSelectedRows,
        onRow: (record: ICustomer) => {
          $drawers.addDrawer({
            entityId: record.id,
            type: DrawerTypes.CUSTOMER,
          });
        },
        columns: activeColumns,
        data: customers,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {
          onArchive: (ids: ID[]) => {
            void archiveManyCustomers(ids);
          },
          onDelete: (ids: ID[]) => {
            void deleteManyCustomers(ids);
          },
        },
      }}
      headerProps={{
        title: formatMessage({ id: t('customers.title') }),
        count: meta.total,
        create: async () => {
          const id = await createCustomer();
          if (id) {
            $drawers.addDrawer({
              entityId: id,
              type: DrawerTypes.CUSTOMER,
            });
          }
        },
      }}
    />
  );
};

// react-lazy
// eslint-disable-next-line import/no-default-export
export default Customers;
