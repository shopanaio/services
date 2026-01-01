import { gql } from '@apollo/client';

export const PageFragment = gql`
  fragment PageFragment on Page {
    id
    slug
    status
    updatedAt
    createdAt
  }
`;

export const BrowsePageFragment = gql`
  fragment BrowsePageFragment on Page {
    id
    status
    createdAt
    updatedAt
    title
    cover {
      ...FileFragment
    }
  }
`;
