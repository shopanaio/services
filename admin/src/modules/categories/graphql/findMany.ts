import { gql } from '@apollo/client';
import { ApiCategory, ApiCollectionMeta } from '@src/graphql';

export type ApiCategoryQueryFindManyResponse = {
  categoryQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiCategory[];
    };
  };
};

export const CategoryQueryFindMany = gql`
  query FindManyCategories($input: CategoriesInput!) {
    categoryQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...CategoryFragment
          title
          cover {
            ...FileFragment
          }
          gallery {
            ...FileFragment
          }
          children {
            ...CategoryFragment
            title
          }
          parent {
            ...CategoryFragment
            title
          }
        }
      }
    }
  }
`;

export const FindCategoriesQuery = gql`
  query FindCategories($input: CategoriesInput!) {
    categoryQuery {
      findMany(input: $input) {
        data {
          id
          slug
        }
      }
    }
  }
`;
