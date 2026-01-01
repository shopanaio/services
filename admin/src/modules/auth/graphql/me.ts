import { gql } from '@apollo/client';
import { ApiUser } from '@src/graphql';

export type ApiMeQueryResponse = {
  userQuery: {
    me: ApiUser;
  };
};

export const Me = gql`
  query Me {
    userQuery {
      me {
        ...UserFragment
      }
    }
  }
`;
