import { ShippingModal } from '@modules/orders/components/ShippingItems/ShippingModal';

import { useForm, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { notify } from '@components/feedback/notification';
import { IShippingItem } from '@src/entity/Order/ShippingItem';
import { ApiUpdateShippingItemInput } from '@src/graphql';
import { IOrderItem } from '@src/entity/Order/Order';
import {
  useCreateShippingItem,
  useUpdateShippingItem,
} from '@modules/orders/hooks/mutations';
import { IShippingMethod } from '@src/entity/Services/ShippingMethod';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface IShippingModalFormValues {
  id: ID | null;
  shippingMethod: IShippingMethod | null;
  trackingCode: string | null;
}

export const defaultShippingItemValues: IShippingModalFormValues = {
  id: null,
  shippingMethod: null,
  trackingCode: null,
};

interface IModalProps {
  open: boolean;
  orderItems: IOrderItem[];
  fulfillmentId: ID;
  onClose: () => void;
  trackingInfo: IShippingItem | null;
  refetch: () => Promise<void>;
}

export const CreateShippingModal = ({
  open,
  fulfillmentId,
  orderItems,
  onClose,
  trackingInfo,
  refetch,
}: IModalProps) => {
  const { createShippingItem } = useCreateShippingItem();
  const { updateShippingItem } = useUpdateShippingItem();
  const intl = useIntl();

  const [loading, setLoading] = useState(false);
  const { getValues } = useFormContext();
  const methods = useForm({ defaultValues: defaultShippingItemValues });

  const { formState, reset } = methods;
  const { isDirty, dirtyFields } = formState;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!trackingInfo) {
      const shippingMethod = getValues('shippingMethod');
      if (shippingMethod) {
        reset({
          shippingMethod,
          trackingCode: '',
        });
      }

      return;
    }

    reset({
      shippingMethod: trackingInfo.shippingMethod,
      trackingCode: trackingInfo.trackingCode || '',
    });
  }, [open, trackingInfo, reset]);

  const onSubmit = methods.handleSubmit(async (data) => {
    try {
      setLoading(true);
      if (trackingInfo) {
        const payload = {
          id: trackingInfo.id,
        } as ApiUpdateShippingItemInput;

        if (dirtyFields.trackingCode) {
          payload.trackingCode = data.trackingCode;
        }

        if (dirtyFields.shippingMethod) {
          payload.shippingMethodId = data.shippingMethod?.id || null;
        }

        await updateShippingItem(payload);
        await refetch();
        notify.success(
          intl.formatMessage({ id: t('orders.shipping.infoUpdated') }),
        );
        onClose();
        return;
      }

      await createShippingItem({
        fulfillmentId,
        shippingMethodId: data.shippingMethod?.id || null,
        trackingCode: data.trackingCode,
      });
      await refetch();
      notify.success(intl.formatMessage({ id: t('orders.shipping.infoAdded') }));
      onClose();
    } catch {
      notify.error(
        intl.formatMessage({ id: t('orders.shipping.updateTrackingFailed') }),
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <ShippingModal
      open={open}
      loading={loading}
      onClose={onClose}
      orderItems={orderItems}
      isDirty={isDirty}
      onSubmit={onSubmit}
      control={methods.control}
      refetch={refetch}
    />
  );
};
