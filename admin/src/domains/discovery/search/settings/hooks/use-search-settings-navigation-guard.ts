"use client";

import { useEffect, useRef } from "react";

const UNSAVED_MESSAGE =
  "You have unsaved search settings. Are you sure you want to leave?";

export function useSearchSettingsNavigationGuard(
  isDirty: boolean,
  isSaving: boolean,
) {
  const stateRef = useRef({ isDirty, isSaving });

  useEffect(() => {
    stateRef.current = { isDirty, isSaving };
  }, [isDirty, isSaving]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!stateRef.current.isDirty && !stateRef.current.isSaving) return;
      event.preventDefault();
    };

    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;

      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.href === window.location.href
      ) {
        return;
      }

      if (stateRef.current.isSaving) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (stateRef.current.isDirty && !window.confirm(UNSAVED_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const popState = () => {
      if (stateRef.current.isSaving) {
        window.history.forward();
        return;
      }
      if (stateRef.current.isDirty && !window.confirm(UNSAVED_MESSAGE)) {
        window.history.forward();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", popState);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
      window.removeEventListener("popstate", popState);
    };
  }, []);
}
