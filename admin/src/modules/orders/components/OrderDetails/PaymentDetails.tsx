import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { OrderAddress } from '@modules/orders/components/OrderDetails/OrderAddress';
import { PaymentDetailsModal } from '@modules/orders/components/OrderDetails/PaymentDetailsModal';
import { IOrder } from '@src/entity/Order/Order';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Typography } from 'antd';
import { isEqual } from 'lodash';
import { useState } from 'react';
import { MdEdit } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const PaymentDetails = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const { billingAddress, shippingAddress, paymentMethod } = order;
  const intl = useIntl();

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="paymentDetails"
        title={intl.formatMessage({ id: t('orders.paymentDetails.title') })}
        extra={
          <Button
            icon={<MdEdit />}
            onClick={() => {
              setIsShippingModalOpen(true);
            }}
          />
        }
      />

      <Flex direction="column" mt="2">
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: t('orders.paymentDetails.method.label') })}
        </Typography.Text>
        <Flex align="center" justify="space-between">
          {paymentMethod ? (
            <Typography.Link>{paymentMethod?.name}</Typography.Link>
          ) : (
            <Typography.Text>
              {intl.formatMessage({ id: t('orders.method.none') })}
            </Typography.Text>
          )}
        </Flex>
      </Flex>
      <Box mt="2">
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: t('orders.paymentDetails.invoiceAddress') })}
        </Typography.Text>
        <Box>
          {billingAddress ? (
            isEqual(
              { ...shippingAddress, id: null },
              { ...billingAddress, id: null },
            ) ? (
              <Typography.Text>
                {intl.formatMessage({ id: t('orders.paymentDetails.invoiceSameAsShipping') })}
              </Typography.Text>
            ) : (
              <OrderAddress {...billingAddress} />
            )
          ) : (
            <Typography.Text>
              {intl.formatMessage({ id: t('orders.address.none') })}
            </Typography.Text>
          )}
        </Box>
      </Box>
      <PaymentDetailsModal
        order={order}
        refetch={refetch}
        onClose={() => {
          setIsShippingModalOpen(false);
        }}
        open={isShippingModalOpen}
      />
    </DrawerPaper>
  );
};
