import { gql } from "@apollo/client";

export const GENERAL_SETTINGS_STORE_FRAGMENT = gql`
  fragment GeneralSettingsStoreFields on Store {
    id
    revision
    name
    displayName
    status
    email
    defaultLocale
    languageSettings {
      code
      name
      isActive
    }
    contactDetails {
      name
      slug
      email
      phoneNumbers
    }
    address {
      companyName
      countryCode
      addressLine1
      addressLine2
      city
      administrativeArea
      postalCode
    }
    brand {
      defaultLogo {
        id
        url
      }
      squareLogo {
        id
        url
      }
      coverImage {
        id
        url
      }
      primaryColor
      secondaryColor
      slogan
      shortDescription
      socialLinks {
        platform
        url
      }
    }
    defaults {
      unitSystem
      defaultWeightUnit
      defaultDimensionUnit
      timezone
    }
    currencySettings {
      currencyCode
      currencyDisplay
      currencySign
      grouping
      signDisplay
      minimumFractionDigits
      maximumFractionDigits
      roundingMode
      trailingZeroDisplay
    }
    orderProcessing {
      orderNumberPrefix
      orderNumberSuffix
      requireCheckoutConfirmation
      automaticFulfillmentMode
      automaticallyArchiveOrders
    }
  }
`;
