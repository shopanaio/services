import { IOrderFormValues } from '@modules/orders/types';
import { getApiCreatedOrderItemPayload } from '@modules/orders/utils/getCreatePayload';
import {
  ApiCreateOrderItemInput,
  ApiUpdateOrderInput,
  ApiUpdateOrderItemInput,
} from '@src/graphql';
import { mapEntryId } from '@src/utils/utils';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditOrderPayload = ({
  id,
  data,
  dirtyFields,
  initialItems,
}: {
  id: ID;
  data: Partial<IOrderFormValues>;
  dirtyFields: FieldNamesMarkedBoolean<IOrderFormValues>;
  initialItems: IOrderFormValues['items'];
  locales: ILocale[];
}): ApiUpdateOrderInput => {
  const payload = {
    id,
    items: {
      create: [],
      update: [],
      delete: [],
    },
  } as ApiUpdateOrderInput;

  if (dirtyFields.items && data.items) {
    const created = [] as ApiCreateOrderItemInput[];
    const updated = [] as ApiUpdateOrderItemInput[];

    const deleted = initialItems
      .filter((it) => !data.items?.some((item) => item.id === it.id))
      .map(mapEntryId);

    data.items.forEach((item) => {
      const initial = initialItems.find((it) => it.id === item.id);

      if (!initial) {
        created.push(getApiCreatedOrderItemPayload(item));
        return;
      }

      const itemPayload = { id: item.id } as any;

      itemPayload.price = item.price;
      itemPayload.quantity = item.quantity;
      itemPayload.total = item.price * item.quantity;

      updated.push(itemPayload);
    });

    payload.items = {
      create: created,
      update: updated,
      delete: deleted,
    };

    payload.subtotal = [...created, ...updated].reduce(
      (acc, item) => acc + (item.total || 0),
      0,
    );

    payload.total = payload.subtotal;
  }

  if (dirtyFields.customer) {
    const [customer] = data.customer || [];

    payload.customerDetails = {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phone,
      id: customer.id,
    };
  }

  if (dirtyFields.status) {
    payload.status = data.status;
  }

  if (dirtyFields.paymentMethod) {
    payload.paymentMethodId = data.paymentMethod?.id || 0;
  }

  if (dirtyFields.shippingMethod) {
    payload.shippingMethodId = data.shippingMethod?.id || 0;
  }

  if (dirtyFields.billingAddress) {
    if (data.billingAddress) {
      payload.billingAddress = {
        address1: data.billingAddress?.address1,
        address2: data.billingAddress.address2,
        city: data.billingAddress.city,
        countryCode: data.billingAddress.countryCode,
        firstName: data.billingAddress.firstName,
        id: data.billingAddress.id,
        lastName: data.billingAddress.lastName,
        latitude: data.billingAddress.latitude,
        longitude: data.billingAddress.longitude,
        middleName: data.billingAddress.middleName,
        phoneNumber: data.billingAddress.phone,
        email: data.billingAddress.email,
        provinceCode: data.billingAddress.state,
        postalCode: data.billingAddress.zip,
      };
    } else {
      payload.billingAddress = null;
    }
  }

  if (dirtyFields.shippingAddress) {
    if (data.shippingAddress) {
      payload.shippingAddress = {
        address1: data.shippingAddress?.address1,
        address2: data.shippingAddress.address2,
        city: data.shippingAddress.city,
        countryCode: data.shippingAddress.countryCode,
        firstName: data.shippingAddress.firstName,
        id: data.shippingAddress.id,
        lastName: data.shippingAddress.lastName,
        latitude: data.shippingAddress.latitude,
        longitude: data.shippingAddress.longitude,
        middleName: data.shippingAddress.middleName,
        phoneNumber: data.shippingAddress.phone,
        email: data.shippingAddress.email,
        provinceCode: data.shippingAddress.state,
        postalCode: data.shippingAddress.zip,
      };
    } else {
      payload.shippingAddress = null;
    }
  }

  return payload;
};

export const getEditOrderItemsPayload = ({
  id,
  items,
  initialItems,
}: {
  id: ID;
  items: IOrderFormValues['items'];
  initialItems: IOrderFormValues['items'];
}): ApiUpdateOrderInput => {
  const payload = {
    id,
    items: {
      create: [],
      update: [],
      delete: [],
    },
  } as ApiUpdateOrderInput;

  const createItemsPayload = items.map((next) => {
    return getApiCreatedOrderItemPayload(next);
  });

  payload.items = {
    create: createItemsPayload,
    // Skipping updated and deleted items
    // Only new and deleted items should be sent after editing list of products
    update: [],
    delete: [],
  };

  payload.subtotal = [...createItemsPayload, ...initialItems].reduce(
    (acc, item) => acc + (item.total || 0),
    0,
  );

  payload.total = payload.subtotal;
  return payload;
};
