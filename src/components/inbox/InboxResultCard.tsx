import React from 'react';
import { EmailAnalysisResult, JobStatus } from '../../types';
import { STATUS_CONFIG } from '../../utils/statusConfig';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Mail,
} from 'lucide-react';

interface InboxResultCardProps {
  item: EmailAnalysisResult;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export const InboxResultCard: React.FC<InboxResultCardProps> = ({
  item,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
}) => {
  const suggestedCfg = item.suggestedStatus
    ? STATUS_CONFIG[item.suggestedStatus as JobStatus]
    : undefined;

  const currentCfg = item.currentStatus
    ? STATUS_CONFIG[item.currentStatus as JobStatus]
    : undefined;

  return (
    <div
      className={`border rounded-xl p-4 transition-all duration-150 ${
        isSelected
          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(item.emailId)}
          className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          {/* Header info */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                {item.matchedCompany}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">•</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[220px]">
                {item.matchedRole}
              </span>
            </div>

            {/* Provider badge */}
            <span
              className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                item.provider === 'outlook'
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                  : item.provider === 'gmail'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {item.provider}
            </span>
          </div>

          {/* Email Subject */}
          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 mb-2 truncate">
            {item.subject}
          </p>

          {/* Status Change Flow Banner */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 mb-2">
            {item.isNewApplication ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Nowa wykryta aplikacja!
              </span>
            ) : item.isStatusChange ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 line-through">
                  {item.currentStatus || 'Brak statusu'}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-xs ${
                    suggestedCfg?.badgeClass || 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {item.suggestedStatus}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Status aktualny ({item.suggestedStatus})
              </span>
            )}

            {/* Confidence indicator */}
            <span
              className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                item.confidence === 'high'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              Pewność: {item.confidence === 'high' ? 'Wysoka' : 'Średnia'}
            </span>
          </div>

          {/* AI Summary and Reasoning */}
          <p className="text-xs text-slate-700 dark:text-slate-300 mb-2">
            <span className="font-medium text-blue-600 dark:text-blue-400">Podsumowanie: </span>
            {item.summary}
          </p>

          {/* Meeting or Action required */}
          {(item.meetingDate || item.meetingLink || item.actionRequired) && (
            <div className="flex flex-wrap items-center gap-3 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 p-2 rounded-lg mb-2 text-amber-800 dark:text-amber-300">
              {item.meetingDate && (
                <div className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.meetingDate}</span>
                </div>
              )}
              {item.actionRequired && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{item.actionRequired}</span>
                </div>
              )}
              {item.meetingLink && (
                <a
                  href={item.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium ml-auto"
                >
                  <ExternalLink className="w-3 h-3" />
                  Link do spotkania
                </a>
              )}
            </div>
          )}

          {/* Expand snippet toggle */}
          <button
            type="button"
            onClick={() => onToggleExpand(item.emailId)}
            className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 mt-1 cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isExpanded ? 'Ukryj fragment e-maila' : 'Pokaż fragment wiadomości'}</span>
          </button>

          {isExpanded && item.rawExcerpt && (
            <div className="mt-2 p-2.5 bg-slate-100 dark:bg-slate-800/80 rounded text-[11px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono border border-slate-200 dark:border-slate-700">
              {item.rawExcerpt}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
