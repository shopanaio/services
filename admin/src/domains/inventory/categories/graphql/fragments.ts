import { gql } from "@apollo/client";

export const USER_ERROR_FRAGMENT = gql`
  fragment UserErrorFields on GenericUserError {
    code
    field
    message
  }
`;

export const CATEGORY_FILE_FRAGMENT = gql`
  fragment CategoryFileFields on File {
    id
    url
    originalName
    ext
    mimeType
    sizeBytes
    provider
    isProcessed
    altText
    createdAt
    updatedAt
    deletedAt
    deletionState
    dimensions {
      width
      height
    }
    durationMs
    externalData {
      externalId
      providerMeta
    }
    meta
    s3Data {
      bucketId
      etag
      objectKey
      storageClass
    }
    sourceUrl
    usage {
      totalCount
      fileActive
      byEntity {
        entityType
        count
      }
    }
  }
`;

export const CATEGORY_MEDIA_ITEM_FRAGMENT = gql`
  fragment CategoryMediaItemFields on CategoryMediaItem {
    sortIndex
    file {
      ...CategoryFileFields
    }
  }
`;

export const CATEGORY_LIST_FRAGMENT = gql`
  fragment CategoryListFields on Category {
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
        ...CategoryFileFields
      }
    }
    parent {
      id
      name
      handle
    }
  }
  ${CATEGORY_FILE_FRAGMENT}
`;

export const CATEGORY_MUTATION_RESULT_FRAGMENT = gql`
  fragment CategoryMutationResultFields on Category {
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
        ...CategoryFileFields
      }
    }
    parent {
      id
      name
      handle
    }
  }
  ${CATEGORY_FILE_FRAGMENT}
`;

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
      text
      html
      json
    }
    excerpt {
      text
      html
      json
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
        ...CategoryFileFields
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
  ${CATEGORY_FILE_FRAGMENT}
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
        ...CategoryFileFields
      }
    }
  }
  ${CATEGORY_FILE_FRAGMENT}
`;
