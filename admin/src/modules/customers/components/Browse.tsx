import { getDateColumns } from '@components/table/columns';
import { useBrowseCustomers } from '@modules/customers/hooks/useBrowse';
import { ICustomer } from '@src/entity/Customer/Customer';
import { TableModal } from '@src/layouts/table/components/TableModal';
import { filterColumns } from '@src/utils/utils';
import { Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IBrowseCustomersProps {
  onChange: (value: ICustomer[]) => void;
  value: ICustomer[];
  open: boolean;
  onClose: () => void;
  multiple?: boolean;
}

export const BrowseCustomers = ({
  onChange,
  value = [],
  open,
  onClose,
  multiple,
}: IBrowseCustomersProps) => {
  const { options, loading, navigation, meta } = useBrowseCustomers({
    isActive: open,
    selectedRows: value,
    multiple,
  });
  const { formatMessage } = useIntl();

  const { selectedRowsProps } = navigation;
  const { selectedRows, onChangeSelectedRows, onToggleSelectedRow } =
    selectedRowsProps;

  const columns = [
    {
      title: formatMessage({ id: t('customers.browse.columns.name') }),
      dataIndex: 'firstName',
      key: 'name',
      render: (_: any, record: ICustomer) => (
        <Typography.Text>
          {record.firstName} {record.lastName}
        </Typography.Text>
      ),
    },
    {
      title: formatMessage({ id: t('customers.browse.columns.email') }),
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: formatMessage({ id: t('customers.browse.columns.phone') }),
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <Typography.Text
          copyable={!!phone}
          type={!phone ? 'secondary' : undefined}
        >
          {phone || formatMessage({ id: t('customers.browse.noPhone') })}
        </Typography.Text>
      ),
    },
    ...getDateColumns(),
  ].filter(filterColumns(navigation.columnsProps.value));

  return (
    <TableModal
      modalType="browse-customers"
      paginationProps={{
        onChangePage: navigation.paginationProps.setPage,
        page: meta.page,
        pageSize: 25,
        total: meta.total,
      }}
      onCancel={onClose}
      onOk={() => {
        onChange(selectedRows);
        onClose();
      }}
      open={open}
      title={formatMessage({ id: t('customers.browse.title') })}
      loading={loading}
      tableProps={{
        name: 'browse-customers',
        loading,
        selectedRows,
        onChangeSelectedRows,
        onRow: onToggleSelectedRow,
        columns,
        data: options,
      }}
      navigationProps={{
        ...navigation,
        actionsProps: {},
      }}
    />
  );
};
