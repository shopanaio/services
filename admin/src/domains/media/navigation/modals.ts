import { createModalStackHook } from "@/layouts/modals";
import type { IModalStackPayload } from "@/layouts/modals/types";
import type {
  NavigationLinkFormValues,
  NavigationMenuItem,
} from "./types";

export const NAVIGATION_MENU_MODAL_TYPE = "navigation-menu";
export const NAVIGATION_LINK_MODAL_TYPE = "navigation-link";

export interface NavigationMenuModalPayload extends IModalStackPayload {
  entityId: string;
}

export interface NavigationLinkModalPayload extends IModalStackPayload {
  link: NavigationLinkFormValues;
  onSaved: (item: NavigationMenuItem) => void;
}

declare module "@/layouts/modals" {
  interface ModalStackPayloads {
    [NAVIGATION_MENU_MODAL_TYPE]: NavigationMenuModalPayload;
    [NAVIGATION_LINK_MODAL_TYPE]: NavigationLinkModalPayload;
  }
}

export const useNavigationMenuModal = createModalStackHook(
  NAVIGATION_MENU_MODAL_TYPE,
);
export const useNavigationLinkModal = createModalStackHook(
  NAVIGATION_LINK_MODAL_TYPE,
);
