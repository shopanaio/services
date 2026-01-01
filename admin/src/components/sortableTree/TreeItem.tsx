import React, { forwardRef, HTMLAttributes } from 'react';
import classNames from 'classnames';

import { Typography, Button } from 'antd';
import { HiChevronRight, HiChevronDown } from 'react-icons/hi';
import { getIconProps } from '@components/styles';
import { MdClose, MdDragIndicator, MdEdit } from 'react-icons/md';
import { css } from '@emotion/react';
import styles from './TreeItem.module.css';

export interface ITreeItemProps
  extends Omit<HTMLAttributes<HTMLLIElement>, 'id' | 'content'> {
  title: string;
  childCount?: number;
  clone?: boolean;
  collapsed?: boolean;
  depth: number;
  disableInteraction?: boolean;
  disableSelection?: boolean;
  ghost?: boolean;
  handleProps?: any;
  indicator?: boolean;
  indentationWidth: number;
  onCollapse?: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
  wrapperRef?(node: HTMLLIElement): void;
}

export const TreeItem = forwardRef<HTMLDivElement, ITreeItemProps>(
  (
    {
      childCount,
      clone,
      depth,
      disableSelection,
      disableInteraction,
      ghost,
      handleProps,
      indentationWidth,
      indicator,
      collapsed,
      onCollapse,
      onRemove,
      style,
      title,
      wrapperRef,
      onEdit,
      ...props
    },
    ref,
  ) => {
    return (
      <li
        className={classNames(
          styles.Wrapper,
          clone && styles.clone,
          ghost && styles.ghost,
          indicator && styles.indicator,
          disableSelection && styles.disableSelection,
          disableInteraction && styles.disableInteraction,
        )}
        ref={wrapperRef}
        style={
          {
            '--spacing': `${indentationWidth * depth}px`,
          } as React.CSSProperties
        }
        {...props}
      >
        <div className={styles.TreeItem} ref={ref} style={style}>
          <Button
            size="large"
            type="text"
            ref={ref}
            data-testid="tree-item-drag-handle"
            icon={<MdDragIndicator {...getIconProps()} />}
            {...handleProps}
          />
          {onCollapse && (
            <Button
              size="large"
              type="text"
              css={css`
                margin-right: var(--x1);
              `}
              onClick={onCollapse}
              data-testid={`tree-item-${
                collapsed ? 'expand' : 'collapse'
              }-button`}
              icon={
                collapsed ? (
                  <HiChevronRight {...getIconProps(18)} />
                ) : (
                  <HiChevronDown {...getIconProps(18)} />
                )
              }
            />
          )}
          <Typography.Text
            css={css`
              padding-left: var(--x1);
              flex-grow: 1;
            `}
            ellipsis
            data-testid="tree-item-title"
          >
            {title || 'Untitled item...'}
          </Typography.Text>
          {!clone && onEdit && (
            <Button
              size="large"
              type="text"
              data-testid="tree-item-edit-button"
              icon={<MdEdit {...getIconProps()} />}
              onClick={onEdit}
            />
          )}
          {!clone && onRemove && (
            <Button
              size="large"
              type="text"
              data-testid="tree-item-delete-button"
              icon={<MdClose {...getIconProps()} />}
              onClick={onRemove}
            />
          )}
          {clone && childCount && childCount > 1 ? (
            <span className={styles.Count}>{childCount}</span>
          ) : null}
        </div>
      </li>
    );
  },
);
