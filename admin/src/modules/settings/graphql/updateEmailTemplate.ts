import { gql } from '@apollo/client';

export type ApiEmailTemplateMutationUpdateResponse = {
  emailTemplateMutation: {
    update: {
      id: string;
    };
  };
};

export const UpdateEmailTemplateMutation = gql`
  mutation UpdateEmailTemplate($input: UpdateEmailTemplateInput!) {
    emailTemplateMutation {
      update(input: $input) {
        id
      }
    }
  }
`;

export const SendTestEmailMutation = gql`
  mutation SendTestEmail($input: SendTestEmailInput!) {
    emailTemplateMutation {
      sendTestEmail(input: $input)
    }
  }
`;
