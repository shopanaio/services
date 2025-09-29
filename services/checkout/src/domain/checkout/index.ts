/**
 * Checkout domain module exports
 *
 * This file provides a clean interface for importing checkout domain entities,
 * value objects, and services from outside the domain.
 */

// Core types and state
export * from "./types";

// Domain model and entities
export * from "./model";

// Value objects and snapshots
export * from "./cost";
export * from "./discount";

// Domain services
export * from "./validator";
export * from "./deliveryGrouping";

// Serialization
export * from "./checkout-serializer";
