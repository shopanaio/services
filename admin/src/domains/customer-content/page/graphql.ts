import { gql } from "@apollo/client";

/** Lightweight aggregate query for the UGC section navigator. */
export const UGC_SECTION_COUNTS_QUERY = gql`
  query UgcSectionCounts {
    reviewsQuery {
      reviews(first: 1) {
        totalCount
      }
      productQuestions(first: 1) {
        totalCount
      }
      contents(first: 1, meta: { includeDeleted: true, includeRedacted: true }) {
        totalCount
      }
      contentReports(first: 1) {
        totalCount
      }
      moderationCases(first: 1) {
        totalCount
      }
      reviewRequests(first: 1) {
        totalCount
      }
      contentExternalReferences(first: 1) {
        totalCount
      }
    }
  }
`;
