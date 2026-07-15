import { gql } from "@apollo/client";

export const QUESTION_EDITOR_FRAGMENT = gql`
  fragment QuestionEditorFields on ProductQuestion {
    id
    version
    body
    status
    answerState
    answerCount
    likeCount
    dislikeCount
    reportedCount
    moderationNote
    moderatedAt
    createdAt
    updatedAt
    product { id title }
    customer { id displayName email }
    answers {
      id
      version
      body
      authorType
      authorName
      isOfficial
      likeCount
      dislikeCount
      createdAt
      updatedAt
    }
    reports {
      id
      reason
      details
      createdAt
      reporter { id displayName email }
    }
  }
`;
