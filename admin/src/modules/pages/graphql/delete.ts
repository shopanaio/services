import { gql } from '@apollo/client';

export const DeletePageMutation = gql`
  mutation DeletePage($id: ID!) {
    pageMutation {
      delete(id: $id)
    }
  }
`;

export const DeleteManyPagesMutation = gql`
  mutation DeleteManyPages($ids: [ID!]!) {
    pageMutation {
      deleteMany(ids: $ids)
    }
  }
`;
