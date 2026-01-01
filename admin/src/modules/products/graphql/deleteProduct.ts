import { gql } from '@apollo/client';

export const DeleteProductMutation = gql`
  mutation DeleteProduct($id: ID!) {
    productMutation {
      delete(id: $id)
    }
  }
`;

export const ArchiveProductMutation = gql`
  mutation ArchiveProduct($id: ID!) {
    productMutation {
      archive(id: $id)
    }
  }
`;

export const DeleteManyProductsMutation = gql`
  mutation DeleteManyProducts($ids: [ID!]!) {
    productMutation {
      deleteMany(ids: $ids)
    }
  }
`;

export const ArchiveManyProductsMutation = gql`
  mutation ArchiveManyProducts($ids: [ID!]!) {
    productMutation {
      archiveMany(ids: $ids)
    }
  }
`;
