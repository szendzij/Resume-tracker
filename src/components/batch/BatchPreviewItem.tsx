import React, { useState } from 'react';
import { ParsedLinkItem } from '../../utils/linkParser';
import { getPortalBadgeStyle } from '../../utils/statusConfig';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BatchPreviewItemProps {
  item: ParsedLinkItem;
  index: number;
  onUpdate: (id: string, updates: Partial<ParsedLinkItem>) => void;
}

export const BatchPreviewItem: React.FC<BatchPreviewItemProps> = ({
  item,
  index,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editRole, setEditRole] = useState(item.role);
  const [editCompany, setEditCompany] = useState(item.company);
  const [editLocation, setEditLocation] = useState(item.location || '');

  const handleSaveEdit = () => {
    onUpdate(item.id, {
      role: editRole.trim() || item.role,
      company: editCompany.trim() || item.company,
      location: editLocation.trim() || undefined,
    });
    setIsEditing(false);
  };

  const portalBadge = getPortalBadgeStyle(item.portal);

  return (
    <div
      className={`border rounded-xl p-3.5 transition-colors ${
        item.isDuplicate
          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-slate-400">
              #{index + 1}
            </span>

            {/* Role & Company */}
            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[280px]">
              {item.role}
            </h5>

            <span className="text-xs text-slate-400">•</span>

            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
              {item.company}
            </span>

            {/* Portal badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${portalBadge.bg} ${portalBadge.text}`}
            >
              {item.portal}
            </span>

            {/* AI badge */}
            {item.isAiEnriched && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
            )}
          </div>

          {/* Location & Tags */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mb-1.5">
            {item.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {item.location}
              </span>
            )}

            {item.skills && item.skills.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Tech:</span>
                <span className="truncate max-w-[250px]">{item.skills.join(', ')}</span>
              </div>
            )}
          </div>

          {/* URL preview */}
          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 truncate">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate max-w-[480px] flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.url}</span>
            </a>
          </div>

          {/* Duplicate warning */}
          {item.isDuplicate && (
            <div className="mt-2 text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/50 px-2.5 py-1 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{item.duplicateReason || 'Zduplikowana oferta'}</span>
            </div>
          )}

          {/* Inline Edit Form */}
          {isEditing && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 border border-slate-200 dark:border-slate-700 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium">Stanowisko</label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium">Firma</label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium">Lokalizacja</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer"
                >
                  Zapisz
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
        >
          {isEditing ? 'Zamknij' : 'Edytuj'}
        </button>
      </div>
    </div>
  );
};
