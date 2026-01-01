import { defaultFormValues } from '@modules/customers/defs';
import { ICustomerFormValues } from '@modules/customers/types';
import { ICustomer } from '@src/entity/Customer/Customer';

export const getCustomerFormValues = (
  customer: ICustomer,
): ICustomerFormValues => {
  return {
    address: defaultFormValues.address,
    email: customer.email,
    firstName: customer.firstName,
    language: customer.language || '',
    lastName: customer.lastName,
    marketing: defaultFormValues.marketing,
    note: '',
    password: '',
    phone: customer.phone || '',
    isEmailVerified: customer.isVerified,
    tags: [],
  };
};
