import { gql } from '@apollo/client';

export const FileFragment = gql`
  fragment FileFragment on File {
    id
    driver
    name
    url
    size
    ext
    createdAt
  }
`;
