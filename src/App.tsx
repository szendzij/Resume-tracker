import React, { useState, useEffect, useMemo } from 'react';
import { JobApplication, FilterState, JobStatus } from './types';
import { INITIAL_JOB_APPLICATIONS } from './data/initialJobs';
import { ALL_STATUSES } from './utils/statusConfig';
import { JobStats } from './components/JobStats';
import { FilterBar } from './components/FilterBar';
import { JobTable } from './components/JobTable';
import { JobKanban } from './components/JobKanban';
import { JobGrid } from './components/JobGrid';
import { JobModal } from './components/JobModal';
import { BatchAddModal } from './components/BatchAddModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { BulkActionsBar } from './components/BulkActionsBar';
import { BulkDateModal } from './components/BulkDateModal';
import { BulkDeleteConfirmModal } from './components/BulkDeleteConfirmModal';
import {
  Plus,
  Sparkles,
  RotateCcw,
  Briefcase,
  CheckCircle2,
  ListPlus,
  FileSpreadsheet,
  Moon,
  Sun,
} from 'lucide-react';

const STORAGE_KEY = 'job_tracker_applications_v1';
const THEME_KEY = 'job_tracker_theme_v1';

export default function App() {
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    return INITIAL_JOB_APPLICATIONS;
  });

  // Dark Mode Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDark]);

  // Save applications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [applications]);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const [deletingApp, setDeletingApp] = useState<JobApplication | null>(null);

  // Bulk actions & multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDateModalOpen, setIsBulkDateModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter state
  const [filter, setFilter] = useState<FilterState>({
    search: '',
    status: 'ALL',
    portal: 'ALL',
    dateRange: 'ALL',
    sortBy: 'appliedDateDesc',
  });

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'grid'>('table');

  // Available unique portals
  const availablePortals = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.portal) set.add(a.portal);
    });
    return Array.from(set).sort();
  }, [applications]);

  // Filtered & Sorted applications
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Search filter
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.role.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          (a.location && a.location.toLowerCase().includes(q)) ||
          (a.portal && a.portal.toLowerCase().includes(q)) ||
          (a.notes && a.notes.toLowerCase().includes(q)) ||
          (a.skills && a.skills.some((s) => s.toLowerCase().includes(q)))
      );
    }

    // Status filter
    if (filter.status !== 'ALL') {
      result = result.filter((a) => a.status === filter.status);
    }

    // Portal filter
    if (filter.portal !== 'ALL') {
      result = result.filter((a) => a.portal === filter.portal);
    }

    // Date range filter
    if (filter.dateRange !== 'ALL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filter.dateRange === '7D') {
        const past7 = new Date(today);
        past7.setDate(past7.getDate() - 7);
        result = result.filter((a) => new Date(a.appliedDate) >= past7);
      } else if (filter.dateRange === '14D') {
        const past14 = new Date(today);
        past14.setDate(past14.getDate() - 14);
        result = result.filter((a) => new Date(a.appliedDate) >= past14);
      } else if (filter.dateRange === '30D') {
        const past30 = new Date(today);
        past30.setDate(past30.getDate() - 30);
        result = result.filter((a) => new Date(a.appliedDate) >= past30);
      } else if (filter.dateRange === 'CUSTOM') {
        if (filter.customStartDate) {
          result = result.filter((a) => a.appliedDate >= filter.customStartDate!);
        }
        if (filter.customEndDate) {
          result = result.filter((a) => a.appliedDate <= filter.customEndDate!);
        }
      }
    }

    // Sorting
    result.sort((a, b) => {
      switch (filter.sortBy) {
        case 'appliedDateDesc':
          return b.appliedDate.localeCompare(a.appliedDate);
        case 'appliedDateAsc':
          return a.appliedDate.localeCompare(b.appliedDate);
        case 'companyAsc':
          return a.company.localeCompare(b.company, 'pl', { sensitivity: 'base' });
        case 'companyDesc':
          return b.company.localeCompare(a.company, 'pl', { sensitivity: 'base' });
        case 'roleAsc':
          return a.role.localeCompare(b.role, 'pl', { sensitivity: 'base' });
        case 'roleDesc':
          return b.role.localeCompare(a.role, 'pl', { sensitivity: 'base' });
        case 'portalAsc':
          return (a.portal || '').localeCompare(b.portal || '', 'pl', { sensitivity: 'base' });
        case 'portalDesc':
          return (b.portal || '').localeCompare(a.portal || '', 'pl', { sensitivity: 'base' });
        case 'statusAsc': {
          const orderA = ALL_STATUSES.indexOf(a.status);
          const orderB = ALL_STATUSES.indexOf(b.status);
          return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
        }
        case 'statusDesc': {
          const orderA = ALL_STATUSES.indexOf(a.status);
          const orderB = ALL_STATUSES.indexOf(b.status);
          return (orderB === -1 ? 99 : orderB) - (orderA === -1 ? 99 : orderA);
        }
        case 'locationAsc':
          return (a.location || '').localeCompare(b.location || '', 'pl', { sensitivity: 'base' });
        case 'locationDesc':
          return (b.location || '').localeCompare(a.location || '', 'pl', { sensitivity: 'base' });
        default:
          return 0;
      }
    });

    return result;
  }, [applications, filter]);

  // Selected applications & Selection state helpers
  const selectedApplications = useMemo(() => {
    return applications.filter((a) => selectedIds.includes(a.id));
  }, [applications, selectedIds]);

  const allVisibleSelected = useMemo(() => {
    return (
      filteredApplications.length > 0 &&
      filteredApplications.every((a) => selectedIds.includes(a.id))
    );
  }, [filteredApplications, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredApplications.map((a) => a.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Bulk operations handlers
  const handleBulkStatusChange = (newStatus: JobStatus) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setApplications((prev) =>
      prev.map((app) =>
        selectedIds.includes(app.id)
          ? { ...app, status: newStatus, lastUpdated: new Date().toISOString() }
          : app
      )
    );
    showToast(`Zmieniono status dla ${count} aplikacji na: ${newStatus}`);
  };

  const handleBulkDateChange = (newDate: string) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setApplications((prev) =>
      prev.map((app) =>
        selectedIds.includes(app.id)
          ? { ...app, appliedDate: newDate, lastUpdated: new Date().toISOString() }
          : app
      )
    );
    showToast(`Zaktualizowano datę wysłania dla ${count} aplikacji na: ${newDate}`);
  };

  const handleBulkDeleteConfirm = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setApplications((prev) => prev.filter((app) => !selectedIds.includes(app.id)));
    setSelectedIds([]);
    showToast(`Trwale usunięto ${count} zaznaczonych aplikacji.`);
  };

  const handleBulkExportCSV = () => {
    if (selectedApplications.length === 0) return;
    downloadCSV(selectedApplications, `zaznaczone-aplikacje-${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`Wyeksportowano ${selectedApplications.length} zaznaczonych ofert do pliku CSV.`);
  };

  // Single handlers
  const handleStatusChange = (id: string, newStatus: JobStatus) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, status: newStatus, lastUpdated: new Date().toISOString() } : app
      )
    );
    showToast(`Zmieniono status na: ${newStatus}`);
  };

  const handleSaveApplication = (data: Partial<JobApplication>) => {
    if (editingApp && editingApp.id) {
      // Update existing
      setApplications((prev) =>
        prev.map((app) => (app.id === editingApp.id ? ({ ...app, ...data } as JobApplication) : app))
      );
      showToast('Zaktualizowano aplikację.');
    } else {
      // Create new
      const newApp: JobApplication = {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: data.role || 'QA Engineer',
        company: data.company || 'Firma',
        portal: data.portal || 'LinkedIn',
        url: data.url || '',
        appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
        status: data.status || 'Wysłana',
        location: data.location,
        salary: data.salary,
        skills: data.skills || [],
        notes: data.notes,
        lastUpdated: new Date().toISOString(),
      };
      setApplications((prev) => [newApp, ...prev]);
      showToast('Dodano nową aplikację!');
    }
    setEditingApp(null);
  };

  const handleDeleteConfirm = () => {
    if (!deletingApp) return;
    setApplications((prev) => prev.filter((a) => a.id !== deletingApp.id));
    setSelectedIds((prev) => prev.filter((id) => id !== deletingApp.id));
    showToast(`Usunięto aplikację do firmy ${deletingApp.company}.`);
    setDeletingApp(null);
  };

  const handleBatchAdd = (newApps: JobApplication[], duplicateCount: number) => {
    setApplications((prev) => [...newApps, ...prev]);
    if (duplicateCount > 0) {
      showToast(`Pomyślnie dodano ${newApps.length} ofert (pominięto ${duplicateCount} duplikatów).`);
    } else {
      showToast(`Pomyślnie zaimportowano ${newApps.length} nowych ofert!`);
    }
  };

  const handleResetToInitial = () => {
    if (
      window.confirm(
        'Czy na pewno chcesz przywrócić początkowy zestaw 25 ofert QA z linkami? Wprowadzone zmiany zostaną zastąpione danymi startowymi.'
      )
    ) {
      setApplications(INITIAL_JOB_APPLICATIONS);
      setSelectedIds([]);
      showToast('Przywrócono początkową bazę 25 ofert.');
    }
  };

  const handleReAnalyzeWithAi = async (app: JobApplication) => {
    if (!app.url) {
      showToast('Ta oferta nie posiada linku URL do ponownej analizy.');
      return;
    }

    showToast('Analizuję ofertę przez model AI...');

    try {
      const res = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: app.url }),
      });

      if (!res.ok) throw new Error('Błąd API');
      const data = await res.json();

      setApplications((prev) =>
        prev.map((item) => {
          if (item.id === app.id) {
            return {
              ...item,
              role: data.role || item.role,
              company: data.company || item.company,
              portal: data.portal || item.portal,
              location: data.location || item.location,
              salary: data.salary || item.salary,
              skills:
                data.skills && Array.isArray(data.skills) && data.skills.length > 0
                  ? Array.from(new Set([...(item.skills || []), ...data.skills]))
                  : item.skills,
              notes: data.notes
                ? item.notes
                  ? `${item.notes}\n[AI]: ${data.notes}`
                  : `[AI]: ${data.notes}`
                : item.notes,
              lastUpdated: new Date().toISOString(),
            };
          }
          return item;
        })
      );

      showToast(`Zaktualizowano dane oferty: ${data.company || app.company} - ${data.role || app.role}`);
    } catch (e) {
      console.error(e);
      showToast('Nie udało się przeanalizować linku przez AI.');
    }
  };

  // Helper for CSV export
  const downloadCSV = (data: JobApplication[], filename: string) => {
    const headers = [
      'Stanowisko',
      'Firma',
      'Portal',
      'Data wyslania CV',
      'Status',
      'Lokalizacja',
      'Widelki',
      'Technologie',
      'Link',
      'Notatki',
    ];

    const rows = data.map((item) => [
      `"${(item.role || '').replace(/"/g, '""')}"`,
      `"${(item.company || '').replace(/"/g, '""')}"`,
      `"${(item.portal || '').replace(/"/g, '""')}"`,
      `"${item.appliedDate || ''}"`,
      `"${item.status || ''}"`,
      `"${(item.location || '').replace(/"/g, '""')}"`,
      `"${(item.salary || '').replace(/"/g, '""')}"`,
      `"${(item.skills || []).join(', ').replace(/"/g, '""')}"`,
      `"${(item.url || '').replace(/"/g, '""')}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    downloadCSV(filteredApplications, `aplikacje-qa-${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`Pobrano plik CSV z ${filteredApplications.length} aplikacjami.`);
  };

  const handleAddNewWithStatus = (initialStatus: JobStatus) => {
    setEditingApp({
      id: '',
      role: '',
      company: '',
      portal: 'LinkedIn',
      url: '',
      appliedDate: new Date().toISOString().split('T')[0],
      status: initialStatus,
      location: '',
      salary: '',
      skills: [],
      notes: '',
      lastUpdated: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  // Fluid container sizing: Kanban board gets extra breathing room up to 1920px
  const containerWidthClass =
    viewMode === 'kanban' ? 'max-w-[1920px]' : 'max-w-7xl';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast notification */}
      {toastMessage && (
        <div
          id="app-toast"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-800 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header / Top Navigation */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200 shadow-2xs">
        <div className={`${containerWidthClass} mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-200`}>
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    Tracker Aplikacji
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    AI Gemini Powered
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Zarządzaj wysłanymi CV, monitoruj statusy i filtruj oferty
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Dark Mode Toggle */}
              <button
                id="theme-toggle-btn"
                onClick={() => setIsDark(!isDark)}
                title={isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-600" />
                )}
              </button>

              <button
                id="batch-add-top-btn"
                onClick={() => setIsBatchModalOpen(true)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Wklej wiele linków naraz do analizy przez AI"
              >
                <ListPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline">Masowy import linków</span>
                <span className="md:hidden">Masowo</span>
              </button>

              <button
                id="add-offer-top-btn"
                onClick={() => {
                  setEditingApp(null);
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Dodaj ofertę</span>
              </button>

              {/* Export to CSV */}
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                title="Eksportuj do CSV (Excel / Google Sheets)"
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              {/* Reset to Initial */}
              <button
                id="reset-data-btn"
                onClick={handleResetToInitial}
                title="Przywróć początkowe 25 ofert z zapytania"
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className={`flex-1 ${containerWidthClass} w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-200`}>
        {/* Analytics & Metrics */}
        <JobStats applications={applications} />

        {/* Filter and View Mode Controller */}
        <FilterBar
          filter={filter}
          onFilterChange={setFilter}
          applications={applications}
          availablePortals={availablePortals}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Dynamic Views */}
        {viewMode === 'table' && (
          <JobTable
            applications={filteredApplications}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAllVisible={handleSelectAllVisible}
            onDeselectAll={handleDeselectAll}
            onEdit={(app) => {
              setEditingApp(app);
              setIsModalOpen(true);
            }}
            onDelete={(app) => setDeletingApp(app)}
            onStatusChange={handleStatusChange}
            onReAnalyze={handleReAnalyzeWithAi}
            sortBy={filter.sortBy}
            onSortChange={(newSort) => setFilter((prev) => ({ ...prev, sortBy: newSort }))}
          />
        )}

        {viewMode === 'kanban' && (
          <JobKanban
            applications={filteredApplications}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onEdit={(app) => {
              setEditingApp(app);
              setIsModalOpen(true);
            }}
            onDelete={(app) => setDeletingApp(app)}
            onStatusChange={handleStatusChange}
            onAddNewWithStatus={handleAddNewWithStatus}
          />
        )}

        {viewMode === 'grid' && (
          <JobGrid
            applications={filteredApplications}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onEdit={(app) => {
              setEditingApp(app);
              setIsModalOpen(true);
            }}
            onDelete={(app) => setDeletingApp(app)}
            onStatusChange={handleStatusChange}
            onReAnalyze={handleReAnalyzeWithAi}
          />
        )}
      </main>

      {/* Bulk Actions Floating Dock */}
      <BulkActionsBar
        selectedIds={selectedIds}
        totalVisible={filteredApplications.length}
        allVisibleSelected={allVisibleSelected}
        onSelectAllVisible={handleSelectAllVisible}
        onDeselectAll={handleDeselectAll}
        onBulkStatusChange={handleBulkStatusChange}
        onOpenBulkDateModal={() => setIsBulkDateModalOpen(true)}
        onOpenBulkDeleteModal={() => setIsBulkDeleteModalOpen(true)}
        onBulkExportCSV={handleBulkExportCSV}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 mt-auto transition-colors duration-200">
        <div className={`${containerWidthClass} mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2`}>
          <span>
            Tracker Aplikacji — Uporządkowane wysłane oferty pracy i linki rekrutacyjne
          </span>
          <div className="flex items-center gap-3">
            <span>{applications.length} zapisanych aplikacji</span>
            <span>•</span>
            <button
              onClick={handleExportCSV}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors cursor-pointer"
            >
              Pobierz kopię CSV
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <JobModal
        isOpen={isModalOpen}
        initialData={editingApp}
        onClose={() => {
          setIsModalOpen(false);
          setEditingApp(null);
        }}
        onSave={handleSaveApplication}
      />

      <BatchAddModal
        isOpen={isBatchModalOpen}
        existingApplications={applications}
        onClose={() => setIsBatchModalOpen(false)}
        onBatchAdd={handleBatchAdd}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingApp)}
        application={deletingApp}
        onClose={() => setDeletingApp(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Bulk Modals */}
      <BulkDateModal
        isOpen={isBulkDateModalOpen}
        selectedCount={selectedIds.length}
        selectedApps={selectedApplications}
        onClose={() => setIsBulkDateModalOpen(false)}
        onConfirm={handleBulkDateChange}
      />

      <BulkDeleteConfirmModal
        isOpen={isBulkDeleteModalOpen}
        selectedCount={selectedIds.length}
        selectedApps={selectedApplications}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
      />
    </div>
  );
}
