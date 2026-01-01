import { gql } from '@apollo/client';

export const FindTranslations = gql`
  query FindTranslations($where: TranslationWhereInput!) {
    translationQuery {
      findMany(where: $where) {
        fieldValue
        fieldName
        sourceId
        sourceType
        locale
      }
    }
  }
`;

export const UpdateTranslationsMutation = gql`
  mutation UpdateTranslations($input: [UpdateTranslationInput!]!) {
    translationMutation {
      updateMany(input: $input)
    }
  }
`;
