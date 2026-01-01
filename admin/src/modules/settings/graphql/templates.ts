import { gql } from '@apollo/client';
import { ApiEmailTemplate } from '@src/graphql';

export type ApiEmailTemplateQueryFindManyResponse = {
  emailTemplateQuery: {
    findMany: ApiEmailTemplate[];
  };
};

export const EmailTemplateFindMany = gql`
  query EmailTemplateFindMany($input: EmailTemplatesInput!) {
    emailTemplateQuery {
      findMany(input: $input) {
        id
        subject
        template
        type
        createdAt
        updatedAt
      }
    }
  }
`;
