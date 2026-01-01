import { $drawers } from '@src/layouts/drawers/store/drawers';
import {
  ApiOrderQueryFindOneArgs,
  ApiQuery,
  OrderStatusEnum,
} from '@src/graphql';
import { Customer } from '@modules/orders/components/Customer';
import { ContactInfo } from '@modules/orders/components/ContactInfo';
import { defaultFormValues } from '@modules/orders/defs';
import { DrawerLayout } from '@src/layouts/drawer/components/DrawerLayout';
import { EditableNote } from '@modules/orders/components/EditableNote';
import { FormProvider, useForm } from 'react-hook-form';
import { getOrderFormValues } from '@modules/orders/utils/getFormValues';
import { IOrder, Order } from '@src/entity/Order/Order';
import { OrderTags } from '@modules/orders/components/Tags';
import { ShippingDetails } from '@modules/orders/components/OrderDetails/ShippingDetails';
import { TimeLine } from '@modules/orders/components/TimeLine';
import { useCallback, useEffect, useState } from 'react';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { useLazyQuery } from '@apollo/client';
import { OrderQueryFindOne } from '@modules/orders/graphql/findOne';
import { DrawerSkeleton } from '@src/layouts/table/components/Skeleton';
import { notify } from '@components/feedback/notification';
import { equalsId } from '@src/utils/utils';
import { DraftFulfillment } from '@modules/orders/components/FulfillmentItems/DraftFulfillment';
import { ActiveFulfillment } from '@modules/orders/components/FulfillmentItems/ActiveFulfillment';
import { ActivePaymentSummary } from '@modules/orders/components/PaymentItems/ActivePaymentSummary';
import { DraftPaymentSummary } from '@modules/orders/components/PaymentItems/DraftPaymentSummary';
import { OrderStatusAndInfo } from '@modules/orders/components/OrderStatusAndInfo';
import { PaymentDetails } from '@modules/orders/components/OrderDetails/PaymentDetails';

export const EditOrder = () => {
  const { uuid, entityId, forceClose } = useEntityDrawer();

  const methods = useForm({ defaultValues: defaultFormValues });

  const { reset, formState } = methods;
  const { isDirty, errors } = formState;

  const [order, setOrder] = useState<IOrder | null>(null);
  const [queryOrder] = useLazyQuery<ApiQuery, ApiOrderQueryFindOneArgs>(
    OrderQueryFindOne,
    {
      fetchPolicy: 'no-cache',
      variables: { id: entityId as ID },
    },
  );

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await queryOrder();
      if (data?.orderQuery?.findOne) {
        const order = Order.create(data.orderQuery.findOne);
        setOrder(order);
        reset(getOrderFormValues(order));
        return;
      }

      throw new Error();
    } catch (error) {
      notify.error('Error fetching order');
      forceClose?.();
    }
  }, [queryOrder, reset, forceClose]);

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    $drawers.setDirty({ uuid, isDirty });
  }, [uuid, isDirty]);

  if (!order) {
    return <DrawerSkeleton />;
  }

  return (
    <FormProvider {...methods}>
      <DrawerLayout
        errors={errors}
        headerProps={{
          title: `Order #${order?.orderNumber || ''}`,
          submitButtonProps: null,
        }}
        leftColumn={
          <>
            {order.status === OrderStatusEnum.Draft ? (
              <DraftFulfillment order={order} refetch={fetchOrder} />
            ) : (
              order.fulfillments.map((it) => (
                <ActiveFulfillment
                  key={it.id}
                  fulfillmentItem={it}
                  parent={
                    it.parentId
                      ? order.fulfillments.find(equalsId(it.parentId)) || null
                      : null
                  }
                  refetch={fetchOrder}
                />
              ))
            )}
            {order.paymentItem ? (
              <ActivePaymentSummary
                paymentSummary={order.paymentSummary}
                paymentItem={order.paymentItem}
                refetch={fetchOrder}
              />
            ) : (
              <DraftPaymentSummary paymentSummary={order.paymentSummary} />
            )}
            <EditableNote order={order} refetch={fetchOrder} />
            <TimeLine order={order} refetch={fetchOrder} />
          </>
        }
        rightColumn={
          <>
            <OrderStatusAndInfo order={order} refetch={fetchOrder} />
            <Customer
              orderId={order.id}
              refetch={fetchOrder}
              isDraft={order.status === OrderStatusEnum.Draft}
              customer={order.customer}
            />
            <ContactInfo
              customer={order.customer}
              customerDetails={order.customerDetails}
            />
            <ShippingDetails order={order} refetch={fetchOrder} />
            <PaymentDetails order={order} refetch={fetchOrder} />
            <OrderTags order={order} refetch={fetchOrder} />
          </>
        }
      />
    </FormProvider>
  );
};
