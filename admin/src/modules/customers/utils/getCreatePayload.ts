import { ICustomerFormValues } from '@modules/customers/types';
import { ApiCreateCustomerInput } from '@src/graphql';

export const getCreateCustomerPayload = ({
  data,
}: {
  data: ICustomerFormValues;
}): ApiCreateCustomerInput => {
  return {
    email: data.email,
    firstName: data.firstName,
    isVerified: data.isEmailVerified,
    lastName: data.lastName,
    password: data.password,
    phone: data.phone,
    language: data.language,
  };
};
