import { gql } from '@apollo/client';

export const CreateCategoryMutation = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    categoryMutation {
      create(input: $input)
    }
  }
`;

export const CreateCategoriesMutation = gql`
  mutation CreateCategories($input: [CreateCategoryInput!]!) {
    categoryMutation {
      createMany(input: $input) {
        id
        slug
      }
    }
  }
`;
