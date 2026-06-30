import { gql } from "@apollo/client";
import { FILE_FRAGMENT } from "../../graphql/shared-fragments";

export const FACET_SWATCH_FRAGMENT = gql`
  fragment FacetSwatchFields on FacetSwatch {
    id
    swatchType
    colorOne
    colorTwo
    file {
      ...FileFields
    }
    metadata
  }
  ${FILE_FRAGMENT}
`;

export const FACET_VALUE_GRID_FRAGMENT = gql`
  fragment FacetValueGridFields on FacetValue {
    id
    label
    slug: handle
    sortIndex
    enabled
    sourceValues {
      handle
    }
    swatch {
      ...FacetSwatchFields
    }
  }
  ${FACET_SWATCH_FRAGMENT}
`;

export const FACET_GRID_FRAGMENT = gql`
  fragment FacetGridFields on Facet {
    id
    label
    slug
    facetType
    uiType
    selectionMode
    lexoRank
    values {
      ...FacetValueGridFields
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
`;
