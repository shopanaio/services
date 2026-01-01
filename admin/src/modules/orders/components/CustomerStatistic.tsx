import { Flex } from '@components/utility/Flex';
import { PriceRaw } from '@modules/orders/components/Price';
import { IOrderFormValues } from '@modules/orders/types';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';
import { useFormContext } from 'react-hook-form';

export const CustomerStatistic = () => {
  const { watch } = useFormContext<IOrderFormValues>();
  const customer = watch('customer');
  const customerStatistic = watch('customerStatistic');

  if (
    !customerStatistic ||
    (!customerStatistic.authorizedOrders && !customerStatistic.guestOrders)
  ) {
    return (
      <DrawerPaper>
        <DrawerPaperHeader title="Customer history" />
        <Typography.Text type="secondary">No history</Typography.Text>
      </DrawerPaper>
    );
  }

  return (
    <DrawerPaper>
      <DrawerPaperHeader title="Customer history" />
      {customer ? (
        <Flex direction="column" mb="2">
          <Typography.Text type="secondary">
            Authorized / Guest orders
          </Typography.Text>
          <Flex align="center" justify="space-between">
            <Typography.Text>
              {customerStatistic.authorizedOrders} /{' '}
              {customerStatistic.guestOrders}
            </Typography.Text>
          </Flex>
        </Flex>
      ) : (
        <Flex direction="column" mb="2">
          <Typography.Text type="secondary">Guest orders</Typography.Text>
          <Flex align="center" justify="space-between">
            <Typography.Text>{customerStatistic.guestOrders}</Typography.Text>
          </Flex>
        </Flex>
      )}
      <Flex direction="column">
        <Typography.Text type="secondary">Total revenue</Typography.Text>
        <Flex align="center" justify="space-between">
          <Typography.Text>
            <PriceRaw data={{ price: customerStatistic.totalRevenue }} />
          </Typography.Text>
        </Flex>
      </Flex>
      <Flex mt="4">
        <Typography.Text type="secondary">
          Guest orders are matched using the provided phone number or email
          address in cases where the customer is not logged in.
        </Typography.Text>
      </Flex>
    </DrawerPaper>
  );
};
