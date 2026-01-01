import { gql } from '@apollo/client';

export const UpdateCategoryMutation = gql`
  mutation UpdateCategory($input: UpdateCategoryInput!) {
    categoryMutation {
      update(input: $input)
    }
  }
`;

export const UpdateProductRankMutation = gql`
  mutation UpdateCategoryProductRank($input: UpdateCategoryProductInput!) {
    categoryMutation {
      updateProductRank(input: $input)
    }
  }
`;

export const AddProductsMutation = gql`
  mutation AddCategoryProducts($input: AddCategoryProductsInput!) {
    categoryMutation {
      addProducts(input: $input)
    }
  }
`;

export const DeleteProductMutation = gql`
  mutation DeleteCategoryProducts($input: DeleteCategoryProductInput!) {
    categoryMutation {
      deleteProduct(input: $input)
    }
  }
`;
