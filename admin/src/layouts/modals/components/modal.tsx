"use client";

import { App, Modal } from "antd";
import { ReactNode, Suspense, useState } from "react";
import { createStyles, createGlobalStyle, useAntdToken } from "antd-style";

import { ModalStackProvider } from "./provider";
import { modalStackRegistry } from "../registry/modal-registry";
import { useModalStackStore } from "../store/modals";
import type { IModalStackItem, IModalStackContext } from "../types";

interface IModalStackItemProps {
  children?: ReactNode;
  level: number;
  totalCount: number;
  item: IModalStackItem;
}

const SCALE_FACTOR = 0.1;

interface StyleProps {
  hasChildren: boolean;
  depth: number;
  totalCount: number;
}

const useStyles = createStyles(
  ({ css, token }, { hasChildren, depth, totalCount }: StyleProps) => {
    const scale = hasChildren ? 1 - SCALE_FACTOR * depth : 1;
    const translateY = hasChildren ? -token.paddingXS * depth : 0;
    // Only show active item (depth=0) and the one behind it (depth=1)
    // Hide items at depth >= 2
    const opacity = depth >= 2 ? 0 : 1;
    // Active modal (depth=0) gets 24px top padding when there's more than one modal in stack
    const topPadding = depth === 0 && totalCount > 1 ? 24 : token.padding;

    return {
      wrapper: css`
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: ${topPadding}px ${token.padding}px ${token.padding}px;
        transform: scale(${scale}) translateY(${translateY}px);
        transform-origin: top center;
        transition: transform ${token.motionDurationSlow} ease-out,
          opacity ${token.motionDurationMid} ease-out;
        pointer-events: ${hasChildren ? "none" : "auto"};
        opacity: ${opacity};
      `,
      container: css`
        height: calc(100vh - ${topPadding + token.padding}px);
        width: calc(100vw - ${token.padding * 2}px);
        padding: 0 !important;
        background-color: ${token.colorBgLayout} !important;
        overflow: hidden;
      `,
      body: css`
        height: 100%;
        padding: 0 !important;
      `,
    };
  }
);

const GlobalModalStackStyles = createGlobalStyle`
  @keyframes modalStackSlideUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes modalStackSlideDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(40px);
    }
  }

  @keyframes modalStackFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes modalStackFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .modal-stack-slide-up-enter,
  .modal-stack-slide-up-appear {
    animation: modalStackSlideUp 0.35s ease-out 0.1s forwards;
    opacity: 0;
  }

  .modal-stack-slide-up-leave {
    animation: modalStackSlideDown 0.25s ease-in forwards;
  }

  .modal-stack-fade-enter,
  .modal-stack-fade-appear {
    animation: modalStackFadeIn 0.3s ease-out forwards;
  }

  .modal-stack-fade-leave {
    animation: modalStackFadeOut 0.25s ease-in forwards;
  }
`;

// ============================================================================
// Component
// ============================================================================

/**
 * Modal stack item wrapper component
 * Handles individual item rendering with stacking effects
 */
export const ModalStackItem = ({
  children = null,
  level,
  totalCount,
  item,
}: IModalStackItemProps) => {
  const { type, uuid, isDirty } = item;
  const [isOpen, setIsOpen] = useState(true);
  const { modal } = App.useApp();

  const pop = useModalStackStore((state) => state.pop);
  const setDirty = useModalStackStore((state) => state.setDirty);
  const updatePayload = useModalStackStore((state) => state.updatePayload);
  const token = useAntdToken();
  const hasChildren = !!children;
  const depth = totalCount - level - 1;

  const { styles } = useStyles({ hasChildren, depth, totalCount });

  const clearAfterClose = (open: boolean) => {
    if (open) return;
    pop(uuid);
  };

  const onPop = async () => {
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

  const onForcePop = () => {
    setIsOpen(false);
  };

  const onSetDirty = (dirty: boolean) => {
    setDirty(uuid, dirty);
  };

  const onUpdatePayload = (payload: Record<string, unknown>) => {
    updatePayload(uuid, payload);
  };

  const definition = modalStackRegistry.get(type);

  // Let React Compiler handle memoization
  const contextValue: IModalStackContext = {
    uuid,
    type,
    payload: item.payload,
    isDirty: isDirty ?? false,
    pop: onPop,
    forcePop: onForcePop,
    setDirty: onSetDirty,
    updatePayload: onUpdatePayload,
  };

  if (!definition) {
    console.error(`[ModalStackItem] Unknown item type: ${type}`);
    return null;
  }

  const Component = definition.component;

  return (
    <>
      <GlobalModalStackStyles />
      <Modal
        open={isOpen}
        centered
        onCancel={onPop}
        afterOpenChange={clearAfterClose}
        footer={null}
        closable={false}
        destroyOnHidden
        transitionName="modal-stack-slide-up"
        maskTransitionName="modal-stack-fade"
        mask={level === 0}
        width={`calc(100wv - ${token.padding * 2}px)`}
        classNames={{
          wrapper: styles.wrapper,
          container: styles.container,
          body: styles.body,
        }}
      >
        <ModalStackProvider value={contextValue}>
          <Suspense fallback={null}>
            <Component />
          </Suspense>
        </ModalStackProvider>
        {children}
      </Modal>
    </>
  );
};
