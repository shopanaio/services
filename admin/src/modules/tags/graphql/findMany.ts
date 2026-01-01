import { gql } from '@apollo/client';
import { ApiTag, ApiCollectionMeta } from '@src/graphql';

export type ApiTagQueryFindManyResponse = {
  tagQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiTag[];
    };
  };
};

export const TagQueryFindMany = gql`
  query FindManyTags($input: TagsInput!) {
    tagQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...TagFragment
        }
      }
    }
  }
`;
