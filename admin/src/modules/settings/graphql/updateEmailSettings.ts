import { gql } from '@apollo/client';

export type ApiEmailSettingsMutationUpdateResponse = {
  emailSettingsMutation: {
    update: {
      __typename: 'EmailSettings';
    };
  };
};

export const UpdateEmailSettingsMutation = gql`
  mutation UpdateEmailSettings($input: UpdateEmailSettingsInput!) {
    emailSettingsMutation {
      update(input: $input) {
        __typename
      }
    }
  }
`;

export type ApiEmailProfilesMutationUpdateResponse = {
  emailProfilesMutation: {
    update: {
      __typename: 'EmailProfiles';
    };
  };
};

export const UpdateEmailProfilesMutation = gql`
  mutation UpdateEmailProfiles($input: UpdateEmailProfilesInput!) {
    emailProfilesMutation {
      update(input: $input) {
        __typename
      }
    }
  }
`;
