import { gql } from '@apollo/client';

export const ProductFragment = gql`
  fragment ProductFragment on Product {
    title
    description
    seoTitle
    seoDescription
    excerpt
    createdAt
    requiresShipping
    updatedAt
    slug
    status
    id
    tags {
      ...TagFragment
    }
    variants {
      ...VariantFragment
    }
    primaryCategory {
      id
      title
    }
    featuresV2 {
      ...ProductFeatureV2Fragment
    }
    optionsV2 {
      ...ProductFeatureV2Fragment
    }
    __typename
  }
`;

export const ProductGroupFragment = gql`
  fragment ProductGroupFragment on ProductGroup {
    id
    title
    items {
      id
      priceType
      priceAmountValue
      pricePercentageValue
      maxQuantity
      sortIndex
      variant {
        ...VariantFragment
      }
    }
    isRequired
    isMultiple
    sortIndex
  }
`;

export const VariantFragment = gql`
  fragment VariantFragment on Variant {
    __typename
    barcode
    costPrice
    createdAt
    id
    oldPrice
    price
    sku
    slug
    stockStatus
    updatedAt
    containerId
    variantSortIndex
    inListing
    weight
    weightUnit
    length
    width
    height
    dimensionUnit
    title
    cover {
      ...FileFragment
    }
    gallery {
      ...FileFragment
    }
    categories {
      id
      title
    }
    features {
      ...ProductFeatureFragment
    }
    featuresV2 {
      ...ProductFeatureV2Fragment
    }
  }
`;

export const ListingProductFragment = gql`
  fragment ListingProductFragment on Variant {
    __typename
    id
    slug
    title
    containerId
    containerTitle
    cover {
      ...FileFragment
    }
    features {
      ...ProductFeatureFragment
    }
    featuresV2 {
      ...ProductFeatureV2Fragment
    }
  }
`;

export const ProductFeatureFragment = gql`
  fragment ProductFeatureFragment on ProductFeature {
    featureId
    title
    slug
    attributeSortIndex
    optionSortIndex
    isAttribute
    isOption
    group {
      id
      title
      slug
      featureStyleType
    }
    swatch {
      ...FeatureSwatchFragment
    }
  }
`;

export const FeatureSwatchFragment = gql`
  fragment FeatureSwatchFragment on FeatureSwatch {
    id
    color1
    color2
    type
    image {
      ...FileFragment
    }
  }
`;

export const ProductFeatureSwatchV2Fragment = gql`
  fragment ProductFeatureSwatchV2Fragment on ProductFeatureSwatchV2 {
    id
    color1
    color2
    type
  }
`;

export const ProductFeatureV2Fragment = gql`
  fragment ProductFeatureV2Fragment on ProductFeatureV2 {
    featureId
    title
    slug
    attributeSortIndex
    optionSortIndex
    isAttribute
    isOption
    styleType
    group {
      id
      title
      slug
      featureStyleType
    }
    swatch {
      ...ProductFeatureSwatchV2Fragment
    }
  }
`;
