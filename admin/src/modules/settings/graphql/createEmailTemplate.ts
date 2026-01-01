import { gql } from '@apollo/client';

export type ApiEmailTemplateMutationCreateResponse = {
  emailTemplateMutation: {
    create: {
      id: number;
    };
  };
};

export const CreateEmailTemplateMutation = gql`
  mutation CreateEmailTemplate($input: CreateEmailTemplateInput!) {
    emailTemplateMutation {
      create(input: $input) {
        id
      }
    }
  }
`;
