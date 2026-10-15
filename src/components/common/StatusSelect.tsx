import React from 'react';
import { JobStatus } from '../../types';
import { ALL_STATUSES } from '../../utils/statusConfig';

export interface StatusSelectProps {
  value: JobStatus;
  onChange: (status: JobStatus) => void;
  className?: string;
}

const DEFAULT_CLASS_NAME =
  'w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none';

export const StatusSelect: React.FC<StatusSelectProps> = ({
  value,
  onChange,
  className = DEFAULT_CLASS_NAME,
}) => (
  <select value={value} onChange={(e) => onChange(e.target.value as JobStatus)} className={className}>
    {ALL_STATUSES.map((st) => (
      <option key={st} value={st}>
        {st}
      </option>
    ))}
  </select>
);
