import type DataLoader from "dataloader";
import type {
  Customer,
  CustomerAddress,
  CustomerConsent,
  CustomerConsentEvent,
  CustomerDataRequest,
  CustomerGroup,
  CustomerGroupMembership,
  CustomerMerge,
  CustomerMonetaryStatistics,
  CustomerSegment,
  CustomerSegmentMembership,
  CustomerStatistics,
  CustomerTag,
  CustomerTagAssignment,
  CustomerTaxExemption,
  CustomerTaxIdentifier,
  CustomerWishlist,
  CustomerWishlistItem,
} from "../repositories/models/index.js";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository.js";
import { CustomerAddressLoader } from "./CustomerAddressLoader.js";
import { CustomerConsentLoader } from "./CustomerConsentLoader.js";
import { CustomerGroupLoader } from "./CustomerGroupLoader.js";
import { CustomerLifecycleLoader } from "./CustomerLifecycleLoader.js";
import { CustomerLoader } from "./CustomerLoader.js";
import { CustomerSegmentLoader } from "./CustomerSegmentLoader.js";
import { CustomerStatisticsLoader } from "./CustomerStatisticsLoader.js";
import { CustomerTagLoader } from "./CustomerTagLoader.js";
import { CustomerTaxLoader } from "./CustomerTaxLoader.js";
import {
  CustomerWishlistLoader,
  type CustomerWishlistLoaderOptions,
} from "./CustomerWishlistLoader.js";

export type LoaderOptions = Omit<CustomerWishlistLoaderOptions, "broker"> & {
  broker?: ServiceBroker;
};

export class Loader {
  readonly customer: DataLoader<string, Customer | null>;
  readonly address: DataLoader<string, CustomerAddress | null>;
  readonly addressesByCustomer: DataLoader<string, CustomerAddress[]>;
  readonly taxIdentifier: DataLoader<string, CustomerTaxIdentifier | null>;
  readonly taxExemption: DataLoader<string, CustomerTaxExemption | null>;
  readonly consent: DataLoader<string, CustomerConsent | null>;
  readonly consentEvent: DataLoader<string, CustomerConsentEvent | null>;
  readonly consentsByCustomer: DataLoader<string, CustomerConsent[]>;
  readonly group: DataLoader<string, CustomerGroup | null>;
  readonly groupMembership: DataLoader<
    string,
    CustomerGroupMembership | null
  >;
  readonly groupCustomersCount: DataLoader<string, number>;
  readonly tag: DataLoader<string, CustomerTag | null>;
  readonly tagAssignment: DataLoader<string, CustomerTagAssignment | null>;
  readonly tagCustomersCount: DataLoader<string, number>;
  readonly segment: DataLoader<string, CustomerSegment | null>;
  readonly segmentMembership: DataLoader<
    string,
    CustomerSegmentMembership | null
  >;
  readonly segmentCustomersCount: DataLoader<string, number>;
  readonly statisticsByCustomer: DataLoader<
    string,
    CustomerStatistics | null
  >;
  readonly monetaryStatistics: DataLoader<
    string,
    CustomerMonetaryStatistics | null
  >;
  readonly customerMerge: DataLoader<string, CustomerMerge | null>;
  readonly customerDataRequest: DataLoader<string, CustomerDataRequest | null>;
  readonly wishlist: DataLoader<string, CustomerWishlist | null>;
  readonly wishlistItem: DataLoader<string, CustomerWishlistItem | null>;
  readonly defaultWishlist: DataLoader<string, CustomerWishlist | null>;
  readonly publishedWishlistProduct: DataLoader<string, boolean>;

  constructor(
    public readonly repository: Repository,
    options: LoaderOptions = {},
  ) {
    const customerLoader = new CustomerLoader(repository);
    const addressLoader = new CustomerAddressLoader(repository);
    const taxLoader = new CustomerTaxLoader(repository);
    const consentLoader = new CustomerConsentLoader(repository);
    const groupLoader = new CustomerGroupLoader(repository);
    const tagLoader = new CustomerTagLoader(repository);
    const segmentLoader = new CustomerSegmentLoader(repository);
    const statisticsLoader = new CustomerStatisticsLoader(repository);
    const lifecycleLoader = new CustomerLifecycleLoader(repository);
    const wishlistLoader = new CustomerWishlistLoader(repository, options);

    this.customer = customerLoader.customer;
    this.address = addressLoader.address;
    this.addressesByCustomer = addressLoader.addressesByCustomer;
    this.taxIdentifier = taxLoader.taxIdentifier;
    this.taxExemption = taxLoader.taxExemption;
    this.consent = consentLoader.consent;
    this.consentEvent = consentLoader.consentEvent;
    this.consentsByCustomer = consentLoader.consentsByCustomer;
    this.group = groupLoader.group;
    this.groupMembership = groupLoader.groupMembership;
    this.groupCustomersCount = groupLoader.groupCustomersCount;
    this.tag = tagLoader.tag;
    this.tagAssignment = tagLoader.tagAssignment;
    this.tagCustomersCount = tagLoader.tagCustomersCount;
    this.segment = segmentLoader.segment;
    this.segmentMembership = segmentLoader.segmentMembership;
    this.segmentCustomersCount = segmentLoader.segmentCustomersCount;
    this.statisticsByCustomer = statisticsLoader.statisticsByCustomer;
    this.monetaryStatistics = statisticsLoader.monetaryStatistics;
    this.customerMerge = lifecycleLoader.customerMerge;
    this.customerDataRequest = lifecycleLoader.customerDataRequest;
    this.wishlist = wishlistLoader.wishlist;
    this.wishlistItem = wishlistLoader.wishlistItem;
    this.defaultWishlist = wishlistLoader.defaultWishlist;
    this.publishedWishlistProduct = wishlistLoader.publishedWishlistProduct;
  }
}
