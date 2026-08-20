import type { Delivery } from "@shopana/broker-types";
import type {
  DeliveryProviderAssetPolicyPort,
  DeliveryProviderAssetsPort,
  DeliveryProviderObservationNormalizerPort,
} from "../../contracts/ports.js";
import { revision } from "../../domain/canonical.js";

export class DeliveryProviderObservationNormalizer implements DeliveryProviderObservationNormalizerPort {
  constructor(
    private readonly deps: {
      policies: DeliveryProviderAssetPolicyPort;
      assets: DeliveryProviderAssetsPort;
    },
  ) {}

  async normalize(
    input: Parameters<DeliveryProviderObservationNormalizerPort["normalize"]>[0],
  ): Promise<Awaited<ReturnType<DeliveryProviderObservationNormalizerPort["normalize"]>>> {
    const allowedPackages = new Set(input.current.packages.map(({ packageId }) => packageId));
    const existing = new Map(
      input.current.parcels.flatMap((parcel) =>
        parcel.providerParcelReference ? [[parcel.providerParcelReference, parcel] as const] : [],
      ),
    );
    const providerReferences = new Set<string>();
    const observedPackageIds = new Set<string>();
    let policy: Awaited<ReturnType<DeliveryProviderAssetPolicyPort["resolve"]>> | null = null;
    const parcels: Delivery.DeliveryParcelSnapshot[] = [];
    for (const observation of input.parcels) {
      if (providerReferences.has(observation.providerParcelReference))
        return rejected(
          "DELIVERY_PROVIDER_PARCEL_DUPLICATE",
          "Provider parcel references must be unique",
        );
      providerReferences.add(observation.providerParcelReference);
      if (observation.packageIds.some((id) => !allowedPackages.has(id)))
        return rejected(
          "DELIVERY_PROVIDER_PACKAGE_UNKNOWN",
          "Provider parcel refers to an unknown package",
        );
      if (observation.packageIds.some((id) => observedPackageIds.has(id)))
        return rejected(
          "DELIVERY_PROVIDER_PACKAGE_DUPLICATE",
          "A package cannot belong to multiple provider parcels",
        );
      observation.packageIds.forEach((id) => observedPackageIds.add(id));
      const prior = existing.get(observation.providerParcelReference);
      const parcelId =
        prior?.parcelId ??
        revision("dparcel_v1", [input.current.shipmentId, observation.providerParcelReference]);
      const labels = [...(prior?.labels ?? [])];
      for (const providerLabel of observation.labels) {
        policy ??= await this.deps.policies.resolve({
          storeId: input.current.storeId,
          providerAccountId: input.current.providerAccountId,
          route: input.route,
        });
        const ingested = await this.deps.assets.ingestLabel({
          storeId: input.current.storeId,
          policy,
          route: input.route,
          providerAccountId: input.current.providerAccountId,
          shipmentId: input.current.shipmentId,
          providerParcelReference: observation.providerParcelReference,
          label: providerLabel,
        });
        if (ingested.status === "REJECTED") return ingested;
        if (!labels.some(({ mediaId }) => mediaId === ingested.label.mediaId))
          labels.push(ingested.label);
      }
      parcels.push({
        parcelId,
        providerParcelReference: observation.providerParcelReference,
        packageIds: observation.packageIds,
        state: observation.state,
        tracking: observation.tracking,
        labels,
        estimatedDeliveryAt: observation.estimatedDeliveryAt,
        deliveredAt: observation.deliveredAt,
      });
    }
    for (const parcel of input.current.parcels) {
      if (parcel.providerParcelReference && !providerReferences.has(parcel.providerParcelReference))
        parcels.push(parcel);
    }
    const parcelByReference = new Map(
      parcels.map((parcel) => [parcel.providerParcelReference, parcel.parcelId]),
    );
    const events = input.events.map((event): Delivery.DeliveryTrackingEventSnapshot => ({
      ...event,
      parcelId: event.providerParcelReference
        ? (parcelByReference.get(event.providerParcelReference) ??
          existing.get(event.providerParcelReference)?.parcelId ??
          null)
        : null,
    }));
    if (events.some((event) => event.providerParcelReference !== null && event.parcelId === null)) {
      return rejected(
        "DELIVERY_PROVIDER_EVENT_PARCEL_UNKNOWN",
        "Tracking event refers to an unknown parcel",
      );
    }
    return { status: "NORMALIZED", parcels, events };
  }
}

function rejected(code: string, message: string, retryable = false) {
  return { status: "REJECTED" as const, code, message, retryable };
}
