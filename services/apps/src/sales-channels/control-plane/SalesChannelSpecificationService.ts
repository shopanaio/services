import { Injectable } from "@nestjs/common";
import type {
  AppManifest,
  SalesChannelSpecification,
} from "@shopana/app-sdk";
import { Repository } from "../../repositories/Repository.js";

@Injectable()
export class SalesChannelSpecificationService {
  constructor(private readonly repository: Repository) {}

  fromManifest(
    manifest: AppManifest,
  ): readonly SalesChannelSpecification[] {
    return manifest.schemaVersion === 2
      ? manifest.extensions.salesChannels?.specifications ?? []
      : [];
  }

  findById(id: string) {
    return this.repository.salesChannelSpecification.findById(id);
  }

  findByIdForStore(id: string) {
    return this.repository.salesChannelSpecification.findByIdForStore(id);
  }

  listByInstallation(installationId: string, appVersion?: string) {
    return this.repository.salesChannelSpecification.listByInstallation(
      installationId,
      appVersion,
    );
  }
}
