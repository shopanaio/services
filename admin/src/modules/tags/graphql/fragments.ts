import { gql } from '@apollo/client';

export const TagFragment = gql`
  fragment TagFragment on Tag {
    id
    title
    slug
    color
  }
`;
