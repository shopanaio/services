import { gql } from '@apollo/client';

export const DeleteCartMutation = gql`
  mutation DeleteCart($id: ID!) {
    cartMutation {
      delete(id: $id)
    }
  }
`;
