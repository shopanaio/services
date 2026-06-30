import type { OutputData } from "@editorjs/editorjs";
import type { UseFormSetError, UseFormSetValue } from "react-hook-form";
import type { ApiFile } from "@/graphql/types";

export interface EntityIdentityFormValues {
  title: string;
  handle: string;
}

export interface EntityContentFormValues {
  description: OutputData | null;
  excerpt: OutputData | null;
}

export interface EntitySeoFormValues {
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: ApiFile | null;
}

export interface EntityIdentitySubmitHelpers {
  setError: UseFormSetError<EntityIdentityFormValues>;
}

export interface EntitySeoSubmitHelpers {
  setError: UseFormSetError<EntitySeoFormValues>;
}

export interface EntityContentExtraRenderContext {
  setValue: UseFormSetValue<EntityContentFormValues>;
}

export type EntityEditSubmitResult =
  | boolean
  | void
  | Promise<boolean | void>;
