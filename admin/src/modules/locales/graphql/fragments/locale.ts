import { gql } from '@apollo/client';

export const LocaleFragment = gql`
  fragment LocaleFragment on Locale {
    title
    code
    isActive
  }
`;
