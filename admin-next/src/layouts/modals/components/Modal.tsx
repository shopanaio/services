"use client";

import { App, Modal } from "antd";
import { ReactNode, Suspense, useState } from "react";
import { createStyles, createGlobalStyle, useAntdToken } from "antd-style";

import { StackItemProvider } from "./Provider";
import { stackRegistry } from "../registry/modalRegistry";
import { useStackStore } from "../store/modals";
import type { IStackItem, IStackItemContext } from "../types";

interface IStackItemWrapperProps {
  children?: ReactNode;
  level: number;
  totalCount: number;
  stackItem: IStackItem;
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
    // Only show active item (depth=0) and the one behind it (depth=1)
    // Hide items at depth >= 2
    const opacity = depth >= 2 ? 0 : 1;

    return {
      wrapper: css`
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: ${token.padding}px;
        transform: scale(${scale}) translateY(${translateY}px);
        transform-origin: top center;
        transition:
          transform ${token.motionDurationMid} ease-out,
          opacity ${token.motionDurationMid} ease-out;
        pointer-events: ${hasChildren ? "none" : "auto"};
        opacity: ${opacity};
      `,
      container: css`
        height: calc(100vh - ${token.padding * 2}px);
        width: calc(100vw - ${token.padding * 2}px);
      `,
    };
  }
);

const GlobalStackStyles = createGlobalStyle`
  @keyframes stackSlideUp {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes stackSlideDown {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(40px);
    }
  }

  @keyframes stackFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes stackFadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .stack-slide-up-enter,
  .stack-slide-up-appear {
    animation: stackSlideUp 0.35s ease-out 0.1s forwards;
    opacity: 0;
  }

  .stack-slide-up-leave {
    animation: stackSlideDown 0.25s ease-in forwards;
  }

  .stack-fade-enter,
  .stack-fade-appear {
    animation: stackFadeIn 0.3s ease-out forwards;
  }

  .stack-fade-leave {
    animation: stackFadeOut 0.25s ease-in forwards;
  }
`;

// ============================================================================
// Component
// ============================================================================

/**
 * Stack item wrapper component
 * Handles individual stack item rendering with stacking effects
 */
export const StackItem = ({
  children = null,
  level,
  totalCount,
  stackItem,
}: IStackItemWrapperProps) => {
  const { type, uuid, isDirty } = stackItem;
  const [isOpen, setIsOpen] = useState(true);
  const { modal } = App.useApp();

  const pop = useStackStore((state) => state.pop);
  const setDirty = useStackStore((state) => state.setDirty);
  const updatePayload = useStackStore((state) => state.updatePayload);
  const token = useAntdToken();
  const hasChildren = !!children;
  const depth = totalCount - level - 1;

  const { styles } = useStyles({ hasChildren, depth });

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

  const definition = stackRegistry.get(type);

  // Let React Compiler handle memoization
  const contextValue: IStackItemContext = {
    uuid,
    type,
    payload: stackItem.payload,
    isDirty: isDirty ?? false,
    pop: onPop,
    forcePop: onForcePop,
    setDirty: onSetDirty,
    updatePayload: onUpdatePayload,
  };

  if (!definition) {
    console.error(`[StackItem] Unknown stack item type: ${type}`);
    return null;
  }

  const Component = definition.component;

  return (
    <>
      <GlobalStackStyles />
      <Modal
        open={isOpen}
        centered
        onCancel={onPop}
        afterOpenChange={clearAfterClose}
        footer={null}
        closable={false}
        destroyOnHidden
        transitionName="stack-slide-up"
        maskTransitionName="stack-fade"
        mask={level === 0}
        width={`calc(100wv - ${token.padding * 2}px)`}
        classNames={{
          wrapper: styles.wrapper,
          container: styles.container,
        }}
      >
        <StackItemProvider value={contextValue}>
          <Suspense fallback={null}>
            <Component />
          </Suspense>
        </StackItemProvider>
        {children}
      </Modal>
    </>
  );
};

// ============================================================================
// Legacy alias (deprecated, for backwards compatibility)
// ============================================================================

/** @deprecated Use StackItem instead */
export const ModalWrapper = StackItem;
