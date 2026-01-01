import { gql } from '@apollo/client';

export const ShippingMethodsQuery = gql`
  query ShippingMethodsAndCarriers {
    shippingServiceQuery {
      findMany {
        code
        name
        cover {
          ...FileFragment
        }
        methods {
          ...ShippingMethodFragment
        }
      }
    }
  }
`;
