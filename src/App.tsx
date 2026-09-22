import React, { useState, useEffect, useMemo } from 'react';
import { JobApplication, FilterState, JobStatus } from './types';
import { INITIAL_JOB_APPLICATIONS } from './data/initialJobs';
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
  Download,
  RotateCcw,
  Briefcase,
  CheckCircle2,
  ListPlus,
  FileSpreadsheet,
} from 'lucide-react';

const STORAGE_KEY = 'job_tracker_applications_v1';

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

  // Save to localStorage
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
      if (filter.sortBy === 'appliedDateDesc') {
        return b.appliedDate.localeCompare(a.appliedDate);
      }
      if (filter.sortBy === 'appliedDateAsc') {
        return a.appliedDate.localeCompare(b.appliedDate);
      }
      if (filter.sortBy === 'companyAsc') {
        return a.company.localeCompare(b.company);
      }
      if (filter.sortBy === 'roleAsc') {
        return a.role.localeCompare(b.role);
      }
      return 0;
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
    showToast(`Trwale usunięto ${count} zaznaczonych aplikacji`);
  };

  // Handlers
  const handleSaveApplication = (appData: Partial<JobApplication>) => {
    if (editingApp) {
      // Edit
      setApplications((prev) =>
        prev.map((item) =>
          item.id === editingApp.id
            ? ({ ...item, ...appData, lastUpdated: new Date().toISOString() } as JobApplication)
            : item
        )
      );
      showToast(`Zaktualizowano aplikację: ${appData.company} - ${appData.role}`);
    } else {
      // Create
      const newJob: JobApplication = {
        id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: appData.role || 'QA Engineer',
        company: appData.company || 'Firma',
        portal: appData.portal || 'Inny portal',
        url: appData.url || '',
        appliedDate: appData.appliedDate || new Date().toISOString().split('T')[0],
        status: appData.status || 'Wysłana',
        location: appData.location,
        salary: appData.salary,
        skills: appData.skills,
        notes: appData.notes,
        lastUpdated: new Date().toISOString(),
      };
      setApplications((prev) => [newJob, ...prev]);
      showToast(`Dodano nową aplikację: ${newJob.company} - ${newJob.role}`);
    }
    setEditingApp(null);
  };

  const handleStatusChange = (id: string, newStatus: JobStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
    );
    showToast(`Zmieniono status na: ${newStatus}`);
  };

  const handleDeleteConfirm = () => {
    if (!deletingApp) return;
    setApplications((prev) => prev.filter((a) => a.id !== deletingApp.id));
    showToast(`Usunięto aplikację ${deletingApp.company}`);
    setDeletingApp(null);
  };

  const handleBatchAdd = (newApps: JobApplication[], duplicatesSkipped = 0) => {
    setApplications((prev) => [...newApps, ...prev]);
    if (duplicatesSkipped > 0) {
      showToast(
        `Zaimportowano ${newApps.length} nowych aplikacji (pominięto ${duplicatesSkipped} ${
          duplicatesSkipped === 1 ? 'duplikat' : 'duplikatów'
        })`
      );
    } else {
      showToast(`Pomyślnie zaimportowano ${newApps.length} aplikacji z linków!`);
    }
  };

  const handleReAnalyzeWithAi = async (app: JobApplication) => {
    if (!app.url) return;
    showToast(`Analizuję link z AI Gemini: ${app.url}...`);

    try {
      const res = await fetch('/api/parse-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: app.url }),
      });

      if (res.ok) {
        const data = await res.json();
        setApplications((prev) =>
          prev.map((item) =>
            item.id === app.id
              ? {
                  ...item,
                  role: data.role || item.role,
                  company: data.company || item.company,
                  location: data.location || item.location,
                  portal: data.portal || item.portal,
                  skills:
                    data.skills && data.skills.length > 0
                      ? Array.from(new Set([...(item.skills || []), ...data.skills]))
                      : item.skills,
                  notes: data.notes || item.notes,
                  lastUpdated: new Date().toISOString(),
                }
              : item
          )
        );
        showToast(`AI zaktualizowało: ${data.company} - ${data.role}`);
      }
    } catch (e) {
      console.error(e);
      showToast('Wystąpił błąd podczas analizy AI');
    }
  };

  const handleResetToInitial = () => {
    if (
      window.confirm(
        'Czy na pewno chcesz przywrócić początkową listę 25 ofert? Twoje nowe wpisy zostaną zastąpione domyślnymi danymi.'
      )
    ) {
      setApplications(INITIAL_JOB_APPLICATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_JOB_APPLICATIONS));
      showToast('Przywrócono początkowe 25 aplikacji!');
    }
  };

  const exportAppsToCSV = (appsList: JobApplication[], filenamePrefix: string) => {
    const headers = [
      'Stanowisko',
      'Firma',
      'Portal',
      'Data wysłania CV',
      'Status',
      'Lokalizacja',
      'Wynagrodzenie',
      'Link',
      'Technologie',
      'Notatki',
    ];

    const rows = appsList.map((a) => [
      `"${(a.role || '').replace(/"/g, '""')}"`,
      `"${(a.company || '').replace(/"/g, '""')}"`,
      `"${(a.portal || '').replace(/"/g, '""')}"`,
      `"${a.appliedDate || ''}"`,
      `"${a.status || ''}"`,
      `"${(a.location || '').replace(/"/g, '""')}"`,
      `"${(a.salary || '').replace(/"/g, '""')}"`,
      `"${(a.url || '').replace(/"/g, '""')}"`,
      `"${(a.skills || []).join(', ').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    exportAppsToCSV(applications, 'aplikacje_o_prace');
    showToast('Wyeksportowano wszystkie aplikacje do CSV!');
  };

  const handleBulkExportCSV = () => {
    if (selectedApplications.length === 0) return;
    exportAppsToCSV(selectedApplications, `wybrane_aplikacje_${selectedApplications.length}`);
    showToast(`Wyeksportowano ${selectedApplications.length} zaznaczonych ofert do CSV!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="app-toast"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header / Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Tracker Aplikacji
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    AI Gemini Powered
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Zarządzaj wysłanymi CV, monitoruj statusy i filtruj oferty
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                id="batch-add-top-btn"
                onClick={() => setIsBatchModalOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Wklej wiele linków naraz do analizy przez AI"
              >
                <ListPlus className="w-4 h-4 text-blue-600" />
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

              {/* More Actions Menu / Export */}
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                title="Eksportuj do CSV (Excel / Google Sheets)"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>

              <button
                id="reset-data-btn"
                onClick={handleResetToInitial}
                title="Przywróć początkowe 25 ofert z zapytania"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Tracker Aplikacji — Uporządkowane wysłane oferty pracy i linki rekrutacyjne
          </span>
          <div className="flex items-center gap-3">
            <span>{applications.length} zapisanych aplikacji</span>
            <span>•</span>
            <button
              onClick={handleExportCSV}
              className="text-blue-600 hover:text-blue-800 transition-colors"
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
