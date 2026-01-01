import { gql } from '@apollo/client';
import { ApiCollectionMeta, ApiFile } from '@src/graphql';

export type ApiFileQueryFindManyResponse = {
  fileQuery: {
    findMany: {
      meta: ApiCollectionMeta;
      data: ApiFile[];
    };
  };
};

export const FileQueryFindMany = gql`
  query FindManyFiles($input: FilesInput!) {
    fileQuery {
      findMany(input: $input) {
        meta {
          page
          pageSize
          count
          total
          pageCount
        }
        data {
          ...FileFragment
        }
      }
    }
  }
`;
