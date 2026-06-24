import { gql } from "@apollo/client";
import {
  FILE_FRAGMENT,
  RICH_TEXT_FRAGMENT,
} from "../../graphql/shared-fragments";

export { FILE_FRAGMENT } from "../../graphql/shared-fragments";

export const CATEGORY_MEDIA_ITEM_FRAGMENT = gql`
  fragment CategoryMediaItemFields on CategoryMediaItem {
    sortIndex
    file {
      ...FileFields
    }
  }
`;

export const CATEGORY_SUMMARY_FRAGMENT = gql`
  fragment CategorySummaryFields on Category {
    id
    name
    handle
    isPublished
    publishedAt
    productsCount
    depth
    path
    createdAt
    updatedAt
    media {
      sortIndex
      file {
        ...FileFields
      }
    }
    parent {
      id
      name
      handle
    }
  }
  ${FILE_FRAGMENT}
`;

export const CATEGORY_LIST_FRAGMENT = CATEGORY_SUMMARY_FRAGMENT;

export const CATEGORY_MUTATION_RESULT_FRAGMENT = CATEGORY_SUMMARY_FRAGMENT;

export const CATEGORY_DETAILS_FRAGMENT = gql`
  fragment CategoryDetailsFields on Category {
    id
    name
    handle
    isPublished
    publishedAt
    createdAt
    updatedAt
    deletedAt
    revision
    depth
    path
    description {
      ...RichTextFields
    }
    excerpt {
      ...RichTextFields
    }
    defaultSort
    defaultSortDirection
    productsCount
    seo {
      seoTitle
      seoDescription
      ogTitle
      ogDescription
      ogImage {
        ...FileFields
      }
    }
    parent {
      id
      name
      handle
      path
    }
    ancestors {
      id
      name
      handle
      path
    }
    children {
      id
      name
      handle
      isPublished
      productsCount
      path
      media {
        ...CategoryMediaItemFields
      }
    }
    media {
      ...CategoryMediaItemFields
    }
  }
  ${FILE_FRAGMENT}
  ${RICH_TEXT_FRAGMENT}
  ${CATEGORY_MEDIA_ITEM_FRAGMENT}
`;

export const CATEGORY_PRODUCT_LIST_ITEM_FRAGMENT = gql`
  fragment CategoryProductListItemFields on Product {
    id
    title
    handle
    isPublished
    media {
      sortIndex
      file {
        ...FileFields
      }
    }
  }
  ${FILE_FRAGMENT}
`;
