import { gql } from '@apollo/client';
import { ApiEmailSettings } from '@src/graphql';

export type ApiEmailSettingsQueryFindOneResponse = {
  emailSettingsQuery: {
    findOne: ApiEmailSettings;
  };
};

export const EmailSettingsQueryFindOne = gql`
  query GetEmailSettings {
    emailSettingsQuery {
      findOne {
        from
        replyTo
        createdAt
        updatedAt
      }
    }
  }
`;
