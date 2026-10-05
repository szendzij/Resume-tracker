import React from 'react';
import { X, FileText } from 'lucide-react';
import { JobApplication } from '../types';
import { useJobModalForm } from './job-modal/useJobModalForm';
import { JobBasicInfoSection } from './job-modal/JobBasicInfoSection';
import { JobDuplicateWarning } from './job-modal/JobDuplicateWarning';
import { JobTimelineSection } from './job-modal/JobTimelineSection';
import { JobSkillsSection } from './job-modal/JobSkillsSection';

export interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: Partial<JobApplication>) => void;
  initialData?: JobApplication | null;
  existingApplications?: JobApplication[];
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingApplications = [],
}) => {
  const form = useJobModalForm({
    isOpen,
    onClose,
    onSave,
    initialData,
    existingApplications,
  });

  if (!isOpen) return null;

  return (
    <div
      id="job-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        id="job-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {initialData ? 'Edytuj aplikację' : 'Dodaj nową aplikację'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Uzupełnij dane lub wklej link do oferty i pozwól AI wyciągnąć informacje.
            </p>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={form.handleSubmit} className="p-6 space-y-4">
          {/* Basic Info (URL, AI extract, Role, Company, Portal, Status, Date, Location, Salary) */}
          <JobBasicInfoSection
            url={form.url}
            setUrl={form.setUrl}
            isAiLoading={form.isAiLoading}
            aiMessage={form.aiMessage}
            onAiExtract={form.handleAiExtract}
            role={form.role}
            setRole={form.setRole}
            company={form.company}
            setCompany={form.setCompany}
            portal={form.portal}
            setPortal={form.setPortal}
            customPortal={form.customPortal}
            setCustomPortal={form.setCustomPortal}
            status={form.status}
            onStatusChange={form.handleStatusSelectChange}
            appliedDate={form.appliedDate}
            onAppliedDateChange={form.handleAppliedDateChange}
            location={form.location}
            setLocation={form.setLocation}
            salary={form.salary}
            setSalary={form.setSalary}
          />

          {/* Real-time Duplicate Warning Banner */}
          <JobDuplicateWarning
            duplicateCheck={form.duplicateCheck}
            showDuplicatePrompt={form.showDuplicatePrompt}
            allowDuplicateSave={form.allowDuplicateSave}
            setAllowDuplicateSave={form.setAllowDuplicateSave}
            setShowDuplicatePrompt={form.setShowDuplicatePrompt}
            onConfirmSave={() => {
              form.setAllowDuplicateSave(true);
              form.executeSave();
            }}
          />

          {/* Status Timeline & Stage Dates */}
          <JobTimelineSection
            timeline={form.timeline}
            onAddEntry={form.handleAddTimelineEntry}
            onUpdateEntry={form.handleUpdateTimelineEntry}
            onRemoveEntry={form.handleRemoveTimelineEntry}
          />

          {/* Skills / Tech Stack Tags */}
          <JobSkillsSection
            skills={form.skills}
            skillInput={form.skillInput}
            setSkillInput={form.setSkillInput}
            onAddSkill={form.handleAddSkill}
            onRemoveSkill={form.handleRemoveSkill}
          />

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Notatki / Postępy w procesie
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <textarea
                id="job-notes-input"
                rows={2}
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                placeholder="np. Złożono przez formularz, czekam na kontakt od Karoliny z HR..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              id="cancel-modal-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              id="save-job-btn"
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              {initialData ? 'Zapisz zmiany' : 'Dodaj aplikację'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

