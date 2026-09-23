import React, { useState, useEffect } from 'react';
import { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, POPULAR_PORTALS } from '../utils/statusConfig';
import {
  X,
  Sparkles,
  Loader2,
  Link2,
  Building2,
  Briefcase,
  Calendar,
  MapPin,
  DollarSign,
  Tag,
  FileText,
} from 'lucide-react';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: Partial<JobApplication>) => void;
  initialData?: JobApplication | null;
}

export const JobModal: React.FC<JobModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [portal, setPortal] = useState('LinkedIn');
  const [customPortal, setCustomPortal] = useState('');
  const [url, setUrl] = useState('');
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<JobStatus>('Wysłana');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialData) {
      setRole(initialData.role || '');
      setCompany(initialData.company || '');
      if (POPULAR_PORTALS.includes(initialData.portal)) {
        setPortal(initialData.portal);
        setCustomPortal('');
      } else {
        setPortal('Inny portal');
        setCustomPortal(initialData.portal || '');
      }
      setUrl(initialData.url || '');
      setAppliedDate(initialData.appliedDate || new Date().toISOString().split('T')[0]);
      setStatus(initialData.status || 'Wysłana');
      setLocation(initialData.location || '');
      setSalary(initialData.salary || '');
      setSkills(initialData.skills || []);
      setNotes(initialData.notes || '');
    } else {
      setRole('');
      setCompany('');
      setPortal('LinkedIn');
      setCustomPortal('');
      setUrl('');
      setAppliedDate(new Date().toISOString().split('T')[0]);
      setStatus('Wysłana');
      setLocation('');
      setSalary('');
      setSkills([]);
      setNotes('');
    }
    setAiMessage(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddSkill = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleAiExtract = async () => {
    if (!url.trim()) {
      setAiMessage({ type: 'error', text: 'Wklej najpierw poprawny link do oferty pracy.' });
      return;
    }

    setIsAiLoading(true);
    setAiMessage(null);

    try {
      const res = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        throw new Error('Błąd odpowiedzi serwera');
      }

      const data = await res.json();

      if (data.role) setRole(data.role);
      if (data.company) setCompany(data.company);
      if (data.portal) {
        if (POPULAR_PORTALS.includes(data.portal)) {
          setPortal(data.portal);
          setCustomPortal('');
        } else {
          setPortal('Inny portal');
          setCustomPortal(data.portal);
        }
      }
      if (data.location) setLocation(data.location);
      if (data.salary) setSalary(data.salary);
      if (data.skills && Array.isArray(data.skills)) {
        setSkills(Array.from(new Set([...skills, ...data.skills])));
      }
      if (data.notes) {
        setNotes((prev) => (prev ? `${prev}\n${data.notes}` : data.notes));
      }

      setAiMessage({
        type: 'success',
        text: `✨ Pomyślnie wyciągnięto dane: ${data.company} - ${data.role}`,
      });
    } catch (e) {
      console.error(e);
      setAiMessage({
        type: 'error',
        text: 'Nie udało się połączyć z AI. Sprawdź format linku lub uzupełnij pola ręcznie.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || !company.trim()) return;

    const finalPortal = portal === 'Inny portal' ? customPortal.trim() || 'Inny portal' : portal;

    onSave({
      role: role.trim(),
      company: company.trim(),
      portal: finalPortal,
      url: url.trim(),
      appliedDate,
      status,
      location: location.trim(),
      salary: salary.trim(),
      skills,
      notes: notes.trim(),
      lastUpdated: new Date().toISOString(),
    });
    onClose();
  };

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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* AI Auto-extract section */}
          <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-3.5 space-y-2">
            <label className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Link do oferty pracy (URL)
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                np. LinkedIn, NoFluffJobs, JustJoinIT, Pracuj.pl
              </span>
            </label>

            <div className="flex gap-2">
              <input
                id="job-url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://nofluffjobs.com/job/... lub https://www.linkedin.com/jobs/view/..."
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                id="ai-extract-btn"
                type="button"
                onClick={handleAiExtract}
                disabled={isAiLoading || !url}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/40 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
                title="Wyciągnij dane o stanowisku i firmie przez model LLM"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizuję...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Wyciągnij z AI</span>
                  </>
                )}
              </button>
            </div>

            {aiMessage && (
              <div
                className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
                  aiMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {aiMessage.text}
              </div>
            )}
          </div>

          {/* Role and Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Stanowisko / Rola <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="job-role-input"
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="np. Senior QA Engineer"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Firma / Pracodawca <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="job-company-input"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="np. Spyrosoft, GFT Poland"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Portal, Status and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Portal / Źródło oferty
              </label>
              <select
                id="job-portal-select"
                value={portal}
                onChange={(e) => setPortal(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {POPULAR_PORTALS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {portal === 'Inny portal' && (
                <input
                  type="text"
                  value={customPortal}
                  onChange={(e) => setCustomPortal(e.target.value)}
                  placeholder="Wpisz nazwę portalu..."
                  className="w-full mt-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Status aplikacji
              </label>
              <select
                id="job-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Data wysłania CV <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="job-applied-date-input"
                  type="date"
                  required
                  value={appliedDate}
                  onChange={(e) => setAppliedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Location and Salary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Lokalizacja / Tryb pracy
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="job-location-input"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="np. Wrocław, Remote, Warszawa (Hybrydowo)"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Widełki wynagrodzenia (opcjonalnie)
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="job-salary-input"
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="np. 18 000 - 24 000 PLN B2B"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Skills / Tech Stack Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Wymagane technologie / słowa kluczowe
            </label>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="job-skill-input"
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleAddSkill}
                  placeholder="Wpisz np. Playwright, Python, BDD i naciśnij Enter"
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Dodaj tag
              </button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
