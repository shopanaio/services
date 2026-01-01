import { gql } from '@apollo/client';

export const PaymentMethodFindMany = gql`
  query PaymentMethodFindMany {
    paymentMethodQuery {
      findMany {
        code
        name
        service {
          code
          name
          cover {
            ...FileFragment
          }
        }
      }
    }
  }
`;

export const ShippingMethodFindMany = gql`
  query ShippingMethodFindMany {
    shippingMethodQuery {
      findMany {
        code
        name
        service {
          code
          name
          cover {
            ...FileFragment
          }
        }
      }
    }
  }
`;

export const PaymentServicerFindMany = gql`
  query PaymentServicerFindMany {
    paymentServiceQuery {
      findMany {
        name
        code
        cover {
          ...FileFragment
        }
      }
    }
  }
`;

export const ShippingServicerFindMany = gql`
  query ShippingServiceFindMany {
    shippingServiceQuery {
      findMany {
        name
        code
        cover {
          ...FileFragment
        }
      }
    }
  }
`;

export const CreateShippingServiceMutation = gql`
  mutation CreateShippingService($input: CreateShippingServiceInput!) {
    shippingServiceMutation {
      create(input: $input)
    }
  }
`;

export const CreatePaymentServiceMutation = gql`
  mutation CreatePaymentService($input: CreateShippingServiceInput!) {
    shippingServiceMutation {
      create(input: $input)
    }
  }
`;

export const CreateShippingMethodMutation = gql`
  mutation CreateShippingMethod($input: CreateShippingMethodInput!) {
    shippingMethodMutation {
      create(input: $input)
    }
  }
`;

export const CreatePaymentMethodMutation = gql`
  mutation CreatePaymentMethod($input: CreatePaymentMethodInput!) {
    paymentMethodMutation {
      create(input: $input)
    }
  }
`;
