"use client";

import { App, Modal } from "antd";
import { ReactNode, Suspense, useMemo, useState } from "react";
import { createStyles, createGlobalStyle, useAntdToken } from "antd-style";

import { ModalProvider } from "./Provider";
import { modalRegistry } from "../registry/modalRegistry";
import { useModalsStore } from "../store/modals";
import type { IModalItem, IModalContext } from "../types";

interface IModalWrapperProps {
  children?: ReactNode;
  level: number;
  totalCount: number;
  modalItem: IModalItem;
}

const SCALE_FACTOR = 0.03;

interface StyleProps {
  hasChildren: boolean;
  depth: number;
}

const useStyles = createStyles(
  ({ css, token }, { hasChildren, depth }: StyleProps) => {
    const scale = hasChildren ? 1 - SCALE_FACTOR * depth : 1;
    const translateY = hasChildren ? -token.paddingXS * depth : 0;

    return {
      wrapper: css`
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: ${token.padding}px;
        transform: scale(${scale}) translateY(${translateY}px);
        transform-origin: top center;
        transition: transform ${token.motionDurationMid} ease-out;
        pointer-events: ${hasChildren ? "none" : "auto"};
      `,
      container: css`
        height: calc(100vh - ${token.padding * 2}px);
        width: calc(100vw - ${token.padding * 2}px);
      `,
    };
  }
);

const GlobalModalStyles = createGlobalStyle`
  @keyframes modalSlideUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes modalSlideDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(40px);
    }
  }

  @keyframes modalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modalFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .modal-slide-up-enter,
  .modal-slide-up-appear {
    animation: modalSlideUp 0.35s ease-out 0.1s forwards;
    opacity: 0;
  }

  .modal-slide-up-leave {
    animation: modalSlideDown 0.25s ease-in forwards;
  }

  .modal-fade-enter,
  .modal-fade-appear {
    animation: modalFadeIn 0.3s ease-out forwards;
  }

  .modal-fade-leave {
    animation: modalFadeOut 0.25s ease-in forwards;
  }
`;

// ============================================================================
// Component
// ============================================================================

/**
 * Modal wrapper component
 * Handles individual modal rendering with stacking effects
 */
export const ModalWrapper = ({
  children = null,
  level,
  totalCount,
  modalItem,
}: IModalWrapperProps) => {
  const { type, uuid, isDirty } = modalItem;
  const [isOpen, setIsOpen] = useState(true);
  const { modal } = App.useApp();

  const closeModal = useModalsStore((state) => state.closeModal);
  const setDirty = useModalsStore((state) => state.setDirty);
  const updatePayload = useModalsStore((state) => state.updatePayload);
  const token = useAntdToken();
  const hasChildren = !!children;
  const depth = totalCount - level - 1;

  const { styles } = useStyles({ hasChildren, depth });

  const clearAfterClose = (open: boolean) => {
    if (open) return;
    closeModal(uuid);
  };

  const onClose = async () => {
    if (isDirty) {
      const result = await modal.confirm({
        icon: null,
        okButtonProps: {
          "data-testid": "modal-confirm-leave",
        },
        cancelButtonProps: {
          "data-testid": "modal-cancel-leave",
        },
        title: "Unsaved changes",
        content: "You have unsaved changes. Are you sure you want to leave?",
      });

      if (!result) {
        return;
      }
    }

    setIsOpen(false);
  };

  const onForceClose = () => {
    setIsOpen(false);
  };

  const onSetDirty = (dirty: boolean) => {
    setDirty(uuid, dirty);
  };

  const onUpdatePayload = (payload: Record<string, unknown>) => {
    updatePayload(uuid, payload);
  };

  const definition = modalRegistry.get(type);

  const contextValue: IModalContext = useMemo(
    () => ({
      uuid,
      type,
      payload: modalItem.payload,
      isDirty: isDirty ?? false,
      close: onClose,
      forceClose: onForceClose,
      setDirty: onSetDirty,
      updatePayload: onUpdatePayload,
    }),
    [uuid, type, modalItem.payload, isDirty]
  );

  if (!definition) {
    console.error(`[ModalWrapper] Unknown modal type: ${type}`);
    return null;
  }

  const Component = definition.component;

  return (
    <>
      <GlobalModalStyles />
      <Modal
        open={isOpen}
        centered
        onCancel={onClose}
        afterOpenChange={clearAfterClose}
        footer={null}
        closable={false}
        destroyOnHidden
        transitionName="modal-slide-up"
        maskTransitionName="modal-fade"
        mask={level === 0}
        width={`calc(100wv - ${token.padding * 2}px)`}
        classNames={{
          wrapper: styles.wrapper,
          container: styles.container,
        }}
      >
        <ModalProvider value={contextValue}>
          <Suspense fallback={null}>
            <Component />
          </Suspense>
        </ModalProvider>
        {children}
      </Modal>
    </>
  );
};
