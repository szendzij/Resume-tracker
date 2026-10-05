import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { JobApplication, JobStatus, ApplicationTimelineEntry } from '../../types';
import { POPULAR_PORTALS } from '../../utils/statusConfig';
import {
  detectDuplicate,
  DuplicateCandidate,
  DuplicateDetectionResult,
} from '../../utils/duplicateDetector';
import { createInitialTimelineEntry } from '../../utils/timelineUtils';

export interface UseJobModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (app: Partial<JobApplication>) => void;
  initialData?: JobApplication | null;
  existingApplications?: JobApplication[];
}

export function useJobModalForm({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingApplications = [],
}: UseJobModalFormProps) {
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [portal, setPortal] = useState('LinkedIn');
  const [customPortal, setCustomPortal] = useState('');
  const [url, setUrl] = useState('');
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<JobStatus>('Wysłana');
  const [timeline, setTimeline] = useState<ApplicationTimelineEntry[]>([]);
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Duplicate warning confirmation state
  const [allowDuplicateSave, setAllowDuplicateSave] = useState(false);
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);

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
      const initDate = initialData.appliedDate || new Date().toISOString().split('T')[0];
      setAppliedDate(initDate);
      const initStatus = initialData.status || 'Wysłana';
      setStatus(initStatus);
      if (initialData.timeline && initialData.timeline.length > 0) {
        setTimeline(initialData.timeline);
      } else {
        setTimeline([
          createInitialTimelineEntry(initialData.id || String(Date.now()), initStatus, initDate),
        ]);
      }
      setLocation(initialData.location || '');
      setSalary(initialData.salary || '');
      setSkills(initialData.skills || []);
      setNotes(initialData.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setRole('');
      setCompany('');
      setPortal('LinkedIn');
      setCustomPortal('');
      setUrl('');
      setAppliedDate(today);
      setStatus('Wysłana');
      setTimeline([
        createInitialTimelineEntry(String(Date.now()), 'Wysłana', today),
      ]);
      setLocation('');
      setSalary('');
      setSkills([]);
      setNotes('');
    }
    setAiMessage(null);
    setAllowDuplicateSave(false);
    setShowDuplicatePrompt(false);
  }, [initialData, isOpen]);

  const deferredRole = useDeferredValue(role);
  const deferredCompany = useDeferredValue(company);
  const deferredUrl = useDeferredValue(url);

  // Real-time multi-parameter duplicate check
  const duplicateCheck: DuplicateDetectionResult = useMemo(() => {
    if (!isOpen) {
      return { isDuplicate: false, confidence: 'none', matchedFields: [] };
    }

    const currentRole = deferredRole.trim();
    const currentCompany = deferredCompany.trim();
    const currentUrl = deferredUrl.trim();

    // Skip if user hasn't typed company, role, or url yet
    if (!currentRole && !currentCompany && !currentUrl) {
      return { isDuplicate: false, confidence: 'none', matchedFields: [] };
    }

    const candidate: DuplicateCandidate = {
      id: initialData?.id,
      role: currentRole,
      company: currentCompany,
      url: currentUrl,
      portal: portal === 'Inny portal' ? customPortal.trim() || 'Inny portal' : portal,
      appliedDate,
      location: location.trim(),
    };

    return detectDuplicate(candidate, existingApplications, {
      excludeId: initialData?.id,
    });
  }, [
    isOpen,
    deferredRole,
    deferredCompany,
    deferredUrl,
    portal,
    customPortal,
    appliedDate,
    location,
    initialData?.id,
    existingApplications,
  ]);

  const handleAddSkill = useCallback(
    (e?: React.KeyboardEvent | React.MouseEvent) => {
      if (e && 'key' in e && e.key !== 'Enter') return;
      if (e) e.preventDefault();
      const trimmed = skillInput.trim();
      if (trimmed && !skills.includes(trimmed)) {
        setSkills((prev) => [...prev, trimmed]);
        setSkillInput('');
      }
    },
    [skillInput, skills]
  );

  const handleRemoveSkill = useCallback((skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  }, []);

  const handleAiExtract = useCallback(async () => {
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
        setSkills((prev) => Array.from(new Set([...prev, ...data.skills])));
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
  }, [url]);

  const handleAddTimelineEntry = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const newEntry: ApplicationTimelineEntry = {
      id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'Rozmowa HR',
      date: today,
      notes: '',
    };
    setTimeline((prev) => [...prev, newEntry]);
  }, []);

  const handleUpdateTimelineEntry = useCallback(
    (id: string, field: 'status' | 'date' | 'notes', value: string) => {
      setTimeline((prev) =>
        prev.map((entry) => {
          if (entry.id !== id) return entry;
          if (field === 'status') {
            return { ...entry, status: value as JobStatus };
          }
          return { ...entry, [field]: value };
        })
      );
    },
    []
  );

  const handleRemoveTimelineEntry = useCallback((id: string) => {
    setTimeline((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const handleStatusSelectChange = useCallback((newStatus: JobStatus) => {
    setStatus(newStatus);
    const today = new Date().toISOString().split('T')[0];
    setTimeline((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].status === newStatus) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          status: newStatus,
          date: today,
        },
      ];
    });
  }, []);

  const handleAppliedDateChange = useCallback((newDate: string) => {
    setAppliedDate(newDate);
    setTimeline((prev) => {
      if (
        prev.length > 0 &&
        (prev[0].status === 'Wysłana' || prev[0].status === 'Do zaaplikowania')
      ) {
        return prev.map((entry, idx) =>
          idx === 0 ? { ...entry, date: newDate } : entry
        );
      }
      return prev;
    });
  }, []);

  const executeSave = useCallback(() => {
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
      timeline,
      notes: notes.trim(),
      lastUpdated: new Date().toISOString(),
    });
    onClose();
  }, [
    portal,
    customPortal,
    onSave,
    role,
    company,
    url,
    appliedDate,
    status,
    location,
    salary,
    skills,
    timeline,
    notes,
    onClose,
  ]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!role.trim() || !company.trim()) return;

      // If duplicate detected and user has not acknowledged
      if (duplicateCheck.isDuplicate && !allowDuplicateSave) {
        setShowDuplicatePrompt(true);
        return;
      }

      executeSave();
    },
    [role, company, duplicateCheck.isDuplicate, allowDuplicateSave, executeSave]
  );

  return {
    role,
    setRole,
    company,
    setCompany,
    portal,
    setPortal,
    customPortal,
    setCustomPortal,
    url,
    setUrl,
    appliedDate,
    setAppliedDate,
    status,
    setStatus,
    timeline,
    setTimeline,
    location,
    setLocation,
    salary,
    setSalary,
    skillInput,
    setSkillInput,
    skills,
    setSkills,
    notes,
    setNotes,
    isAiLoading,
    aiMessage,
    allowDuplicateSave,
    setAllowDuplicateSave,
    showDuplicatePrompt,
    setShowDuplicatePrompt,
    duplicateCheck,
    handleAddSkill,
    handleRemoveSkill,
    handleAiExtract,
    handleAddTimelineEntry,
    handleUpdateTimelineEntry,
    handleRemoveTimelineEntry,
    handleStatusSelectChange,
    handleAppliedDateChange,
    executeSave,
    handleSubmit,
  };
}
