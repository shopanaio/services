import { gql } from '@apollo/client';
import { ApiPage, ApiCollectionMeta } from '@src/graphql';

export type ApiPageQueryFindManyResponse = {
  pageQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiPage[];
    };
  };
};

export const PageQueryFindMany = gql`
  query FindManyPages($input: PagesInput!) {
    pageQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...PageFragment
          title
          cover {
            ...FileFragment
          }
          gallery {
            ...FileFragment
          }
        }
      }
    }
  }
`;
