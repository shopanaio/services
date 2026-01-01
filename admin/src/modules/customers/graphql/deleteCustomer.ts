import { gql } from '@apollo/client';

export const DeleteCustomerMutation = gql`
  mutation DeleteCustomer($id: ID!) {
    customerMutation {
      delete(id: $id)
    }
  }
`;

export const ArchiveCustomerMutation = gql`
  mutation ArchiveCustomer($id: ID!) {
    customerMutation {
      archive(id: $id)
    }
  }
`;

export const DeleteManyCustomersMutation = gql`
  mutation DeleteManyCustomers($ids: [ID!]!) {
    customerMutation {
      deleteMany(ids: $ids)
    }
  }
`;

export const ArchiveManyCustomersMutation = gql`
  mutation ArchiveManyCustomers($ids: [ID!]!) {
    customerMutation {
      archiveMany(ids: $ids)
    }
  }
`;
