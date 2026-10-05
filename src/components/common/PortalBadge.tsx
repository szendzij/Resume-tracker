import React from 'react';
import { getPortalBadgeStyle } from '../../utils/statusConfig';

export interface PortalBadgeProps {
  portal: string;
  className?: string;
}

export const PortalBadge: React.FC<PortalBadgeProps> = ({
  portal,
  className = '',
}) => {
  const portalStyle = getPortalBadgeStyle(portal || '');
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border} ${className}`}
    >
      {portal || 'Inne'}
    </span>
  );
};
