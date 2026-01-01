import { gql } from '@apollo/client';
import {
  ApiEmailProfiles,
  ApiEmailSettings,
  ApiEmailTemplate,
} from '@src/graphql';

export type ApiEmailTemplatesAndSettingsQueryResponse = {
  emailTemplateQuery: {
    findMany: ApiEmailTemplate[];
  };
  emailSettingsQuery: {
    findOne: ApiEmailSettings;
  };
  emailProfilesQuery: {
    findOne: ApiEmailProfiles;
  };
};

export const EmailTemplatesAndSettings = gql`
  query EmailTemplatesAndSettings {
    emailTemplateQuery {
      findMany(input: {}) {
        id
        subject
        template
        type
        createdAt
        updatedAt
      }
    }
    emailSettingsQuery {
      findOne {
        from
        replyTo
        createdAt
        updatedAt
      }
    }
    emailProfilesQuery {
      findOne {
        host
        port
        username
        createdAt
        updatedAt
      }
    }
  }
`;
