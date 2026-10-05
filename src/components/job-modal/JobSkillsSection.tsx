import React from 'react';
import { Tag, X } from 'lucide-react';

export interface JobSkillsSectionProps {
  skills: string[];
  skillInput: string;
  setSkillInput: (val: string) => void;
  onAddSkill: (e?: React.KeyboardEvent | React.MouseEvent) => void;
  onRemoveSkill: (skill: string) => void;
}

export const JobSkillsSection: React.FC<JobSkillsSectionProps> = ({
  skills,
  skillInput,
  setSkillInput,
  onAddSkill,
  onRemoveSkill,
}) => {
  return (
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
            onKeyDown={onAddSkill}
            placeholder="Wpisz np. React, Python, SQL, Zarządzanie i naciśnij Enter"
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={onAddSkill}
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
                onClick={() => onRemoveSkill(skill)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
