import { gql } from '@apollo/client';

export const UserFragment = gql`
  fragment UserFragment on User {
    # createdAt
    email
    firstName
    id
    isVerified
    lastName
    phoneNumber
    timezone
    language
    isReady
    # updatedAt
  }
`;
