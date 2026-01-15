import { gql } from "@apollo/client";
import {
  USER_ERROR_FRAGMENT,
  PRODUCT_FRAGMENT,
  PRODUCT_BASIC_FRAGMENT,
  PRODUCT_OPTION_FRAGMENT,
  VARIANT_FRAGMENT,
  FILE_FRAGMENT,
} from "./fragments";

/**
 * GraphQL mutations for inventory domain.
 */

// ============================================
// Product Mutations
// ============================================

/**
 * Create a new empty product.
 * Returns a product with a default variant.
 */
export const PRODUCT_CREATE_MUTATION = gql`
  mutation ProductCreate {
    inventoryMutation {
      productCreate {
        product {
          id
          title
          handle
          variants(first: 1) {
            edges {
              node {
                id
                isDefault
              }
            }
          }
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Update an existing product.
 */
export const PRODUCT_UPDATE_MUTATION = gql`
  mutation ProductUpdate($input: ProductUpdateInput!) {
    inventoryMutation {
      productUpdate(input: $input) {
        product {
          ...ProductBasicFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_BASIC_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Delete a product.
 */
export const PRODUCT_DELETE_MUTATION = gql`
  mutation ProductDelete($input: ProductDeleteInput!) {
    inventoryMutation {
      productDelete(input: $input) {
        deletedProductId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

/**
 * Publish a product.
 */
export const PRODUCT_PUBLISH_MUTATION = gql`
  mutation ProductPublish($input: ProductPublishInput!) {
    inventoryMutation {
      productPublish(input: $input) {
        product {
          ...ProductBasicFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_BASIC_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Product Option Mutations
// ============================================

/**
 * Create a new product option.
 * This automatically creates variant combinations.
 */
export const PRODUCT_OPTION_CREATE_MUTATION = gql`
  mutation ProductOptionCreate($input: ProductOptionCreateInput!) {
    inventoryMutation {
      productOptionCreate(input: $input) {
        product {
          id
          options {
            ...ProductOptionFields
          }
          variants(first: 100) {
            edges {
              node {
                ...VariantFields
              }
            }
            totalCount
          }
        }
        option {
          ...ProductOptionFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${PRODUCT_OPTION_FRAGMENT}
  ${VARIANT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Variant Mutations
// ============================================

/**
 * Set media for a variant.
 */
export const VARIANT_SET_MEDIA_MUTATION = gql`
  mutation VariantSetMedia($input: VariantSetMediaInput!) {
    inventoryMutation {
      variantSetMedia(input: $input) {
        variant {
          ...VariantFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${VARIANT_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

// ============================================
// Media Mutations
// ============================================

/**
 * Upload a file to the media service.
 */
export const FILE_UPLOAD_MUTATION = gql`
  mutation FileUpload($input: FileUploadMultipartInput!) {
    mediaMutation {
      fileUpload(input: $input) {
        file {
          ...FileFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${FILE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;
