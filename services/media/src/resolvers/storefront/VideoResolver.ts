import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { SubgraphReference } from "@shopana/type-resolver";
import type { File } from "../../repositories/models/index.js";
import {
  loadStorefrontFile,
  resolvePreviewImageId,
  resolveSourceFormat,
} from "./helpers/storefrontFile.js";
import { MediaType } from "./MediaType.js";

@SubgraphReference()
export class VideoResolver extends MediaType<string, File> {
  $preload() {
    return loadStorefrontFile(this.$ctx, this.$props, ["VIDEO"]);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.File);
  }

  async alt() {
    return this.$get("altText");
  }

  mediaContentType() {
    return "VIDEO" as const;
  }

  async previewImage() {
    const previewId = await resolvePreviewImageId(this.$ctx, await this.$data);
    return previewId ? this.resolvers.image(previewId) : null;
  }

  async sources() {
    const [file, preparedSources] = await Promise.all([
      this.$data,
      this.$ctx.kernel.repository.mediaSource.getByMediaFileId(this.$props),
    ]);
    return Promise.all([
      this.resolvers.videoSource({
        fileId: file.id,
        format: resolveSourceFormat(file),
      }),
      ...preparedSources.map((source) =>
        this.resolvers.videoSource({
          fileId: source.sourceFileId,
          format: source.format,
        }),
      ),
    ]);
  }
}
