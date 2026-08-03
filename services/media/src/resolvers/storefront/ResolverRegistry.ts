import type { ServiceContext } from "../../context/types.js";
import type { File } from "../../repositories/models/index.js";
import type { StorefrontSourceInput } from "./VideoSourceResolver.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(ctx: ServiceContext): ResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;

  const registry = new ResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async image(id: string) {
    const { ImageResolver } = await import("./ImageResolver.js");
    return new ImageResolver(id, this.ctx);
  }

  async genericFile(id: string) {
    const { GenericFileResolver } = await import("./GenericFileResolver.js");
    return new GenericFileResolver(id, this.ctx);
  }

  async mediaImage(id: string) {
    const { MediaImageResolver } = await import("./MediaImageResolver.js");
    return new MediaImageResolver(id, this.ctx);
  }

  async video(id: string) {
    const { VideoResolver } = await import("./VideoResolver.js");
    return new VideoResolver(id, this.ctx);
  }

  async externalVideo(id: string) {
    const { ExternalVideoResolver } = await import(
      "./ExternalVideoResolver.js"
    );
    return new ExternalVideoResolver(id, this.ctx);
  }

  async model3d(id: string) {
    const { Model3dResolver } = await import("./Model3dResolver.js");
    return new Model3dResolver(id, this.ctx);
  }

  async videoSource(input: StorefrontSourceInput) {
    const { VideoSourceResolver } = await import("./VideoSourceResolver.js");
    return new VideoSourceResolver(input, this.ctx);
  }

  async model3dSource(input: StorefrontSourceInput) {
    const { Model3dSourceResolver } = await import(
      "./Model3dSourceResolver.js"
    );
    return new Model3dSourceResolver(input, this.ctx);
  }

  async media(id: string, file?: File | null) {
    const item = file ?? (await this.ctx.loaders.file.load(id));
    switch (item?.mediaType) {
      case "IMAGE":
        return this.mediaImage(id);
      case "VIDEO":
        return this.video(id);
      case "EXTERNAL_VIDEO":
        return this.externalVideo(id);
      case "MODEL_3D":
        return this.model3d(id);
      default:
        return null;
    }
  }
}
