import { gql } from '@apollo/client';

export type ApiProductMutationUpdateResponse = {
  productMutation: {
    update: {
      id: string;
    };
  };
};

export const UpdateProductMutation = gql`
  mutation UpdateProduct($input: UpdateProductInput!) {
    productMutation {
      update(input: $input) {
        id
      }
    }
  }
`;
