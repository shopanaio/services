import { gql } from '@apollo/client';
import { ApiTag } from '@src/graphql';

export type ApiTagQueryFindOneResponse = {
  tagQuery: {
    findOne: ApiTag;
  };
};

export const FindOneTagQuery = gql`
  query FindOneTag($id: ID!) {
    tagQuery {
      findOne(id: $id) {
        ...TagFragment
      }
    }
  }
`;
