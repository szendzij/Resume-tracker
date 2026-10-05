import React from 'react';
import { JobStatus } from '../../types';
import { STATUS_CONFIG } from '../../utils/statusConfig';

export interface StatusBadgeProps {
  status: JobStatus;
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = false,
  className = '',
  onClick,
  children,
}) => {
  const meta = STATUS_CONFIG[status] || STATUS_CONFIG['Wysłana'];
  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.bg} ${meta.text} ${meta.border} ${
        onClick ? 'cursor-pointer hover:opacity-85 transition-opacity' : ''
      } ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
      <span>{meta.label || status}</span>
      {children}
    </Component>
  );
};
