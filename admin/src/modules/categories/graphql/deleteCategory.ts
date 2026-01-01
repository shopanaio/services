import { gql } from '@apollo/client';

export const DeleteCategoryMutation = gql`
  mutation DeleteCategory($id: ID!) {
    categoryMutation {
      delete(id: $id)
    }
  }
`;

export const ArchiveCategoryMutation = gql`
  mutation ArchiveCategory($id: ID!) {
    categoryMutation {
      archive(id: $id)
    }
  }
`;

export const DeleteManyCategoriesMutation = gql`
  mutation DeleteManyCategories($ids: [ID!]!) {
    categoryMutation {
      deleteMany(ids: $ids)
    }
  }
`;

export const ArchiveManyCategoriesMutation = gql`
  mutation ArchiveManyCategories($ids: [ID!]!) {
    categoryMutation {
      archiveMany(ids: $ids)
    }
  }
`;
