import { gql } from '@apollo/client';
import {
  ApiPage,
  ApiPageQueryFindManyArgs,
  ApiCollectionMeta,
} from '@src/graphql';

export type ApiPageQueryOptionsArgs = ApiPageQueryFindManyArgs & {
  withCover?: boolean;
};

export type ApiPageQueryOptionsResponse = {
  pageQuery: {
    findMany: {
      data: Pick<ApiPage, 'id' | 'title' | 'cover'>[];
      meta: ApiCollectionMeta;
    };
  };
};

export const PageQueryOptions = gql`
  query PageOptions($input: PagesInput!) {
    pageQuery {
      findMany(input: $input) {
        data {
          id
          status
          slug
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
