import { notify } from '@components/feedback/notification';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { BrowseCustomersButton } from '@modules/customers/components/BrowseButton';
import {
  useDeleteOrderCustomer,
  useUpdateOrderCustomer,
} from '@modules/orders/hooks/mutations';
import { ICustomer } from '@src/entity/Customer/Customer';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { App, Avatar, Button, Typography } from 'antd';
import {} from 'react-hook-form';
import { MdClose, MdEdit } from 'react-icons/md';

export const Customer = ({
  orderId,
  refetch,
  customer,
  isDraft,
}: {
  orderId: string;
  refetch: () => Promise<void>;
  customer: ICustomer | null;
  isDraft: boolean;
}) => {
  const { updateCustomer } = useUpdateOrderCustomer();
  const { deleteCustomer } = useDeleteOrderCustomer();
  const { modal } = App.useApp();

  const onDeleteCustomer = async () => {
    const confirmed = await modal.confirm({
      icon: null,
      title: 'Unlink customer?',
      okText: 'Yes',
      cancelText: 'No',
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomer(orderId);
      await refetch();
      notify.success('Customer unlinked');
    } catch {
      notify.error('Failed to unlink customer');
    }
  };

  const onUpdateCustomer = async (customers: ICustomer[]) => {
    if (!customers.length) {
      return;
    }
    const customer = customers[0];
    try {
      await updateCustomer({
        id: orderId,
        customerId: customer.id,
      });
      await refetch();
      notify.success('Customer linked');
    } catch {
      notify.error('Failed to link customer');
    }
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Customer"
        name="customer"
        extra={
          isDraft &&
          (customer ? (
            <Button
              onClick={onDeleteCustomer}
              icon={<MdClose />}
              data-testid="unassign-customer-button"
            />
          ) : (
            <BrowseCustomersButton
              multiple={false}
              value={[]}
              onChange={onUpdateCustomer}
              buttonProps={{
                icon: <MdEdit />,
                children: null,
              }}
            />
          ))
        }
      />
      {customer ? (
        <Flex align="center" gap="2">
          <Avatar
            css={css`
              background-color: var(--color-purple-2);
              color: var(--color-purple-6);
              cursor: pointer;
            `}
          >
            {customer?.firstName?.[0]}
            {customer?.lastName?.[0]}
          </Avatar>
          <Flex data-testid="customer-fullname">
            {customer?.firstName || ''} {customer?.lastName || ''}
          </Flex>
        </Flex>
      ) : (
        <Flex gap="1" direction="column">
          <Typography.Text data-testid="no-customer-message">
            No customer
          </Typography.Text>
          <Typography.Text type="secondary">
            Guest checkout allows users to make purchases on a website without
            creating an account.
          </Typography.Text>
        </Flex>
      )}
    </DrawerPaper>
  );
};
