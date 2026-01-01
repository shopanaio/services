import { gql } from '@apollo/client';

export type ApiProductMutationCreateResponse = {
  productMutation: {
    create: {
      id: string;
    };
  };
};

export const CreateProductMutation = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    productMutation {
      create(input: $input) {
        id
      }
    }
  }
`;

export type ApiProductMutationCreateManyResponse = {
  productMutation: {
    createMany: boolean[];
  };
};

export const CreateProductsMutation = gql`
  mutation CreateProducts($input: [CreateProductInput!]!) {
    productMutation {
      createMany(input: $input)
    }
  }
`;
