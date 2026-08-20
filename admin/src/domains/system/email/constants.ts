import type { EmailTemplateType } from "./types";

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateType, string> = {
  CustomerInvitation: "Customer: Invited",
  CustomerSignUp: "Customer: Sign Up",
  CustomerResetPassword: "Customer: Reset Password",
  CustomerOrderCreated: "Order: Created",
  CustomerOrderDelivered: "Order: Delivered",
  CustomerOrderShipped: "Order: Shipped",
};

const testCustomer = {
  email: "homer.j@simpson.com",
  firstName: "Homer",
  lastName: "Simpson",
  middleName: "J",
  token: "s3cr3tT0k3n",
};

const testOrder = {
  number: 19999,
  dateCreated: "2024-05-18T00:00:00Z",
  totalPrice: 1000,
  subtotalPrice: 900,
  totalDiscount: 100,
  shippingAddress: {
    address1: "123 Main St",
    address2: "Apt 1",
    city: "Springfield",
    country: "USA",
    email: "homer@simpson.co",
    firstName: "Homer",
    lastName: "Simpson",
    middleName: "J",
    phoneNumber: "1234567890",
    postalCode: "12345",
    province: "IL",
  },
  billingAddress: {
    address1: "123 Main St",
    address2: "Apt 1",
    city: "Springfield",
    country: "USA",
    email: "homer@simpson.co",
    firstName: "Homer",
    lastName: "Simpson",
    middleName: "J",
    phoneNumber: "1234567890",
    postalCode: "12345",
    province: "IL",
  },
  fulfillmentLines: [
    {
      shippingMethod: "UPS Ground",
      items: [
        {
          name: "Duff Beer",
          quantity: 6,
          price: 100,
          total: 600,
          cover: "https://duff.com/beer.jpg",
          slug: "duff-beer",
          sku: "123456",
        },
      ],
      trackingNumber: "654321",
      trackingUrl: "https://ups.com/654321",
      shippedAt: "2024-05-19T00:00:00Z",
      deliveredAt: "2024-05-20T00:00:00Z",
    },
    {
      shippingMethod: "FedEx",
      items: [
        {
          name: "Donuts",
          quantity: 12,
          price: 10,
          total: 120,
          cover: "https://duff.com/donuts.jpg",
          slug: "donuts",
          sku: "654321",
        },
      ],
      trackingNumber: "123456",
      trackingUrl: "https://fedex.com/123456",
      shippedAt: "2024-05-19T00:00:00Z",
      deliveredAt: "2024-05-20T00:00:00Z",
    },
  ],
  paymentMethod: "Visa",
  customerInfo: testCustomer,
  items: [
    {
      name: "Duff Beer",
      quantity: 6,
      price: 100,
      total: 600,
      cover: "https://duff.com/beer.jpg",
      slug: "duff-beer",
      sku: "123456",
    },
    {
      name: "Donuts",
      quantity: 12,
      price: 10,
      total: 120,
      cover: "https://duff.com/donuts.jpg",
      slug: "donuts",
      sku: "654321",
    },
  ],
  cancelledAt: "2024-05-21T00:00:00Z",
  completedAt: "2024-05-22T00:00:00Z",
};

export const getEmailTemplateVariables = (type: EmailTemplateType) =>
  JSON.stringify(type.startsWith("CustomerOrder") ? testOrder : testCustomer, null, 2);
