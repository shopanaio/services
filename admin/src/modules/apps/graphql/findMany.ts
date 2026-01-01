import { gql } from '@apollo/client';

export const AppsQueryFindMany = gql`
  query FindApps {
    appsQuery {
      apps {
        code
        name
        meta
      }
      installedApps {
        id
        appCode
        baseURL
        enabled
        meta
      }
    }
  }
`;
