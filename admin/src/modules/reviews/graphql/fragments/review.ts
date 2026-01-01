import { gql } from '@apollo/client';

export const ReviewFragment = gql`
  fragment ReviewFragment on Review {
    id
    createdAt
    updatedAt
    message
    rating
    status
    title
    pros
    cons
    displayName
    product {
      ...VariantFragment
    }
    customer {
      ...CustomerFragment
    }
  }
`;
