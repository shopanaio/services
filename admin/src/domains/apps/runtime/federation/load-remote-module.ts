import type { ComponentType } from "react";
import type { AdminAppUiDescriptor } from "../descriptor-schema";
import { AdminAppRemoteLoadError } from "./errors";
import { getFederationRuntime } from "./runtime";
import { registerAdminAppRemote } from "./register-remote";

type RemoteModule = { default: ComponentType<never> };
type LocalModuleLoader = () => Promise<RemoteModule>;

const localModules = new Map<string, LocalModuleLoader>();
const loadedModules = new Map<string, Promise<RemoteModule>>();
const REMOTE_LOAD_TIMEOUT_MS = 15_000;
const REMOTE_LOAD_ATTEMPTS = 2;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error(`Remote load timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function registerLocalAdminAppModule<TProps>(
  remoteName: string,
  module: string,
  loader: () => Promise<{ default: ComponentType<TProps> }>,
): void {
  localModules.set(`${remoteName}:${module}`, loader as unknown as LocalModuleLoader);
}

export function loadAdminAppRemoteModule(
  descriptor: AdminAppUiDescriptor,
  module: string,
): Promise<RemoteModule> {
  const cacheKey = `${descriptor.remote.name}:${module}`;
  const current = loadedModules.get(cacheKey);
  if (current) {
    return current;
  }

  const promise = (async () => {
    try {
      const localLoader = localModules.get(cacheKey);
      if (localLoader) {
        return await localLoader();
      }

      let lastError: unknown;
      for (let attempt = 1; attempt <= REMOTE_LOAD_ATTEMPTS; attempt += 1) {
        try {
          await registerAdminAppRemote(descriptor);
          const runtime = await getFederationRuntime();
          const exposed = module.replace(/^\.\//, "");
          const loaded = await withTimeout(
            runtime.loadRemote<RemoteModule>(`${descriptor.remote.name}/${exposed}`),
            REMOTE_LOAD_TIMEOUT_MS,
          );
          if (!loaded?.default) {
            throw new Error("Remote module has no default component export");
          }
          console.info("[AdminApps] Remote module loaded", {
            appCode: descriptor.appCode,
            version: descriptor.version,
            module,
            attempt,
          });
          return loaded;
        } catch (error) {
          lastError = error;
          console.warn("[AdminApps] Remote module load attempt failed", {
            appCode: descriptor.appCode,
            version: descriptor.version,
            module,
            attempt,
          });
        }
      }
      throw lastError;
    } catch (error) {
      throw new AdminAppRemoteLoadError(descriptor.appCode, module, error);
    }
  })();

  loadedModules.set(cacheKey, promise);
  return promise;
}
