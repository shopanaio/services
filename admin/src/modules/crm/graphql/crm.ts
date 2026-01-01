import { gql } from '@apollo/client';

export const CrmOrderFragment = gql`
  fragment CrmOrderFragment on Order {
    id
    createdAt
    status
    orderNumber
    totalDiscountAmount
    totalAmount
    customerEmail
    customerPhone
    customerFirstName
    customerMiddleName
    customerLastName
    tags {
      ...TagFragment
    }
    paymentMethod {
      ...PaymentMethodFragment
    }
    shippingMethod {
      ...ShippingMethodFragment
    }
    shippingAddress {
      ...AddressFragment
    }
    billingAddress {
      ...AddressFragment
    }
    payment {
      status
    }
    fulfillments {
      status
    }
    productsInfo {
      id
      variantId
      snapshot {
        title
        containerTitle
        cover {
          ...FileFragment
        }
      }
    }
  }
`;

const CrmFindManyColumnsQuery = gql`
  query CrmFindManyColumns {
    crmQuery {
      getColumns {
        ID
        title
        slug
        sortIndex
      }
    }
  }
`;

const CrmCreateColumnMutation = gql`
  mutation CrmCreateColumn($input: CrmCreateColumnInput!) {
    crmMutation {
      columnCreateOne(input: $input)
    }
  }
`;

const CrmUpdateColumnMutation = gql`
  mutation CrmUpdateColumn($input: CrmUpdateColumnInput!) {
    crmMutation {
      columnUpdateOne(input: $input)
    }
  }
`;

const CrmUpdateManyColumnsMutation = gql`
  mutation CrmUpdateManyColumns($input: [CrmUpdateColumnInput!]!) {
    crmMutation {
      columnUpdateMany(input: $input)
    }
  }
`;

const CrmDeleteColumnMutation = gql`
  mutation CrmDeleteColumn($id: ID!) {
    crmMutation {
      columnDeleteOne(id: $id)
    }
  }
`;

const CrmAppendColumnMutation = gql`
  mutation CrmAppendColumn($input: CrmAppendTicketInput!) {
    crmMutation {
      ticketAppend(input: $input)
    }
  }
`;

const CrmMoveTicketMutation = gql`
  mutation CrmMoveTicket($input: CrmMoveTicketInput!) {
    crmMutation {
      ticketMove(input: $input)
    }
  }
`;

const CrmTicketsQuery = gql`
  query CrmTickets($input: CrmTicketsQueryInput!) {
    crmQuery {
      getTickets(input: $input) {
        hasNextPage
        data {
          ID
          title
          slug
          sortIndex
          tickets {
            ...CrmOrderFragment
          }
        }
      }
    }
  }
`;

export const CrmQueries = {
  CrmTicketsQuery,
  CrmFindManyColumnsQuery,
  CrmCreateColumnMutation,
  CrmUpdateColumnMutation,
  CrmUpdateManyColumnsMutation,
  CrmDeleteColumnMutation,
  CrmAppendColumnMutation,
  CrmMoveTicketMutation,
};
