import { gql } from '@apollo/client';

export const DeleteMenuMutation = gql`
  mutation DeleteMenu($id: ID!) {
    menuMutation {
      delete(id: $id)
    }
  }
`;

export const DeleteManyMenusMutation = gql`
  mutation DeleteManyMenus($ids: [ID!]!) {
    menuMutation {
      deleteMany(ids: $ids)
    }
  }
`;
