import { gql } from '@apollo/client';

export const ProjectFragment = gql`
  fragment ProjectFragment on Project {
    id
    name
    slug
    status
  }
`;
