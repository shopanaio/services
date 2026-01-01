import { gql } from '@apollo/client';

export const GetLocalesQuery = gql`
  query GetLocales {
    projectQuery {
      locales {
        ...LocaleFragment
      }
    }
  }
`;
