export const getTestOrder = () => {
  const testOrder = {
    number: 19999,
    dateCreated: '2024-05-18T00:00:00Z',
    totalPrice: 1000,
    subtotalPrice: 900,
    totalDiscount: 100,
    shippingAddress: {
      address1: '123 Main St',
      address2: 'Apt 1',
      city: 'Springfield',
      country: 'USA',
      email: 'homer@simpson.co',
      firstName: 'Homer',
      lastName: 'Simpson',
      middleName: 'J',
      phoneNumber: '1234567890',
      postalCode: '12345',
      province: 'IL',
    },
    billingAddress: {
      address1: '123 Main St',
      address2: 'Apt 1',
      city: 'Springfield',
      country: 'USA',
      email: 'homer@simpson.co',
      firstName: 'Homer',
      lastName: 'Simpson',
      middleName: 'J',
      phoneNumber: '1234567890',
      postalCode: '12345',
      province: 'IL',
    },
    fulfillmentLines: [
      {
        shippingMethod: 'UPS Ground',
        items: [
          {
            name: 'Duff Beer',
            quantity: 6,
            price: 100,
            total: 600,
            cover: 'https://duff.com/beer.jpg',
            slug: 'duff-beer',
            sku: '123456',
          },
        ],
        trackingNumber: '654321',
        trackingUrl: 'https://ups.com/654321',
        shippedAt: '2024-05-19T00:00:00Z',
        deliveredAt: '2024-05-20T00:00:00Z',
      },
      {
        shippingMethod: 'FedEx',
        items: [
          {
            name: 'Donuts',
            quantity: 12,
            price: 10,
            total: 120,
            cover: 'https://duff.com/donuts.jpg',
            slug: 'donuts',
            sku: '654321',
          },
        ],
        trackingNumber: '123456',
        trackingUrl: 'https://fedex.com/123456',
        shippedAt: '2024-05-19T00:00:00Z',
        deliveredAt: '2024-05-20T00:00:00Z',
      },
    ],
    paymentMethod: 'Visa',
    items: [
      {
        name: 'Duff Beer',
        quantity: 6,
        price: 100,
        total: 600,
        cover: 'https://duff.com/beer.jpg',
        slug: 'duff-beer',
        sku: '123456',
      },
      {
        name: 'Donuts',
        quantity: 12,
        price: 10,
        total: 120,
        cover: 'https://duff.com/donuts.jpg',
        slug: 'donuts',
        sku: '654321',
      },
    ],
    customerInfo: {
      email: 'homer@simpson.co',
      firstName: 'Homer',
      lastName: 'Simpson',
      middleName: 'J',
      phoneNumber: '1234567890',
    },
    cancelledAt: '2024-05-21T00:00:00Z',
    completedAt: '2024-05-22T00:00:00Z',
  };

  return JSON.stringify(testOrder, null, 4);
};

export const getTestUser = () => {
  return JSON.stringify({
    email: 'homer.j@simpson.com',
    firstName: 'Homer',
    lastName: 'Simpson',
    middleName: 'J',
    token: 's3cr3tT0k3n',
  }, null, 4);
};
