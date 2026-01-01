import { ICustomerFormValues } from '@modules/customers/types';
import { ICustomer } from '@src/entity/Customer/Customer';
import { ApiUpdateCustomerInput } from '@src/graphql';
import { FieldNamesMarkedBoolean } from 'react-hook-form';

export const getEditCustomerPayload = ({
  customer,
  data,
  dirtyFields,
}: {
  customer: ICustomer;
  data: ICustomerFormValues;
  dirtyFields: FieldNamesMarkedBoolean<ICustomerFormValues>;
}): ApiUpdateCustomerInput => {
  const payload = {
    id: customer.id,
  } as ApiUpdateCustomerInput;
  if (dirtyFields.email) {
    payload.email = data.email;
  }

  if (dirtyFields.firstName) {
    payload.firstName = data.firstName;
  }

  if (dirtyFields.lastName) {
    payload.lastName = data.lastName;
  }

  if (dirtyFields.phone) {
    payload.phone = data.phone;
  }

  if (dirtyFields.password) {
    payload.password = data.password;
  }

  if (dirtyFields.isEmailVerified) {
    payload.isVerified = data.isEmailVerified;
  }

  if (dirtyFields.language) {
    payload.language = data.language;
  }

  // if (dirtyFields.address) {
  //   payload.address = data.address;
  // }

  // if (dirtyFields.marketing) {
  //   payload.marketing = data.marketing;
  // }

  // if (dirtyFields.notifications) {
  //   payload.notifications = data.notifications;
  // }

  // if (dirtyFields.tags) {
  //   payload.tags = data.tags;
  // }

  // if (dirtyFields.note) {
  //   payload.note = data.note;
  // }

  return payload;
};
