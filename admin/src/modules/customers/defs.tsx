import { ICustomerFormValues } from '@modules/customers/types';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const customerColumns = {
  firstName: {
    key: 'firstName',
    label: <FormattedMessage id={t('customers.table.firstName')} />,
    isFixed: true,
    active: true,
    width: 150,
  },
  lastName: {
    key: 'lastName',
    label: <FormattedMessage id={t('customers.table.lastName')} />,
    isFixed: true,
    active: true,
    width: 150,
  },
  email: {
    key: 'email',
    label: <FormattedMessage id={t('customers.table.email')} />,
    isFixed: true,
    active: true,
    width: 150,
  },
  phone: {
    key: 'phone',
    label: <FormattedMessage id={t('customers.table.phone')} />,
    isFixed: true,
    active: true,
    width: 150,
  },
  createdAt: {
    key: 'createdTime',
    label: <FormattedMessage id={t('customers.table.createdAt')} />,
    isFixed: true,
    active: false,
    width: 120,
  },
  updatedAt: {
    key: 'updatedTime',
    label: <FormattedMessage id={t('customers.table.updatedAt')} />,
    isFixed: true,
    active: false,
    width: 120,
  },
};

export const searchOptions = {
  firstName: {
    key: 'firstName',
    label: <FormattedMessage id={t('customers.search.firstName')} />,
  },
  lastName: {
    key: 'lastName',
    label: <FormattedMessage id={t('customers.search.lastName')} />,
  },
  email: {
    key: 'email',
    label: <FormattedMessage id={t('customers.search.email')} />,
  },
};

export const defaultFormValues: ICustomerFormValues = {
  email: '',
  language: 'en',
  password: '',
  firstName: '',
  lastName: '',
  isEmailVerified: false,
  phoneNumber: '',
};
