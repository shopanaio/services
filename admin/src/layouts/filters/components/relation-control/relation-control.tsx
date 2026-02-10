'use client';

import { Input } from 'antd';
import { IRelationControlProps } from '../../core/types';
import { relationControlRegistry } from './registry';

/**
 * Dynamic relation control component
 * Uses registry to find the appropriate control for the entity type
 */
export const RelationControl = ({
  entity,
  value,
  onChange,
  isMultiple,
  status,
  variant = 'borderless',
}: IRelationControlProps) => {
  const Control = relationControlRegistry.get(entity);

  if (!Control) {
    return (
      <Input
        disabled
        placeholder={`No control for: ${entity}`}
        style={{ width: 150 }}
        variant={variant}
      />
    );
  }

  return (
    <Control
      entity={entity}
      value={value}
      onChange={onChange}
      isMultiple={isMultiple}
      status={status}
      variant={variant}
    />
  );
};
