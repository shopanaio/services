import { gql } from '@apollo/client';

export const GetProjects = gql`
  query GetProjects {
    projectQuery {
      findMany {
        ...ProjectFragment
      }
    }
  }
`;

export const ProjectQuery = gql`
  query Project {
    projectQuery {
      current {
        name
        timezone
        country
        phoneNumber
        email
        currency
        locale
      }
    }
  }
`;
