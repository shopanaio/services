import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { OrderAddress } from '@modules/orders/components/OrderDetails/OrderAddress';
import { ShippingDetailsModal } from '@modules/orders/components/OrderDetails/ShippingDetailsModal';
import { IOrderFormValues } from '@modules/orders/types';
import { IOrder } from '@src/entity/Order/Order';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Typography } from 'antd';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { MdEdit } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const ShippingDetails = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const { watch } = useFormContext<IOrderFormValues>();
  const intl = useIntl();

  const [shippingAddress, shippingMethod] = watch([
    'shippingAddress',
    'shippingMethod',
  ]);

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        name="shippingDetails"
        title={intl.formatMessage({ id: t('orders.shippingDetails.title') })}
        extra={
          <Button
            icon={<MdEdit />}
            // shape="circle"
            onClick={() => {
              setIsShippingModalOpen(true);
            }}
          />
        }
      />
      <Flex direction="column" mt="2">
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: t('orders.shippingDetails.method.label') })}
        </Typography.Text>
        <Flex align="center" justify="space-between">
          {shippingMethod ? (
            <Typography.Link>{shippingMethod?.name}</Typography.Link>
          ) : (
            <Typography.Text>
              {intl.formatMessage({ id: t('orders.method.none') })}
            </Typography.Text>
          )}
        </Flex>
      </Flex>

      <Box mt="2">
        <Typography.Text type="secondary">
          {intl.formatMessage({ id: t('orders.shippingDetails.address') })}
        </Typography.Text>
        <Box>
          {shippingAddress ? (
            <OrderAddress {...shippingAddress} />
          ) : (
            <Typography.Text>
              {intl.formatMessage({ id: t('orders.address.none') })}
            </Typography.Text>
          )}
        </Box>
      </Box>
      <ShippingDetailsModal
        onClose={() => {
          setIsShippingModalOpen(false);
        }}
        open={isShippingModalOpen}
        order={order}
        refetch={refetch}
      />
    </DrawerPaper>
  );
};
