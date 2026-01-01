export interface ICustomerFormValues {
  email: string;
  firstName: string;
  isEmailVerified: boolean;
  lastName: string;
  password: string;
  phone: string;

  address?: {
    city: string;
    country: string;
    line1: string;
    line2: string;
    postalCode: string;
    state: string;
  };
  marketing?: {
    email: boolean;
    sms: boolean;
  };
  language: string;
  tags?: any;
  note?: string;
}
