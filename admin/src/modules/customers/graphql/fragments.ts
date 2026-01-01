import { gql } from '@apollo/client';

export const CustomerFragment = gql`
  fragment CustomerFragment on Customer {
    id
    email
    firstName
    isBlocked
    isVerified
    lastName
    phone
    language
    createdAt
    updatedAt
  }
`;
