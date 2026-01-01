import * as yup from 'yup';

export const getCreateCustomerSchema = () => {
  return yup.object({
    email: yup.string().email().required(),
    firstName: yup.string().required(),
    lastName: yup.string().required(),
    password: yup.string().required(),
    phoneNumber: yup.string(),
    language: yup.string().required(),
  });
};

export const getEditCustomerSchema = () => {
  return yup.object({});
};
