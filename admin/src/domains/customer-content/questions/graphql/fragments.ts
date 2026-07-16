import { gql } from "@apollo/client";

export const QUESTION_LIST_FRAGMENT = gql`
  fragment QuestionListFields on ProductQuestion {
    id
    body
    status
    answerState
    createdAt
    updatedAt
    product {
      id
      title
    }
    author {
      type
      displayName
      email
      customer {
        id
      }
    }
    metrics {
      childCount
      officialChildCount
      acceptedChildCount
      likeCount
      dislikeCount
      reportCount
      openReportCount
    }
  }
`;

export const QUESTION_EDITOR_FRAGMENT = gql`
  fragment QuestionEditorFields on ProductQuestion {
    ...QuestionListFields
    revision
    locale
    moderationNote
    moderatedAt
    author {
      type
      displayName
      email
      customer {
        id
        displayName
        email
        preferredLocale
      }
    }
    answers(first: 50) {
      edges {
        node {
          id
          revision
          body
          locale
          status
          isOfficial
          isAccepted
          sortIndex
          createdAt
          updatedAt
          author {
            type
            displayName
            email
            customer {
              id
            }
          }
          metrics {
            likeCount
            dislikeCount
          }
        }
      }
      totalCount
    }
    reports(first: 50) {
      edges {
        node {
          id
          reason
          details
          status
          createdAt
          reporterCustomer {
            id
            displayName
            email
          }
        }
      }
      totalCount
    }
  }
  ${QUESTION_LIST_FRAGMENT}
`;
