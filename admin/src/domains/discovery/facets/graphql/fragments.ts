import { gql } from "@apollo/client";
import { FILE_FRAGMENT } from "@/domains/inventory/graphql/shared-fragments";

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
    handle
    kind
    sortIndex
    enabled
    parent {
      id
      label
      handle
    }
    sourceValues {
      id
      label
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
    scopes
    selectionMode
    lexoRank
    sources {
      handle
      name
    }
    values {
      ...FacetValueGridFields
    }
  }
  ${FACET_VALUE_GRID_FRAGMENT}
`;
