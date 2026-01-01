import { gql } from '@apollo/client';

export const CategoryFragment = gql`
  fragment CategoryFragment on Category {
    id
    listingOrderBy
    listingOrderByStatus
    includeChildrenProducts
    slug
    status
    updatedAt
    createdAt
    __typename
  }
`;

export const BrowseCategoryFragment = gql`
  fragment BrowseCategoryFragment on Category {
    id
    status
    createdAt
    updatedAt
    slug
    title
    cover {
      ...FileFragment
    }
    __typename
  }
`;
