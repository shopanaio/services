import { gql } from '@apollo/client';
import {
  ApiCategory,
  ApiCategoryQueryFindManyArgs,
  ApiCollectionMeta,
} from '@src/graphql';

export type ApiCategoryQueryOptionsArgs = ApiCategoryQueryFindManyArgs & {
  withCover?: boolean;
};

export type ApiCategoryQueryOptionsResponse = {
  categoryQuery: {
    findMany: {
      data: Pick<ApiCategory, 'id' | 'title' | 'cover'>[];
      meta: ApiCollectionMeta;
    };
  };
};

export const CategoryQueryOptions = gql`
  query CategoryOptions($input: CategoriesInput!) {
    categoryQuery {
      findMany(input: $input) {
        data {
          __typename
          id
          slug
          status
          title
          cover {
            id
            url
            driver
            name
          }
        }
        meta {
          page
          pageSize
          total
          count
          pageCount
        }
      }
    }
  }
`;
